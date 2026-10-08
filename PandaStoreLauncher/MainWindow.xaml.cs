using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Net.Http;
using System.Windows.Media;
using PandaStoreLauncher.Helpers;
using PandaStoreLauncher.Models;
using PandaStoreLauncher.Services;

namespace PandaStoreLauncher
{
    public partial class MainWindow : Window
    {
        private readonly FirebaseService _firebaseService;
        private string _currentHwid = string.Empty;
        private LicenseModel? _activeLicense;
        private List<GameModel> _allGames = new List<GameModel>();
        private readonly ObservableCollection<GameModel> _filteredGames = new ObservableCollection<GameModel>();
        private System.Windows.Threading.DispatcherTimer? _trialCountdownTimer;
        private System.Windows.Threading.DispatcherTimer? _revocationCheckTimer;
        private DateTime? _trialExpiresAtUtc;

        public MainWindow()
        {
            InitializeComponent();
            _firebaseService = new FirebaseService();
            if (icGames != null) icGames.ItemsSource = _filteredGames;

            // Set title dynamically so it always reflects the real compiled version
            this.Title = $"PandaStore Launcher v{CurrentVersion}";

            try
            {
                this.Icon = new System.Windows.Media.Imaging.BitmapImage(new Uri("pack://application:,,,/app.ico", UriKind.Absolute));
            }
            catch { }

            Loaded += MainWindow_Loaded;
        }

        public static readonly DependencyProperty CardWidthProperty =
            DependencyProperty.Register(nameof(CardWidth), typeof(double), typeof(MainWindow), new PropertyMetadata(550.0));

        public double CardWidth
        {
            get => (double)GetValue(CardWidthProperty);
            set => SetValue(CardWidthProperty, value);
        }

        private void IcGames_SizeChanged(object sender, SizeChangedEventArgs e)
        {
            UpdateCardWidth(e.NewSize.Width);
        }

        private void UpdateCardWidth(double availableWidth)
        {
            if (availableWidth <= 0) return;
            double netWidth = availableWidth - 24;
            if (netWidth >= 860)
            {
                CardWidth = Math.Max(380, Math.Floor((netWidth - 16) / 2));
            }
            else
            {
                CardWidth = Math.Max(340, Math.Floor(netWidth - 8));
            }
        }

        private const string CurrentVersion = "2.4.24"; // Current client executable version

        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Invalidate old cache from previous versions so clients get the cleanest catalog
                string cacheDir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                string verFlag = System.IO.Path.Combine(cacheDir, "cache_ver.txt");
                if (!System.IO.File.Exists(verFlag) || System.IO.File.ReadAllText(verFlag).Trim() != CurrentVersion)
                {
                    string oldCache = System.IO.Path.Combine(cacheDir, "cache_games.json");
                    if (System.IO.File.Exists(oldCache)) System.IO.File.Delete(oldCache);
                    if (!System.IO.Directory.Exists(cacheDir)) System.IO.Directory.CreateDirectory(cacheDir);
                    System.IO.File.WriteAllText(verFlag, CurrentVersion);
                }

                _currentHwid = HardwareIdHelper.GetHardwareId();
                lblHwidValue.Text = _currentHwid;
                lblSystemSpecs.Text = DiagnosticsHelper.GetQuickSpecsSummary();

                // Synchronize and sanitize depotcache manifests across all Steam paths on startup
                Task.Run(() =>
                {
                    try
                    {
                        var steamPaths = SteamManager.GetAllSteamPaths();
                        foreach (var sp in steamPaths)
                        {
                            SteamManager.SyncDepotCaches(sp);
                        }
                        SteamManager.EnsureAllInstalledSteamAppIdFiles();
                    }
                    catch { }
                });
            }
            catch (Exception ex)
            {
                lblHwidValue.Text = "Error al obtener HWID";
                lblLoginStatus.Text = $"Advertencia HWID: {ex.Message}";
                Logger.LogError(ex, "Error obteniendo HWID");
            }

            // Try to prefill saved license key
            try
            {
                string licensePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore", "license.json");
                if (File.Exists(licensePath))
                {
                    string json = File.ReadAllText(licensePath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("key", out var keyProp))
                    {
                        string savedKey = keyProp.GetString() ?? "";
                        if (!string.IsNullOrEmpty(savedKey))
                        {
                            txtLicenseKey.Text = savedKey;
                        }
                    }
                }
            }
            catch { }

            // Check and set initial Steam VAC / Injector button status
            try
            {
                bool injected = SteamManager.IsSteamInjected();
                UpdateSteamModeUi(injected);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error chequeando Steam Injected");
            }

            // Check Windows Defender Real-Time Protection status asynchronously
            _ = Task.Run(() =>
            {
                try
                {
                    Dispatcher.Invoke(() => CheckAntivirusStatus());
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "CheckAntivirusStatus Error");
                }
            });

            // Check Admin Status asynchronously
            _ = Task.Run(async () =>
            {
                try
                {
                    string? adminHwid = await _firebaseService.GetAdminHwidAsync();
                    if (string.IsNullOrEmpty(adminHwid) || adminHwid.Equals(_currentHwid, StringComparison.OrdinalIgnoreCase))
                    {
                        Dispatcher.Invoke(() =>
                        {
                            btnOpenAdminPanel.Visibility = Visibility.Visible;
                            btnOpenAdminPanelLogin.Visibility = Visibility.Visible;
                        });
                    }
                }
                catch { }
            });

            // Check for Automatic System Update silently (Dual-Engine: GitHub Releases + Firebase Fallback)
            _ = Task.Run(async () =>
            {
                try
                {
                    // ANTI-LOOP FIX: If a flag exists, the update was just installed.
                    // Skip the update check THIS boot to prevent the infinite loop.
                    string pandaDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                    string flagPath = Path.Combine(pandaDir, "update_just_installed.flag");
                    if (File.Exists(flagPath))
                    {
                        // Delete the flag and skip update check — we just updated successfully.
                        try { File.Delete(flagPath); } catch { }
                        return;
                    }

                    // 1. Primary: Check GitHub Releases API (Fast CDN, unlimited bandwidth)
                    var ghUpdate = await GitHubUpdateHelper.CheckForUpdatesAsync(CurrentVersion, "PandaStoreSetup.exe");
                    if (ghUpdate.HasUpdate && !string.IsNullOrEmpty(ghUpdate.DownloadUrl))
                    {
                        Dispatcher.Invoke(() =>
                        {
                            UpdateWindow updateWindow = new UpdateWindow(ghUpdate.DownloadUrl, ghUpdate.LatestVersion);
                            updateWindow.ShowDialog();
                        });
                        return;
                    }

                    // 2. Secondary: Fallback to Firebase system_config/launcher
                    var updateInfo = await _firebaseService.CheckForUpdatesAsync(CurrentVersion);
                    if (updateInfo.HasUpdate && !string.IsNullOrEmpty(updateInfo.DownloadUrl))
                    {
                        Dispatcher.Invoke(() =>
                        {
                            UpdateWindow updateWindow = new UpdateWindow(updateInfo.DownloadUrl, updateInfo.LatestVersion);
                            updateWindow.ShowDialog();
                        });
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "CheckForUpdatesAsync Error");
                }
            });
        }

        private void BtnOpenAdminPanel_Click(object sender, RoutedEventArgs e)
        {
            AdminWindow adminWin = new AdminWindow(_firebaseService, _currentHwid);
            adminWin.Owner = this;
            adminWin.ShowDialog();
        }

        private void BtnCopyHwid_Click(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(_currentHwid))
            {
                Clipboard.SetText(_currentHwid);
                MessageBox.Show("HWID copiado al portapapeles.", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private async void BtnValidateKey_Click(object sender, RoutedEventArgs e)
        {
            await ProcessLoginAsync();
        }

        private async void BtnExploreCatalogGuest_Click(object sender, RoutedEventArgs e)
        {
            btnExploreCatalogGuest.IsEnabled = false;
            pbLoginLoading.Visibility = Visibility.Visible;
            lblLoginStatus.Text = "";

            try
            {
                _activeLicense = null;
                lblClientEmail.Text = "Modo Invitado / Catálogo +150";

                _allGames = await _firebaseService.GetAllGamesAsync(new List<string>(), allowedDlcs: null);

                ApplyGameFilter();
                LoginContainer.Visibility = Visibility.Collapsed;
                DashboardContainer.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                lblLoginStatus.Text = $"❌ Error al cargar catálogo: {ex.Message}";
            }
            finally
            {
                btnExploreCatalogGuest.IsEnabled = true;
                pbLoginLoading.Visibility = Visibility.Collapsed;
            }
        }

        private async void TxtLicenseKey_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                await ProcessLoginAsync();
            }
        }

        private async Task ProcessLoginAsync()
        {
            string key = txtLicenseKey.Text.Trim();
            if (string.IsNullOrEmpty(key))
            {
                lblLoginStatus.Text = "Por favor ingresa tu código de licencia.";
                return;
            }

            lblLoginStatus.Text = "";
            btnValidateKey.IsEnabled = false;
            pbLoginLoading.Visibility = Visibility.Visible;

            try
            {
                // Validate license with Firestore
                _activeLicense = await _firebaseService.ValidateLicenseAsync(key, _currentHwid);

                // Save license locally for PandaChecker background task
                try
                {
                    string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                    if (!Directory.Exists(appDataDir)) Directory.CreateDirectory(appDataDir);
                    string licenseJson = System.Text.Json.JsonSerializer.Serialize(_activeLicense);
                    await File.WriteAllTextAsync(Path.Combine(appDataDir, "license.json"), licenseJson);
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error guardando license.json");
                }

                // Load All Games with Authorized Flags
                _allGames = await _firebaseService.GetAllGamesAsync(_activeLicense.AllowedGames, allowedDlcs: _activeLicense.AllowedDlcs);

                // Switch View to Dashboard
                lblClientEmail.Text = _activeLicense.ClientEmail;
                ApplyGameFilter();

                // Setup Trial / Demo Banner & Timers if applicable
                SetupTrialModeIfApplicable();

                // Start periodic remote license status watchdog (checks revocation / expiration every 30 seconds)
                StartRemoteLicenseWatchdog();

                LoginContainer.Visibility = Visibility.Collapsed;
                DashboardContainer.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                lblLoginStatus.Text = $"❌ {ex.Message}";
            }
            finally
            {
                btnValidateKey.IsEnabled = true;
                pbLoginLoading.Visibility = Visibility.Collapsed;
            }
        }

        private System.Windows.Threading.DispatcherTimer? _searchDebounceTimer;
        private System.Threading.CancellationTokenSource? _searchCts;

        private void TxtSearchGame_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (_searchDebounceTimer == null)
            {
                _searchDebounceTimer = new System.Windows.Threading.DispatcherTimer();
                _searchDebounceTimer.Interval = TimeSpan.FromMilliseconds(300);
                _searchDebounceTimer.Tick += (s, ev) =>
                {
                    _searchDebounceTimer.Stop();
                    ApplyGameFilter();
                };
            }

            _searchDebounceTimer.Stop();
            _searchDebounceTimer.Start();
        }

        private void SetupTrialModeIfApplicable()
        {
            _trialCountdownTimer?.Stop();

            if (_activeLicense != null && _activeLicense.IsTrial)
            {
                borderTrialNotice.Visibility = Visibility.Visible;

                if (!string.IsNullOrEmpty(_activeLicense.ExpiresAt) &&
                    DateTime.TryParse(_activeLicense.ExpiresAt, null, System.Globalization.DateTimeStyles.AdjustToUniversal, out DateTime parsedExpires))
                {
                    _trialExpiresAtUtc = parsedExpires;
                }
                else
                {
                    int mins = _activeLicense.TrialMinutes > 0 ? _activeLicense.TrialMinutes : 15;
                    _trialExpiresAtUtc = DateTime.UtcNow.AddMinutes(mins);
                }

                _trialCountdownTimer = new System.Windows.Threading.DispatcherTimer();
                _trialCountdownTimer.Interval = TimeSpan.FromSeconds(1);
                _trialCountdownTimer.Tick += (s, e) =>
                {
                    if (_trialExpiresAtUtc.HasValue)
                    {
                        var remaining = _trialExpiresAtUtc.Value - DateTime.UtcNow;
                        if (remaining <= TimeSpan.Zero)
                        {
                            _trialCountdownTimer.Stop();
                            lblTrialCountdown.Text = "EXPIRADO (00:00)";
                            _ = HandleLicenseRevocationOrExpirationAsync("Tu período de prueba de PandaStore ha expirado. Por favor contacta al vendedor para adquirir tu licencia permanente.");
                        }
                        else
                        {
                            lblTrialCountdown.Text = $"Tiempo restante: {remaining.Minutes:D2}:{remaining.Seconds:D2}";
                        }
                    }
                };
                _trialCountdownTimer.Start();
            }
            else
            {
                borderTrialNotice.Visibility = Visibility.Collapsed;
            }
        }

        private void StartRemoteLicenseWatchdog()
        {
            _revocationCheckTimer?.Stop();
            _revocationCheckTimer = new System.Windows.Threading.DispatcherTimer();
            _revocationCheckTimer.Interval = TimeSpan.FromSeconds(30);
            _revocationCheckTimer.Tick += async (s, e) =>
            {
                if (_activeLicense == null || string.IsNullOrEmpty(_activeLicense.Key)) return;

                try
                {
                    // Query remote license status
                    var remoteLic = await _firebaseService.ValidateLicenseAsync(_activeLicense.Key, _currentHwid);
                    if (remoteLic != null)
                    {
                        // If it got upgraded to permanent while open!
                        if (!remoteLic.IsTrial && _activeLicense.IsTrial)
                        {
                            _activeLicense.IsTrial = false;
                            _trialCountdownTimer?.Stop();
                            borderTrialNotice.Visibility = Visibility.Collapsed;
                            MessageBox.Show("¡Excelente! Tu licencia ha sido confirmada como PERMANENTE por el vendedor. Disfruta de tus juegos sin límite de tiempo.", "PandaStore - Pago Confirmado", MessageBoxButton.OK, MessageBoxImage.Information);
                        }

                        // Auto-detect new games or DLCs added by admin in real time!
                        var oldGames = _activeLicense.AllowedGames ?? new List<string>();
                        var newGames = remoteLic.AllowedGames ?? new List<string>();
                        bool gamesChanged = oldGames.Count != newGames.Count || !oldGames.SequenceEqual(newGames);

                        if (gamesChanged)
                        {
                            _activeLicense = remoteLic;
                            try
                            {
                                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                                if (!Directory.Exists(appDataDir)) Directory.CreateDirectory(appDataDir);
                                string licenseJson = System.Text.Json.JsonSerializer.Serialize(_activeLicense);
                                await File.WriteAllTextAsync(Path.Combine(appDataDir, "license.json"), licenseJson);
                            }
                            catch { }

                            // Refresh in-memory authorization and update list view
                            bool fullAccess = newGames.Any(g => g == "*" || g.Equals("ALL", StringComparison.OrdinalIgnoreCase));
                            foreach (var game in _allGames)
                            {
                                game.IsAuthorizedForClient = fullAccess || (newGames.Contains(game.AppId) || newGames.Contains(game.Name));
                                game.RefreshDlcOwnership(_activeLicense.AllowedDlcs, fullAccess);
                            }
                            ApplyGameFilter();
                        }
                    }

                    _ = Task.Run(() => SteamManager.EnsureAllInstalledSteamAppIdFiles());
                }
                catch (Exception ex)
                {
                    // If ValidateLicenseAsync threw an exception, check if it was revoked or expired
                    string msg = ex.Message;
                    if (msg.Contains("bloqueada", StringComparison.OrdinalIgnoreCase) ||
                        msg.Contains("revocada", StringComparison.OrdinalIgnoreCase) ||
                        msg.Contains("expiró", StringComparison.OrdinalIgnoreCase) ||
                        msg.Contains("no encontrada", StringComparison.OrdinalIgnoreCase))
                    {
                        _revocationCheckTimer?.Stop();
                        _trialCountdownTimer?.Stop();
                        await HandleLicenseRevocationOrExpirationAsync(msg);
                    }
                }
            };
            _revocationCheckTimer.Start();
        }

        private async Task HandleLicenseRevocationOrExpirationAsync(string reason)
        {
            try
            {
                // Purge all PandaStore injected files, appmanifests, and scripts from Steam
                await SteamManager.PurgeAndRevokeAllPandaGamesAsync();

                // Clear active license in memory
                _activeLicense = null;

                // Delete local license.json
                try
                {
                    string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                    string licFile = Path.Combine(appDataDir, "license.json");
                    if (File.Exists(licFile)) File.Delete(licFile);
                }
                catch { }

                MessageBox.Show($"ACCESO FINALIZADO:\n\n{reason}\n\nLos juegos y archivos de prueba han sido removidos automáticamente de tu Steam por seguridad de PandaStore.", "PandaStore - Notificación", MessageBoxButton.OK, MessageBoxImage.Warning);

                // Return to login screen
                DashboardContainer.Visibility = Visibility.Collapsed;
                LoginContainer.Visibility = Visibility.Visible;
                txtLicenseKey.Text = "";
                lblLoginStatus.Text = reason;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error executing HandleLicenseRevocationOrExpirationAsync");
            }
        }

        private enum FilterMode
        {
            Authorized,
            Installed,
            NeedsFix,
            AllCatalog
        }

        private FilterMode _currentFilterMode = FilterMode.Authorized;

        private void CmbCategoryFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ApplyGameFilter();
        }

        private string GetGameCategory(GameModel game)
        {
            string name = (game.Name ?? "").ToLower();
            if (name.Contains("call of duty") || name.Contains("battlefield") || name.Contains("bodycam") || name.Contains("doom") || name.Contains("halo") || name.Contains("sniper") || name.Contains("far cry") || name.Contains("crysis") || name.Contains("f.e.a.r") || name.Contains("metro") || name.Contains("wolfenstein") || name.Contains("payday") || name.Contains("ready or not"))
                return "Shooters / FPS";

            if (name.Contains("resident evil") || name.Contains("outlast") || name.Contains("amnesia") || name.Contains("silent hill") || name.Contains("bendy") || name.Contains("darkwood") || name.Contains("alien isolation") || name.Contains("dead space"))
                return "Terror / Horror";

            if (name.Contains("elden ring") || name.Contains("dark souls") || name.Contains("sekiro") || name.Contains("the witcher") || name.Contains("final fantasy") || name.Contains("dragon age") || name.Contains("fallout") || name.Contains("skyrim") || name.Contains("cyberpunk") || name.Contains("yakuza") || name.Contains("monster hunter") || name.Contains("persona") || name.Contains("starfield") || name.Contains("baldur"))
                return "RPG / Rol";

            if (name.Contains("need for speed") || name.Contains("forza") || name.Contains("carx") || name.Contains("f1") || name.Contains("fifa") || name.Contains("dirt") || name.Contains("assetto"))
                return "Carreras / Deportes";

            if (name.Contains("civilization") || name.Contains("age of empires") || name.Contains("crusader") || name.Contains("tropico") || name.Contains("cities") || name.Contains("sim") || name.Contains("simulator") || name.Contains("starcraft") || name.Contains("football manager") || name.Contains("factorio") || name.Contains("satisfactory") || name.Contains("frostpunk"))
                return "Estrategia / Sim";

            if (name.Contains("stardew") || name.Contains("celeste") || name.Contains("hollow knight") || name.Contains("cuphead") || name.Contains("blasphemous") || name.Contains("hades") || name.Contains("terraria") || name.Contains("isaac") || name.Contains("balatro") || name.Contains("dead cells"))
                return "Indie / Casual";

            return "Acción / Aventura";
        }

        private int _currentDisplayLimit = 100;

        private void BtnLoadMoreGames_Click(object sender, RoutedEventArgs e)
        {
            _currentDisplayLimit += 100;
            ApplyGameFilter(resetLimit: false);
        }

        private async void ApplyGameFilter(bool resetLimit = true)
        {
            if (_allGames == null) return;

            _searchCts?.Cancel();
            _searchCts = new System.Threading.CancellationTokenSource();
            var token = _searchCts.Token;

            if (resetLimit) _currentDisplayLimit = 100;

            string query = txtSearchGame?.Text?.Trim().ToLower() ?? "";
            string categoryFilter = (cmbCategoryFilter?.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Todas las Categorías";

            FilterMode currentMode = _currentFilterMode;
            List<GameModel> sourceList = _allGames;
            int displayLimit = _currentDisplayLimit;

            try
            {
                var matches = await Task.Run(() =>
                {
                    token.ThrowIfCancellationRequested();

                    var installedSet = SteamManager.GetInstalledAppIds();

                    IEnumerable<GameModel> baseList;
                    switch (currentMode)
                    {
                        case FilterMode.Installed:
                            baseList = sourceList.Where(g => installedSet.Contains(g.AppId));
                            break;
                        case FilterMode.NeedsFix:
                            baseList = sourceList.Where(g => g.IsAuthorizedForClient && installedSet.Contains(g.AppId) && !string.IsNullOrEmpty(g.FixDriveId));
                            break;
                        case FilterMode.Authorized:
                            baseList = sourceList.Where(g => g.IsAuthorizedForClient);
                            break;
                        case FilterMode.AllCatalog:
                        default:
                            baseList = sourceList;
                            break;
                    }

                    List<GameModel> results = new List<GameModel>();
                    foreach (var g in baseList)
                    {
                        if (token.IsCancellationRequested) break;
                        if (!FirebaseService.IsCleanPlayableGame(g.AppId, g.Name)) continue;

                        bool matchesSearch = string.IsNullOrEmpty(query) ||
                            g.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                            g.AppId.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                            g.SteamFolderName.Contains(query, StringComparison.OrdinalIgnoreCase);

                        if (!matchesSearch) continue;

                        if (categoryFilter != "Todas las Categorías")
                        {
                            string catName = GetGameCategory(g);
                            if (categoryFilter.Contains("Acción") && catName != "Acción / Aventura") continue;
                            if (categoryFilter.Contains("RPG") && catName != "RPG / Rol") continue;
                            if (categoryFilter.Contains("Shooters") && catName != "Shooters / FPS") continue;
                            if (categoryFilter.Contains("Terror") && catName != "Terror / Horror") continue;
                            if (categoryFilter.Contains("Estrategia") && catName != "Estrategia / Sim") continue;
                            if (categoryFilter.Contains("Carreras") && catName != "Carreras / Deportes") continue;
                            if (categoryFilter.Contains("Indie") && catName != "Indie / Casual") continue;
                        }

                        results.Add(g);
                    }

                    return results;
                }, token);

                if (token.IsCancellationRequested) return;

                var visibleGames = matches.Take(displayLimit).ToList();
                var installedIds = SteamManager.GetInstalledAppIds();

                foreach (var game in visibleGames)
                {
                    game.IsInstalled = installedIds.Contains(game.AppId);
                    if (!game.IsInstalled && !game.IsProcessing)
                    {
                        game.StatusMessage = game.IsAuthorizedForClient ? "Listo para activar / instalar" : "Disponible en catálogo PandaStore";
                        game.ProgressValue = 0;
                    }
                }

                // Atomic assignment to WPF ItemsSource (0.1ms render)
                if (icGames != null)
                {
                    icGames.ItemsSource = visibleGames;
                }

                if (btnLoadMoreGames != null)
                {
                    int remaining = matches.Count - visibleGames.Count;
                    if (remaining > 0)
                    {
                        btnLoadMoreGames.Content = $"➕ CARGAR MÁS JUEGOS ({remaining} RESTANTES)";
                        btnLoadMoreGames.Visibility = Visibility.Visible;
                    }
                    else
                    {
                        btnLoadMoreGames.Visibility = Visibility.Collapsed;
                    }
                }

                int authorizedCount = sourceList.Count(g => g.IsAuthorizedForClient);
                int installedCount = sourceList.Count(g => installedIds.Contains(g.AppId));

                if (lblGameCount != null)
                {
                    if (currentMode == FilterMode.Installed)
                    {
                        lblGameCount.Text = $"{visibleGames.Count} de {installedCount} juegos 100% instalados en tu PC";
                    }
                    else if (currentMode == FilterMode.NeedsFix)
                    {
                        lblGameCount.Text = $"{visibleGames.Count} juegos instalados que requieren Fix";
                    }
                    else if (currentMode == FilterMode.Authorized)
                    {
                        lblGameCount.Text = $"{visibleGames.Count} de {authorizedCount} juegos en tu catálogo personal";
                    }
                    else
                    {
                        lblGameCount.Text = $"Mostrando {visibleGames.Count} de {matches.Count} juegos encontrados (catálogo total: {sourceList.Count})";
                    }
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                Logger.LogError(ex, "ApplyGameFilter Error");
            }
        }

        private async void BtnActivarVip_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                try
                {
                    juego.StatusMessage = "⚡ Abriendo Activador VIP PandaStore...";
                    RefreshUi();

                    bool launched = await ActivatorBridgeHelper.LaunchActivatorAsync(juego.AppId, juego.Name);
                    if (launched)
                    {
                        juego.StatusMessage = "🔑 Activador iniciado. Completa el reporte de Steam.";
                        RefreshUi();
                    }
                    else
                    {
                        juego.StatusMessage = "⚠️ No se encontró PandaStoreActivator.exe";
                        RefreshUi();

                        // Fallback to WhatsApp if activator binary is missing
                        string licKey = _activeLicense?.Key ?? "Sin clave";
                        string email = _activeLicense?.ClientEmail ?? "Invitado";
                        string mensaje = Uri.EscapeDataString(
                            $"🐼 *PANDA STORE - ACTIVACIÓN VIP / EXCLUSIVO* 🔑\n\n" +
                            $"¡Hola Panda Store! Solicito la activación para el siguiente juego VIP:\n\n" +
                            $"🎮 *Juego:* {juego.Name}\n" +
                            $"🆔 *AppID:* {juego.AppId}\n" +
                            $"🔑 *Clave PandaStore:* {licKey}\n" +
                            $"📧 *Email:* {email}\n" +
                            $"💻 *HWID:* {_currentHwid}\n\n" +
                            $"Quedo atento a la confirmación de la activación. ¡Muchas gracias!"
                        );

                        string whatsappUrl = $"https://wa.me/56974751810?text={mensaje}";
                        Process.Start(new ProcessStartInfo(whatsappUrl) { UseShellExecute = true });
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error al lanzar Activador VIP");
                    MessageBox.Show($"Error al abrir el Activador VIP: {ex.Message}", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void BtnToggleDlcs_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                juego.IsDlcDrawerOpen = !juego.IsDlcDrawerOpen;
            }
        }

        private void BtnBuySelectedDlcs_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                var selectedDlcs = juego.Dlcs.Where(d => d.IsSelectedForPurchase && !d.IsOwned).ToList();
                if (selectedDlcs.Count == 0)
                {
                    // Si no marcó ninguna casilla, sugerir todos los no comprados
                    selectedDlcs = juego.Dlcs.Where(d => !d.IsOwned).ToList();
                }

                if (selectedDlcs.Count == 0)
                {
                    MessageBox.Show("¡Ya tienes todos los DLCs disponibles de este juego en tu biblioteca!", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                int totalClp = selectedDlcs.Sum(d => d.PriceClp);
                string dlcLines = string.Join("\n", selectedDlcs.Select(d => $"• {d.Name} (AppID: {d.AppId}) - ${d.PriceClp:N0} CLP"));

                string licKey = _activeLicense?.Key ?? "Sin clave";
                string email = _activeLicense?.ClientEmail ?? "cliente@email.com";

                string mensaje = Uri.EscapeDataString(
                    $"🐼 *PANDA STORE - COMPRA DE DLCs* 🎁\n\n" +
                    $"¡Hola PandaStore! Quiero comprar los siguientes DLCs para mi juego:\n\n" +
                    $"🎮 *Juego Base:* {juego.Name} (AppID: {juego.AppId})\n\n" +
                    $"📦 *DLCs Seleccionados:*\n" +
                    $"{dlcLines}\n\n" +
                    $"🔑 *Mi Clave PandaStore:* {licKey}\n" +
                    $"📧 *Mi Email:* {email}\n" +
                    $"💰 *Total Estimado:* ${totalClp:N0} CLP\n\n" +
                    $"¿Me confirmas los datos de pago por favor?"
                );

                string whatsappUrl = $"https://wa.me/56974751810?text={mensaje}";
                Process.Start(new ProcessStartInfo(whatsappUrl) { UseShellExecute = true });
            }
        }

        private void BtnOpenProfile_Click(object sender, RoutedEventArgs e)
        {
            if (_activeLicense != null)
            {
                lblProfileLicenseKey.Text = string.IsNullOrEmpty(_activeLicense.Key) ? "PANDA-DEMO-0000" : _activeLicense.Key;
                lblProfileEmail.Text = string.IsNullOrEmpty(_activeLicense.ClientEmail) ? "invitado@pandastore.cl" : _activeLicense.ClientEmail;
                lblProfileStatus.Text = _activeLicense.IsTrial ? "⏳ Modo Prueba Activo" : "✔ Activa & Verificada";

                int totalGames = _activeLicense.IsFullAccess ? 10 : (_activeLicense.AllowedGames?.Count ?? 0);
                lblProfileGamesCount.Text = _activeLicense.IsFullAccess ? "Catálogo Total (+150 juegos)" : $"{totalGames} juegos autorizados";

                if (_activeLicense.IsLegacyKey || _activeLicense.IsFullAccess || (_activeLicense.AllowedDlcs != null && _activeLicense.AllowedDlcs.Contains("*")))
                {
                    lblProfileDlcsCount.Text = "100% Desbloqueados (Legacy)";
                }
                else
                {
                    int dlcCount = _activeLicense.AllowedDlcs?.Count ?? 0;
                    lblProfileDlcsCount.Text = dlcCount > 0 ? $"{dlcCount} DLCs adquiridos" : "Solo juego base";
                }

                // Cálculo del Ciclo de Fidelidad Gamer (10 juegos = 1 gratis)
                int effectiveGames = Math.Max(1, totalGames);
                int cycleProgress = effectiveGames % 10;
                if (effectiveGames > 0 && cycleProgress == 0)
                {
                    cycleProgress = 10;
                }

                pbLoyaltyCycle.Value = cycleProgress;
                lblLoyaltyProgressText.Text = $"{cycleProgress} / 10 Juegos Comprados";

                // Rango Gamer
                if (effectiveGames >= 10)
                {
                    lblGamerRank.Text = "👑 Panda Legendario";
                    borderGamerRank.BorderBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11)); // Gold
                }
                else if (effectiveGames >= 4)
                {
                    lblGamerRank.Text = "🥈 Panda Pro Gamer";
                    borderGamerRank.BorderBrush = new SolidColorBrush(Color.FromRgb(168, 85, 247)); // Purple
                }
                else
                {
                    lblGamerRank.Text = "🥉 Panda Iniciado";
                    borderGamerRank.BorderBrush = new SolidColorBrush(Color.FromRgb(52, 211, 153)); // Green
                }

                if (cycleProgress == 10)
                {
                    lblLoyaltyMotivational.Text = "🎉 ¡TIENES 1 JUEGO DE REGALO DISPONIBLE PARA RECLAMAR!";
                    lblLoyaltyMotivational.Foreground = new SolidColorBrush(Color.FromRgb(245, 158, 11));
                    btnClaimLoyaltyReward.Content = "🎁 ¡RECLAMAR MI JUEGO GRATIS POR WHATSAPP!";
                    btnClaimLoyaltyReward.IsEnabled = true;
                    btnClaimLoyaltyReward.Opacity = 1.0;
                    btnClaimLoyaltyReward.ToolTip = "¡Felicidades! Has completado el ciclo de 10 juegos. Haz clic para reclamar tu premio.";
                }
                else
                {
                    int remaining = 10 - cycleProgress;
                    lblLoyaltyMotivational.Text = $"¡Te faltan solo {remaining} juego{(remaining > 1 ? "s" : "")} para reclamar tu próximo juego GRATIS!";
                    lblLoyaltyMotivational.Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));
                    btnClaimLoyaltyReward.Content = $"🔒 Juego Gratis Bloqueado (Te faltan {remaining} juegos)";
                    btnClaimLoyaltyReward.IsEnabled = false;
                    btnClaimLoyaltyReward.Opacity = 0.55;
                    btnClaimLoyaltyReward.ToolTip = $"Debes completar 10 juegos comprados para desbloquear tu regalo (Llevas {cycleProgress}/10).";
                }
            }
            else
            {
                lblProfileLicenseKey.Text = "Sin Licencia Activa";
                lblProfileEmail.Text = "Invitado / Catálogo";
                lblProfileStatus.Text = "No autenticado";
                lblProfileGamesCount.Text = "0 juegos";
                lblProfileDlcsCount.Text = "Ninguno";
                pbLoyaltyCycle.Value = 0;
                lblLoyaltyProgressText.Text = "0 / 10 Juegos";
                lblGamerRank.Text = "🥉 Panda Iniciado";
                lblLoyaltyMotivational.Text = "Ingresa tu clave PandaStore para desbloquear recompensas y beneficios.";
                btnClaimLoyaltyReward.Content = "🔒 Juego Gratis Bloqueado";
                btnClaimLoyaltyReward.IsEnabled = false;
                btnClaimLoyaltyReward.Opacity = 0.55;
            }

            borderProfileOverlay.Visibility = Visibility.Visible;
        }

        private void BtnCloseProfile_Click(object sender, RoutedEventArgs e)
        {
            borderProfileOverlay.Visibility = Visibility.Collapsed;
        }

        private void BtnCopyLicenseKey_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string key = lblProfileLicenseKey.Text;
                if (!string.IsNullOrEmpty(key) && key != "Sin Licencia Activa")
                {
                    Clipboard.SetText(key);
                    MessageBox.Show($"¡Clave {key} copiada al portapapeles!", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error al copiar clave");
            }
        }

        private void BtnClaimLoyaltyReward_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                int totalGames = _activeLicense?.IsFullAccess == true ? 10 : (_activeLicense?.AllowedGames?.Count ?? 0);
                int cycleProgress = totalGames % 10;
                if (totalGames > 0 && cycleProgress == 0) cycleProgress = 10;

                if (cycleProgress < 10)
                {
                    int remaining = 10 - cycleProgress;
                    MessageBox.Show($"¡Aún no completas el ciclo de 10 juegos!\n\nTe faltan {remaining} compra{(remaining > 1 ? "s" : "")} de juegos para desbloquear tu juego de regalo.", "PandaStore Fidelidad", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                string licKey = _activeLicense?.Key ?? "Sin clave";
                string email = _activeLicense?.ClientEmail ?? "cliente@email.com";

                string mensaje = Uri.EscapeDataString(
                    $"🐼 *PANDA STORE - CANJE DE REGALO POR FIDELIDAD* 🎁\n\n" +
                    $"¡Hola PandaStore! He completado mi ciclo de 10 juegos en mi cuenta y quiero solicitar mi juego de regalo:\n\n" +
                    $"📧 *Mi Email:* {email}\n" +
                    $"🔑 *Mi Clave PandaStore:* {licKey}\n" +
                    $"🎮 *Juego solicitado de regalo:* [Escribe aquí el nombre del juego que deseas]\n\n" +
                    $"¡Muchas gracias equipo PandaStore!"
                );

                string whatsappUrl = $"https://wa.me/56974751810?text={mensaje}";
                Process.Start(new ProcessStartInfo(whatsappUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error al abrir WhatsApp de canje");
            }
        }

        private async void BtnActivarJuego_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {

                // Check if Steam has injectors installed
                if (!SteamManager.IsSteamInjected())
                {
                    var confirmInject = MessageBox.Show(
                        "⚠️ PANDASTORE STEAM INYECTOR REQUERIDO\n\nPara activar e instalar juegos del catálogo en Steam, el Launcher necesita habilitar los parches del inyector de Steam.\n\n¿Deseas activar los inyectores ahora? (Steam se cerrará brevemente y se volverá a abrir)",
                        "PandaStore - Activar Inyectores",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (confirmInject == MessageBoxResult.Yes)
                    {
                        try
                        {
                            await SteamManager.InyectarSoloInyectoresAsync();
                            UpdateSteamModeUi(true);
                        }
                        catch (Exception ex)
                        {
                            MessageBox.Show($"Error al preparar inyectores de Steam: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                            return;
                        }
                    }
                    else
                    {
                        return;
                    }
                }

                btn.IsEnabled = false;
                juego.IsProcessing = true;
                juego.StatusMessage = "Inyectando activador en Steam...";
                RefreshUi();

                try
                {
                    await SteamManager.ActivarJuegoAsync(juego, _activeLicense?.AllowedDlcs);
                    juego.StatusMessage = "✔ Activación completada con éxito";
                    RefreshUi();

                    if (SteamManager.IsLinuxEnvironment())
                    {
                        MessageBox.Show(
                            $"¡Juego '{juego.Name}' activado!\n\n" +
                            "📌 PASO FINAL OBLIGATORIO EN STEAM DECK / LINUX:\n" +
                            "1. Cierra la aplicación de Steam en Linux (o vuelve a 'Modo Juego' / Gaming Mode).\n" +
                            "2. Vuelve a abrir Steam.\n" +
                            "3. ¡El juego ya aparecerá listo en tu biblioteca para presionar 'INSTALAR'!",
                            "PandaStore - Activación Lista (Steam Deck)",
                            MessageBoxButton.OK,
                            MessageBoxImage.Information);
                    }
                    else
                    {
                        MessageBox.Show(
                            $"¡Juego '{juego.Name}' activado con éxito!\n\nSteam se abrirá de inmediato para iniciar la descarga del juego.",
                            "PandaStore - Activación Lista",
                            MessageBoxButton.OK,
                            MessageBoxImage.Information);
                    }
                }
                catch (Exception ex)
                {
                    juego.StatusMessage = $"❌ Error: {ex.Message}";
                    RefreshUi();
                    MessageBox.Show($"Error al activar juego: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                finally
                {
                    btn.IsEnabled = true;
                    juego.IsProcessing = false;
                }
            }
        }

        private async void BtnRepararDescarga_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                var result = MessageBox.Show(
                    $"¿Deseas reparar la descarga de '{juego.Name}' en Steam?\n\n" +
                    "Esta acción soluciona errores de descarga ('actualización pausada', bucles o archivos dañados) de forma 100% automática:\n\n" +
                    "1. Cerrará Steam de forma segura.\n" +
                    "2. Eliminará los archivos corruptos o trabados de la descarga (carpeta downloading y appmanifest dañado).\n" +
                    "3. Reinstalará todos los manifiestos oficiales limpios de Ryuu y PandaStore.\n" +
                    "4. Reiniciará Steam limpio y listo para descargar sin errores.\n\n" +
                    "¿Deseas iniciar la reparación ahora?",
                    "PandaStore - Reparar Descarga",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result != MessageBoxResult.Yes) return;

                btn.IsEnabled = false;
                juego.IsProcessing = true;
                juego.StatusMessage = "🧹 Limpiando archivos corruptos y reparando descarga...";
                RefreshUi();

                try
                {
                    await SteamManager.RepararDescargaJuegoAsync(juego, _activeLicense?.AllowedDlcs);
                    juego.StatusMessage = "✔ Descarga reparada correctamente";
                    RefreshUi();

                    ShowWindowsToast("¡Descarga Reparada!", $"PandaStore: La descarga de '{juego.Name}' ha sido reparada y Steam se reinició limpio 🚀");
                    MessageBox.Show(
                        $"¡La descarga de '{juego.Name}' ha sido reparada con éxito!\n\n" +
                        "Los archivos temporales corruptos fueron eliminados y los manifiestos oficiales han sido reinstalados.\n" +
                        "Steam se abrirá de inmediato para iniciar o continuar la descarga limpia.",
                        "PandaStore - Reparación Completada",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    juego.StatusMessage = $"❌ Error al reparar: {ex.Message}";
                    RefreshUi();
                    MessageBox.Show($"Error al reparar la descarga: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                finally
                {
                    btn.IsEnabled = true;
                    juego.IsProcessing = false;
                    RefreshUi();
                }
            }
        }

        private async void BtnInstalarFix_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                if (juego.IsDenuvo || juego.IsVip)
                {
                    BtnActivarVip_Click(sender, e);
                    return;
                }

                btn.IsEnabled = false;
                juego.IsProcessing = true;
                juego.StatusMessage = "Comprobando carpeta del juego...";

                try
                {
                    string steamPath = SteamManager.GetSteamPath();

                    // 1. Locate the exact game directory using AppID and appmanifest (or folder name fallback)
                    string? gameFolder = SteamManager.GetGameDirectoryByAppId(juego.AppId, juego.SteamFolderName);
                    if (string.IsNullOrEmpty(gameFolder))
                    {
                        gameFolder = SteamManager.FindGameCommonFolder(juego.SteamFolderName);
                    }
                    if (string.IsNullOrEmpty(gameFolder))
                    {
                        gameFolder = SteamManager.FindGameCommonFolder(juego.Name);
                    }

                    bool isGameInstalled = SteamManager.IsGameInstalled(juego.AppId, juego.SteamFolderName) ||
                                           (!string.IsNullOrEmpty(gameFolder) && Directory.Exists(gameFolder) && Directory.GetFiles(gameFolder, "*.*", SearchOption.AllDirectories).Length > 0);

                    if (!isGameInstalled)
                    {
                        // Ensure manifests & licenses are injected so Steam allows installation
                        juego.StatusMessage = "Activando licencias en Steam...";
                        await SteamManager.DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath);

                        // Restart Steam to reload manifests
                        await Task.Run(() =>
                        {
                            SteamManager.KillSteam();
                            string appcachePath = Path.Combine(steamPath, "appcache");
                            if (Directory.Exists(appcachePath))
                            {
                                try { Directory.Delete(appcachePath, true); } catch { }
                            }
                            SteamManager.StartSteam();
                        });

                        juego.StatusMessage = "Debes instalar el juego en Steam primero";
                        MessageBox.Show(
                            $"⚠️ EL JUEGO '{juego.Name}' AÚN NO HA SIDO DESCARGADO EN STEAM.\n\n" +
                            "📌 PASOS PARA INSTALAR EL JUEGO Y EL FIX:\n" +
                            "1. La licencia de PandaStore ha sido activada en tu cliente de Steam.\n" +
                            "2. Abre tu cliente de Steam y haz clic en 'INSTALAR' o 'DESCARGAR' en tu biblioteca.\n" +
                            "3. Espera a que Steam complete la descarga del juego al 100%.\n" +
                            "4. Una vez finalizada la descarga del juego, vuelve a PandaStore Launcher y presiona '🛠️ Fix' nuevamente para instalar el parche/crack en la carpeta del juego.",
                            "PandaStore - Descarga requerida en Steam",
                            MessageBoxButton.OK,
                            MessageBoxImage.Warning);
                        return;
                    }

                    // 2. Determine fix URLs:
                    // Priority 1 (MANDATORY): Ryuu API fixes — always use official Ryuu source
                    // Priority 2 (Fallback): GoFile link from FixDriveId if Ryuu has no entry for this game
                    juego.StatusMessage = "Consultando parches oficiales de Ryuu...";
                    List<string> fixUrlsToDownload = new List<string>();

                    // Always query Ryuu API first — user requires official Ryuu fixes exclusively
                    var ryuuFixes = await DriveDownloader.GetFixesForAppIdAsync(juego.AppId);
                    if (ryuuFixes.Count > 0)
                    {
                        // Pick the best Ryuu fix: prefer Hypervisor/Bypass, avoid Extra Steps/Unstable
                        var bestRyuuFix = ryuuFixes.FirstOrDefault(f => f.Badges.Any(b => b.Equals("Hypervisor", StringComparison.OrdinalIgnoreCase)))
                                          ?? ryuuFixes.FirstOrDefault(f => !f.Badges.Any(b => b.Equals("Extra Steps", StringComparison.OrdinalIgnoreCase) || b.Equals("Unstable", StringComparison.OrdinalIgnoreCase)))
                                          ?? ryuuFixes[0];

                        if (!string.IsNullOrWhiteSpace(bestRyuuFix?.Href))
                        {
                            fixUrlsToDownload.Add(bestRyuuFix.Href);
                        }
                    }
                    else if (!string.IsNullOrWhiteSpace(juego.FixDriveId))
                    {
                        // Fallback: use our own curated fix only if Ryuu has no entry
                        fixUrlsToDownload.Add(juego.FixDriveId);
                    }

                    if (fixUrlsToDownload.Count > 0)
                    {
                        string currentFixUrl = fixUrlsToDownload[0];
                        string fixFileName = Path.GetFileName(currentFixUrl);
                        bool isRyuuFix = currentFixUrl.Contains("ryuu.lol") || !currentFixUrl.Contains("gofile.io");

                        var progress = new Progress<DownloadProgressReport>(report =>
                        {
                            juego.ProgressValue = report.Percentage;
                            juego.StatusMessage = isRyuuFix
                                ? $"🛡️ Descargando Fix Oficial Ryuu ({fixFileName}): {report.StatusText}"
                                : $"Descargando Parche PandaStore ({fixFileName}): {report.StatusText}";
                        });

                        await DriveDownloader.DownloadAndExtractFixAsync(currentFixUrl, juego.AppId, gameFolder!, progress);

                        // Also refresh manifests
                        await SteamManager.DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath);
                    }
                    else
                    {
                        // No fix file found – just refresh manifests/licenses
                        await SteamManager.DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath);
                    }

                    juego.IsFixInstalled = true;
                    juego.HasCustomLauncher = SteamManager.HasCustomFixLauncher(juego.SteamFolderName);
                    juego.StatusMessage = "✔ Fix e Inyección Listos";
                    ShowWindowsToast("¡Fix Aplicado!", $"PandaStore: El parche de '{juego.Name}' se ha instalado en la carpeta del juego 🎮");
                    MessageBox.Show(
                        $"¡Todos los Fixes/Parches de PandaStore para '{juego.Name}' han sido instalados con éxito dentro de la carpeta del juego!\n\n" +
                        $"Carpeta: {gameFolder}\n" +
                        $"Parches aplicados: {Math.Max(1, fixUrlsToDownload.Count)}\n\n" +
                        "Ya puedes ejecutar el juego desde el botón '▶ JUGAR' o desde tu biblioteca de Steam.",
                        "PandaStore Fix Aplicado",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    juego.StatusMessage = $"❌ Error en Fix: {ex.Message}";
                    juego.ProgressValue = 0;
                    MessageBox.Show($"Error al descargar/instalar el Fix: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                finally
                {
                    btn.IsEnabled = true;
                    juego.IsProcessing = false;
                }
            }
        }

        private void BtnLanzarJuego_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                try
                {
                    SteamManager.EnsureAppIdFileForGame(juego.AppId, juego.SteamFolderName);

                    string? gameFolder = SteamManager.FindGameCommonFolder(juego.SteamFolderName);
                    if (!string.IsNullOrEmpty(gameFolder) && Directory.Exists(gameFolder))
                    {
                        // Priority 1: Smart Exe Scanner (Direct Launch)
                        // This prevents Steam from intercepting and blocking Online Fixes (Spacewar).
                        string? targetExe = SteamManager.FindGameExecutable(gameFolder, juego.Name);

                        if (!string.IsNullOrEmpty(targetExe) && File.Exists(targetExe))
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = targetExe,
                                WorkingDirectory = Path.GetDirectoryName(targetExe),
                                UseShellExecute = true
                            });

                            juego.StatusMessage = $"✔ Ejecutando: {Path.GetFileName(targetExe)}";
                            RefreshUi();
                            return;
                        }

                        // Priority 2: Fallback to Steam Launch if no .exe found
                        Process.Start(new ProcessStartInfo($"steam://run/{juego.AppId}") { UseShellExecute = true });
                        juego.StatusMessage = "✔ Lanzando a través de Steam";
                        RefreshUi();
                        return;
                    }

                    // Fallback Steam launch if game folder isn't found 
                    // (maybe it's installed in a non-standard library)
                    Process.Start(new ProcessStartInfo($"steam://run/{juego.AppId}") { UseShellExecute = true });
                    juego.StatusMessage = "✔ Lanzando a través de Steam";
                    RefreshUi();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error al ejecutar el juego: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void BtnSolicitarJuego_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.Tag is GameModel juego)
            {
                try
                {
                    string mensaje = Uri.EscapeDataString($"Hola PandaStore! Quisiera solicitar añadir el juego '{juego.Name}' (AppID: {juego.AppId}) a mi pack de Steam.");
                    Process.Start(new ProcessStartInfo($"https://wa.me/56974751810?text={mensaje}") { UseShellExecute = true });
                }
                catch { }
            }
        }

        private void BtnGameOptions_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.ContextMenu != null)
            {
                btn.ContextMenu.PlacementTarget = btn;
                btn.ContextMenu.IsOpen = true;
            }
        }

        private async void MenuItemRequestFixUpdate_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.Tag is GameModel juego)
            {
                juego.IsProcessing = true;
                juego.StatusMessage = "Enviando solicitud de actualización a Ryuu Bot...";

                var result = await SteamManager.RequestRyuuGameUpdateAsync(juego.AppId);
                juego.IsProcessing = false;

                if (result.Success)
                {
                    juego.StatusMessage = "⌛ Solicitud enviada a Ryuu. Espera 1-5 min y reintenta 'Fix'";
                    MessageBox.Show(
                        $"¡Solicitud Enviada al Servidor Bot de Ryuu!\n\n" +
                        $"Juego: {juego.Name} (AppID: {juego.AppId})\n\n" +
                        $"El servidor bot de Ryuu está generando los manifiestos y parches actualizados para la nueva versión de Steam.\n\n" +
                        $"⏱️ Este proceso automático tarda entre 1 y 5 minutos.\n\n" +
                        $"En un par de minutos, vuelve a hacer clic en el botón '🛠️ Fix' para descargar el parche actualizado.",
                        "PandaStore - Solicitud de Update Registrada",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                else
                {
                    juego.StatusMessage = $"❌ Error en solicitud Ryuu: {result.Message}";
                    MessageBox.Show($"No se pudo registrar la solicitud en Ryuu: {result.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void MenuItemOpenGameFolder_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.Tag is GameModel juego)
            {
                string? dir = SteamManager.GetGameDirectoryByAppId(juego.AppId, juego.SteamFolderName);
                if (string.IsNullOrEmpty(dir)) dir = SteamManager.FindGameCommonFolder(juego.SteamFolderName);

                if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                {
                    Process.Start(new ProcessStartInfo { FileName = dir, UseShellExecute = true });
                }
                else
                {
                    MessageBox.Show($"La carpeta del juego '{juego.Name}' no fue encontrada en las librerías de Steam.", "Carpeta no encontrada", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
        }

        private void MenuItemCopyAppId_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.Tag is GameModel juego)
            {
                Clipboard.SetText(juego.AppId);
                ShowWindowsToast("AppID Copiado", $"Copiado AppID '{juego.AppId}' al portapapeles.");
            }
        }

        private async void BtnCheckUpdate_Click(object sender, RoutedEventArgs e)
        {
            btnCheckUpdate.IsEnabled = false;
            try
            {
                // 1. Primary: Check GitHub Releases API
                var ghUpdate = await GitHubUpdateHelper.CheckForUpdatesAsync(CurrentVersion, "PandaStoreSetup.exe");
                if (ghUpdate.HasUpdate && !string.IsNullOrEmpty(ghUpdate.DownloadUrl))
                {
                    var res = MessageBox.Show(
                        $"🚀 ¡NUEVA ACTUALIZACIÓN DISPONIBLE (GitHub Releases)!\n\nVersión Actual: {CurrentVersion}\nVersión Nueva: {ghUpdate.LatestVersion}\n\nCambios:\n{ghUpdate.Changelog}\n\n¿Deseas actualizar PandaStore Launcher ahora automáticamente?",
                        "PandaStore - Actualizar Aplicación",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Information);

                    if (res == MessageBoxResult.Yes)
                    {
                        UpdateWindow updateWindow = new UpdateWindow(ghUpdate.DownloadUrl, ghUpdate.LatestVersion);
                        updateWindow.ShowDialog();
                    }
                    return;
                }

                // 2. Secondary: Fallback to Firebase system_config/launcher
                var updateInfo = await _firebaseService.CheckForUpdatesAsync(CurrentVersion);
                if (updateInfo.HasUpdate && !string.IsNullOrEmpty(updateInfo.DownloadUrl))
                {
                    var res = MessageBox.Show(
                        $"🚀 ¡NUEVA ACTUALIZACIÓN DISPONIBLE!\n\nVersión Actual: {CurrentVersion}\nVersión Nueva: {updateInfo.LatestVersion}\n\nCambios:\n{updateInfo.Changelog}\n\n¿Deseas actualizar PandaStore Launcher ahora automáticamente?",
                        "PandaStore - Actualizar Aplicación",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Information);

                    if (res == MessageBoxResult.Yes)
                    {
                        UpdateWindow updateWindow = new UpdateWindow(updateInfo.DownloadUrl, updateInfo.LatestVersion);
                        updateWindow.ShowDialog();
                    }
                }
                else
                {
                    MessageBox.Show($"¡Tu PandaStore Launcher está 100% actualizado en la versión {CurrentVersion}!", "PandaStore Sistema", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al verificar actualizaciones: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                btnCheckUpdate.IsEnabled = true;
            }
        }

        private void BtnCopyDiagnostics_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string report = DiagnosticsHelper.GenerateDiagnosticReport(_currentHwid, _activeLicense?.ClientEmail ?? "Invitado");
                Clipboard.SetText(report);
                MessageBox.Show(
                    "¡Reporte de Diagnóstico copiado al portapapeles!\n\nPuedes pegarlo (Ctrl+V) en el chat con Soporte por WhatsApp para recibir ayuda inmediata.",
                    "PandaStore Diagnóstico",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al generar diagnóstico: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void UpdateSteamModeUi(bool isInjected)
        {
            if (isInjected)
            {
                btnToggleVacSteam.Content = "🎮 MODO JUEGOS PANDASTORE (ACTIVADO)";
                btnToggleVacSteam.Style = (Style)FindResource("VacButtonStyle");
                lblModeStatusIcon.Text = "🎮";
                lblModeStatusTitle.Text = "MODO JUEGOS PANDA STORE (ACTIVADO)";
                lblModeStatusTitle.Foreground = (System.Windows.Media.Brush)FindResource("AccentCyanBrush");
                lblModeStatusSub.Text = "Componentes de PandaStore activos en Steam. Puedes activar e instalar libremente tus juegos del catálogo.";
            }
            else
            {
                btnToggleVacSteam.Content = "🛡️ MODO SEGURO VAC (ACTIVADO)";
                btnToggleVacSteam.Style = (Style)FindResource("GoldButtonStyle");
                lblModeStatusIcon.Text = "🛡️";
                lblModeStatusTitle.Text = "MODO SEGURO ONLINE (STEAM 100% OFICIAL)";
                lblModeStatusTitle.Foreground = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10B981"));
                lblModeStatusSub.Text = "Steam en estado 100% limpio y oficial. Puedes jugar tus juegos personales multijugador online con total seguridad y sin riesgo de ban.";
            }
        }

        private async void BtnToggleVacSteam_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                btnToggleVacSteam.IsEnabled = false;

                bool isInjected = SteamManager.IsSteamInjected();

                if (isInjected)
                {
                    // Clean & Activate VAC Safe Mode
                    var confirm = MessageBox.Show(
                        "¿Deseas activar el Modo Seguro Online?\n\nEsto cerrará Steam y limpiará los parches para dejar tu cliente de Steam 100% oficial.\n\nAsí podrás jugar tus juegos personales online con total tranquilidad.",
                        "PandaStore - Modo Seguro Online",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (confirm == MessageBoxResult.Yes)
                    {
                        await SteamManager.ActivarModoSeguroVACAsync();
                        UpdateSteamModeUi(false);
                        MessageBox.Show("¡Modo Seguro Online Activado!\n\nSe restauró tu Steam al estado 100% oficial para jugar online tus juegos personales de forma totalmente segura.", "PandaStore Modo Seguro", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }
                else
                {
                    // Inject Steam Components
                    var confirm = MessageBox.Show(
                        "¿Deseas activar el Modo Juegos PandaStore?\n\nEsto cerrará Steam e instalará los parches necesarios para habilitar el uso y descarga de los juegos del catálogo de Panda Store.",
                        "PandaStore - Modo Juegos",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (confirm == MessageBoxResult.Yes)
                    {
                        await SteamManager.InyectarSoloInyectoresAsync();
                        UpdateSteamModeUi(true);
                        MessageBox.Show("¡Modo Juegos PandaStore Activado!\n\nLos parches de activación fueron instalados en Steam. Ya puedes activar tus juegos favoritos.", "PandaStore Juegos", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al alternar modo de Steam: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                btnToggleVacSteam.IsEnabled = true;
            }
        }

        private void BtnVacMode_Click(object sender, RoutedEventArgs e)
        {
            BtnToggleVacSteam_Click(sender, e);
        }

        private void BtnInjectSteamOnly_Click(object sender, RoutedEventArgs e)
        {
            BtnToggleVacSteam_Click(sender, e);
        }

        private bool _allVisibleSelected = false;

        private void BtnSelectVisible_Click(object sender, RoutedEventArgs e)
        {
            if (icGames?.ItemsSource is IEnumerable<GameModel> visibleGames)
            {
                _allVisibleSelected = !_allVisibleSelected;
                foreach (var game in visibleGames)
                {
                    if (game.IsAuthorizedForClient)
                    {
                        game.IsSelected = _allVisibleSelected;
                    }
                }
                if (btnSelectVisible != null)
                {
                    btnSelectVisible.Content = _allVisibleSelected ? "☒ Deseleccionar Visibles" : "☑️ Seleccionar Visibles";
                }
            }
        }

        private async void BtnActivateAll_Click(object sender, RoutedEventArgs e)
        {
            var selectedGames = _allGames.Where(g => g.IsAuthorizedForClient && g.IsSelected).ToList();

            if (selectedGames.Count == 0)
            {
                var res = MessageBox.Show(
                    "No has marcado ningún juego individual con la casilla de verificación [☑].\n\n¿Deseas activar los juegos actualmente visibles en esta lista?",
                    "PandaStore - Selección de Juegos",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (res == MessageBoxResult.Yes)
                {
                    if (icGames?.ItemsSource is IEnumerable<GameModel> visibleGames)
                    {
                        selectedGames = visibleGames.Where(g => g.IsAuthorizedForClient).ToList();
                    }
                }
                else
                {
                    return;
                }
            }

            if (selectedGames.Count == 0)
            {
                MessageBox.Show("No hay juegos autorizados seleccionados para activar.", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var confirm = MessageBox.Show(
                $"¿Deseas activar automáticamente tus {selectedGames.Count} juego(s) seleccionados en Steam?",
                "PandaStore - Activación Masiva",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (confirm != MessageBoxResult.Yes) return;

            btnActivateAll.IsEnabled = false;
            int activatedCount = 0;

            foreach (var juego in selectedGames)
            {
                juego.IsProcessing = true;
                juego.StatusMessage = "Inyectando activador...";

                try
                {
                    await SteamManager.ActivarJuegoAsync(juego, _activeLicense?.AllowedDlcs, autoOpenInstallPrompt: false);
                    activatedCount++;
                    juego.StatusMessage = "✔ Activado en Steam";

                    if (!string.IsNullOrEmpty(juego.FixDriveId))
                    {
                        string? gameFolder = SteamManager.FindGameCommonFolder(juego.SteamFolderName);
                        if (!string.IsNullOrEmpty(gameFolder) && Directory.Exists(gameFolder))
                        {
                            var progress = new Progress<DownloadProgressReport>(report =>
                            {
                                juego.ProgressValue = report.Percentage;
                                juego.StatusMessage = report.StatusText;
                            });

                            await DriveDownloader.DownloadAndExtractFixAsync(juego.FixDriveId, juego.AppId, gameFolder, progress);
                        }
                    }
                }
                catch (Exception ex)
                {
                    juego.StatusMessage = $"❌ Error: {ex.Message}";
                }
                finally
                {
                    juego.IsProcessing = false;
                }
            }

            btnActivateAll.IsEnabled = true;
            MessageBox.Show(
                $"¡Proceso completado!\n\nSe activaron {activatedCount} de {selectedGames.Count} juegos seleccionados en tu biblioteca de Steam.",
                "PandaStore - Todo Listo",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }

        private async void BtnBatchFixAll_Click(object sender, RoutedEventArgs e)
        {
            var installedGames = _allGames.Where(g => g.IsAuthorizedForClient && g.IsInstalled).ToList();
            if (installedGames.Count == 0)
            {
                MessageBox.Show("No se encontraron juegos instalados en tu PC.", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var confirm = MessageBox.Show(
                $"Se encontraron {installedGames.Count} juego(s) instalados en tu PC.\n\n¿Deseas descargar e instalar automáticamente sus Fixes y parches de PandaStore?",
                "PandaStore - Fixes Masivos",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (confirm != MessageBoxResult.Yes) return;

            btnBatchFixAll.IsEnabled = false;
            int fixedCount = 0;
            string steamPath = SteamManager.GetSteamPath();

            foreach (var juego in installedGames)
            {
                juego.IsProcessing = true;
                juego.StatusMessage = "Descargando Fix PandaStore...";

                try
                {
                    await SteamManager.DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath);
                    
                    string? gameFolder = SteamManager.GetGameDirectoryByAppId(juego.AppId, juego.SteamFolderName);
                    if (string.IsNullOrEmpty(gameFolder))
                    {
                        gameFolder = SteamManager.FindGameCommonFolder(juego.SteamFolderName);
                    }

                    if (!string.IsNullOrEmpty(gameFolder) && Directory.Exists(gameFolder))
                    {
                        List<string> fixUrlsToDownload = new List<string>();

                        // ALWAYS check Ryuu Fixes API first as primary source
                        var catalogFixes = await DriveDownloader.GetFixesForAppIdAsync(juego.AppId);
                        if (catalogFixes.Count > 0)
                        {
                            var newestFix = catalogFixes[0];
                            if (!string.IsNullOrWhiteSpace(newestFix.Href))
                            {
                                fixUrlsToDownload.Add(newestFix.Href);
                            }
                        }
                        else if (!string.IsNullOrWhiteSpace(juego.FixDriveId))
                        {
                            fixUrlsToDownload.Add(juego.FixDriveId);
                        }

                        if (fixUrlsToDownload.Count > 0)
                        {
                            string currentFixUrl = fixUrlsToDownload[0];
                            var progress = new Progress<DownloadProgressReport>(report =>
                            {
                                juego.ProgressValue = report.Percentage;
                                juego.StatusMessage = $"Fix Ryuu: {report.StatusText}";
                            });
                            await DriveDownloader.DownloadAndExtractFixAsync(currentFixUrl, juego.AppId, gameFolder, progress);
                        }
                    }
                    fixedCount++;
                    juego.StatusMessage = "✔ Fix Instalado";
                }
                catch (Exception ex)
                {
                    juego.StatusMessage = $"❌ Error Fix: {ex.Message}";
                }
                finally
                {
                    juego.IsProcessing = false;
                }
            }

            // Force Steam Restart to reload all batch manifests
            await Task.Run(() =>
            {
                SteamManager.KillSteam();
                string appcachePath = Path.Combine(steamPath, "appcache");
                if (Directory.Exists(appcachePath))
                {
                    try { Directory.Delete(appcachePath, true); } catch { }
                }
                SteamManager.StartSteam();
            });

            btnBatchFixAll.IsEnabled = true;
            MessageBox.Show($"¡Instalación masiva de Fixes completada en {fixedCount} juegos!\n\nSteam se ha reiniciado para aplicar todas las licencias.", "PandaStore Fixes", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnTabAuthorized_Click(object sender, RoutedEventArgs e)
        {
            _currentFilterMode = FilterMode.Authorized;
            btnTabAuthorized.Style = (Style)FindResource("GoldButtonStyle");
            btnTabInstalled.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabNeedsFix.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabAllCatalog.Style = (Style)FindResource("PurpleButtonStyle");
            ApplyGameFilter();
        }

        private void BtnTabInstalled_Click(object sender, RoutedEventArgs e)
        {
            _currentFilterMode = FilterMode.Installed;
            btnTabAuthorized.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabInstalled.Style = (Style)FindResource("GoldButtonStyle");
            btnTabNeedsFix.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabAllCatalog.Style = (Style)FindResource("PurpleButtonStyle");
            ApplyGameFilter();
        }

        private void BtnTabNeedsFix_Click(object sender, RoutedEventArgs e)
        {
            _currentFilterMode = FilterMode.NeedsFix;
            btnTabAuthorized.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabInstalled.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabNeedsFix.Style = (Style)FindResource("GoldButtonStyle");
            btnTabAllCatalog.Style = (Style)FindResource("PurpleButtonStyle");
            ApplyGameFilter();
        }

        private void BtnTabAllCatalog_Click(object sender, RoutedEventArgs e)
        {
            _currentFilterMode = FilterMode.AllCatalog;
            btnTabAuthorized.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabInstalled.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabNeedsFix.Style = (Style)FindResource("PurpleButtonStyle");
            btnTabAllCatalog.Style = (Style)FindResource("GoldButtonStyle");
            ApplyGameFilter();
        }

        private void BtnClearSteamCache_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                SteamManager.KillSteam();
                string steamPath = SteamManager.GetSteamPath();
                string appcachePath = Path.Combine(steamPath, "appcache");
                if (Directory.Exists(appcachePath))
                {
                    try { Directory.Delete(appcachePath, true); } catch { }
                }

                SteamManager.StartSteam();
                MessageBox.Show("🧹 ¡Caché de Steam limpiada con éxito!\n\nSteam se ha reiniciado limpiamente y recargará todas las licencias de tus juegos.", "PandaStore Caché", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al limpiar caché de Steam: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void BtnAddAntivirusExclusion_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string steamPath = SteamManager.GetSteamPath();
                string tempPath = Path.GetTempPath();

                string psCommand = $"Set-MpPreference -EnableControlledFolderAccess Disabled -ErrorAction SilentlyContinue; Add-MpPreference -ExclusionPath '{steamPath}','{tempPath}' -ErrorAction SilentlyContinue";

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{psCommand}\"",
                    Verb = "runas",
                    UseShellExecute = true
                };

                Process? process = Process.Start(psi);
                process?.WaitForExit(5000);

                Task.Run(() => SteamManager.EnsureAllInstalledSteamAppIdFiles());

                MessageBox.Show($"🛡️ ¡Protección del sistema configurada exitosamente!\n\n• Acceso controlado a carpetas ajustado para permitir el guardado de juegos sin errores.\n• Exclusiones añadidas para Steam y carpetas de juegos.\n• Verificación y reparación de archivos de juegos completada.", "PandaStore Seguridad", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"No se pudo aplicar la exclusión automática: {ex.Message}\n\nPuedes desactivar Defender manualmente si algún archivo es bloqueado.", "PandaStore Aviso", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private async void BtnRefreshGames_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as Button;
            if (btn != null)
            {
                btn.IsEnabled = false;
                btn.Content = "⏳ Sincronizando...";
            }
            try
            {
                // 1. Si el cliente tiene una licencia activa, revalidarla directamente contra Firestore
                // para detectar juegos, DLCs o cambios de plan que el admin acaba de asignarle.
                if (_activeLicense != null && !string.IsNullOrEmpty(_activeLicense.Key))
                {
                    try
                    {
                        var refreshedLicense = await _firebaseService.ValidateLicenseAsync(_activeLicense.Key, _currentHwid);
                        if (refreshedLicense != null)
                        {
                            _activeLicense = refreshedLicense;

                            // Actualizar license.json localmente para el background checker
                            try
                            {
                                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                                if (!Directory.Exists(appDataDir)) Directory.CreateDirectory(appDataDir);
                                string licenseJson = System.Text.Json.JsonSerializer.Serialize(_activeLicense);
                                await File.WriteAllTextAsync(Path.Combine(appDataDir, "license.json"), licenseJson);
                            }
                            catch { }
                        }
                    }
                    catch (Exception licEx)
                    {
                        Logger.LogError(licEx, "Error revalidando licencia en refresco");
                    }
                }

                // 2. Refrescar el catálogo forzando actualización
                var allowedGames = _activeLicense?.AllowedGames ?? new List<string>();
                _allGames = await _firebaseService.GetAllGamesAsync(allowedGames, forceRefresh: true, allowedDlcs: _activeLicense?.AllowedDlcs);
                ApplyGameFilter();

                // 3. Feedback visual para el usuario
                if (btn != null)
                {
                    if (_activeLicense != null)
                    {
                        btn.Content = $"✔ Sincronizado ({_activeLicense.AllowedGames.Count} juegos)";
                    }
                    else
                    {
                        btn.Content = "✔ Actualizado";
                    }
                }
                await Task.Delay(1800);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error al sincronizar con Firestore");
                if (btn != null) btn.Content = "❌ Error";
                await Task.Delay(1500);
            }
            finally
            {
                if (btn != null)
                {
                    btn.Content = "🔄 Refrescar";
                    btn.IsEnabled = true;
                }
            }
        }

        private void BtnOpenHelp_Click(object sender, RoutedEventArgs e)
        {
            HelpOverlay.Visibility = Visibility.Visible;
        }

        private void BtnCloseHelp_Click(object sender, RoutedEventArgs e)
        {
            HelpOverlay.Visibility = Visibility.Collapsed;
        }

        private void BtnWhatsapp_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo("https://wa.me/56974751810") { UseShellExecute = true });
            }
            catch { }
        }

        private void BtnInstagram_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo("https://www.instagram.com/pandastoregaming.cl/") { UseShellExecute = true });
            }
            catch { }
        }

        private DateTime _lastUiRefresh = DateTime.MinValue;
        private void RefreshUi()
        {
            // Throttle ItemsControl refreshes to at most once every 100ms to prevent UI thread freezing ("No responde")
            if ((DateTime.Now - _lastUiRefresh).TotalMilliseconds < 100) return;
            _lastUiRefresh = DateTime.Now;

            Dispatcher.BeginInvoke(new Action(() =>
            {
                try
                {
                    icGames.Items.Refresh();
                }
                catch { }
            }), System.Windows.Threading.DispatcherPriority.Background);
        }

        private void CheckAntivirusStatus()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = "-NoProfile -Command \"(Get-MpComputerStatus).RealTimeProtectionEnabled\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };

                using var process = Process.Start(psi);
                string output = process?.StandardOutput.ReadToEnd()?.Trim() ?? "";

                if (bool.TryParse(output, out bool isRealtimeOn) && isRealtimeOn)
                {
                    borderAntivirusWarning.Background = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#2A1B0E"));
                    borderAntivirusWarning.BorderBrush = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#F59E0B"));
                    lblAntivirusWarningTag.Text = "⚠️ DEFENDER ACTIVO:";
                    lblAntivirusWarningTag.Foreground = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#F59E0B"));
                    lblAntivirusWarningText.Text = "Protección en tiempo real activa. Si falla algún Fix, presiona 'Auto-Excepción Defender'.";
                }
                else
                {
                    borderAntivirusWarning.Background = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#064E3B"));
                    borderAntivirusWarning.BorderBrush = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10B981"));
                    lblAntivirusWarningTag.Text = "🛡️ ANTIVIRUS OK:";
                    lblAntivirusWarningTag.Foreground = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10B981"));
                    lblAntivirusWarningText.Text = "Protección pausada o carpetas en excepción. Los parches se instalarán limpiamente.";
                }
            }
            catch
            {
                lblAntivirusWarningTag.Text = "⚠️ RECOMENDACIÓN:";
                lblAntivirusWarningText.Text = "Desactiva tu Antivirus o agrega excepción si algún Fix es bloqueado.";
            }
        }

        private static void ShowWindowsToast(string title, string message)
        {
            try
            {
                string psScript = $"[reflection.assembly]::loadwithpartialname('System.Windows.Forms'); $notification = New-Object System.Windows.Forms.NotifyIcon; $notification.Icon = [System.Drawing.SystemIcons]::Information; $notification.BalloonTipTitle = '{title}'; $notification.BalloonTipText = '{message}'; $notification.Visible = $true; $notification.ShowBalloonTip(5000);";

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{psScript}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                Process.Start(psi);
            }
            catch { }
        }
    }
}
