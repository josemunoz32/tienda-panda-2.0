using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using MonoTorrent;
using MonoTorrent.Client;
using PandaStoreLauncher.Helpers;
using PandaStoreLauncher.Models;

namespace PandaStoreLauncher.Services
{
    public class InstalledTorrentGameRecord
    {
        public string AppId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string InstallDirectory { get; set; } = string.Empty;
        public string ExecutablePath { get; set; } = string.Empty;
        public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    }

    public class TorrentDownloadService
    {
        private static readonly Lazy<TorrentDownloadService> _instance =
            new Lazy<TorrentDownloadService>(() => new TorrentDownloadService());

        public static TorrentDownloadService Instance => _instance.Value;

        private ClientEngine? _engine;
        private readonly ConcurrentDictionary<string, TorrentManager> _activeManagers = new();
        private readonly ConcurrentDictionary<string, CancellationTokenSource> _activeCts = new();
        private readonly string _baseInstallPath;
        private readonly string _cacheDirectory;
        private readonly string _installedDbFile;
        private readonly Dictionary<string, InstalledTorrentGameRecord> _installedGames = new(StringComparer.OrdinalIgnoreCase);

        // Fast public trackers for maximum P2P discovery
        private static readonly string[] FastTrackers = new[]
        {
            "udp://tracker.opentrackr.org:1337/announce",
            "udp://open.stealth.si:80/announce",
            "udp://tracker.torrent.eu.org:451/announce",
            "udp://tracker.dler.org:6969/announce",
            "udp://open.demonii.com:1337/announce",
            "udp://explodie.org:6969/announce",
            "udp://exodus.desync.com:6969/announce",
            "http://tracker.openbittorrent.com:80/announce"
        };

        private TorrentDownloadService()
        {
            string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
            _cacheDirectory = Path.Combine(appData, "TorrentCache");
            _installedDbFile = Path.Combine(appData, "installed_torrent_games.json");
            
            // Default download and install folder
            _baseInstallPath = @"C:\PandaStore Games";

            try
            {
                if (!Directory.Exists(_cacheDirectory)) Directory.CreateDirectory(_cacheDirectory);
                if (!Directory.Exists(_baseInstallPath)) Directory.CreateDirectory(_baseInstallPath);
            }
            catch { }

            LoadInstalledRecords();
            InitializeEngine();
        }

        private void InitializeEngine()
        {
            try
            {
                var engineSettings = new EngineSettingsBuilder
                {
                    CacheDirectory = _cacheDirectory,
                    AllowPortForwarding = true,
                    AutoSaveLoadDhtCache = true,
                    AutoSaveLoadFastResume = true
                }.ToSettings();

                _engine = new ClientEngine(engineSettings);
                Logger.Log("TorrentDownloadService: ClientEngine inicializado con éxito.");
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "TorrentDownloadService: Error al inicializar ClientEngine");
            }
        }

        private void LoadInstalledRecords()
        {
            try
            {
                if (File.Exists(_installedDbFile))
                {
                    string json = File.ReadAllText(_installedDbFile);
                    var list = JsonSerializer.Deserialize<List<InstalledTorrentGameRecord>>(json);
                    if (list != null)
                    {
                        foreach (var rec in list)
                        {
                            if (!string.IsNullOrEmpty(rec.AppId))
                            {
                                _installedGames[rec.AppId] = rec;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error cargando installed_torrent_games.json");
            }
        }

        private void SaveInstalledRecords()
        {
            try
            {
                string json = JsonSerializer.Serialize(_installedGames.Values.ToList(), new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_installedDbFile, json);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error guardando installed_torrent_games.json");
            }
        }

        public bool IsGameInstalled(GameModel game)
        {
            if (string.IsNullOrEmpty(game.AppId)) return false;

            if (_installedGames.TryGetValue(game.AppId, out var rec))
            {
                if (!string.IsNullOrEmpty(rec.ExecutablePath) && File.Exists(rec.ExecutablePath))
                {
                    return true;
                }
                if (!string.IsNullOrEmpty(rec.InstallDirectory) && Directory.Exists(rec.InstallDirectory))
                {
                    return true;
                }
            }

            // Also check default installation directory
            string targetFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
            if (Directory.Exists(targetFolder))
            {
                var exes = Directory.GetFiles(targetFolder, "*.exe", SearchOption.AllDirectories);
                if (exes.Any(e => !e.Contains("setup", StringComparison.OrdinalIgnoreCase) && !e.Contains("unins", StringComparison.OrdinalIgnoreCase)))
                {
                    return true;
                }
            }

            return false;
        }

        public string? GetInstalledExecutable(GameModel game)
        {
            if (_installedGames.TryGetValue(game.AppId, out var rec) && File.Exists(rec.ExecutablePath))
            {
                return rec.ExecutablePath;
            }

            string targetFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
            if (Directory.Exists(targetFolder))
            {
                // If specific target exe is known
                if (!string.IsNullOrEmpty(game.TargetExecutable))
                {
                    string specific = Path.Combine(targetFolder, game.TargetExecutable);
                    if (File.Exists(specific)) return specific;

                    var match = Directory.GetFiles(targetFolder, game.TargetExecutable, SearchOption.AllDirectories).FirstOrDefault();
                    if (!string.IsNullOrEmpty(match)) return match;
                }

                // First look for Forza or main executable
                var allExes = Directory.GetFiles(targetFolder, "*.exe", SearchOption.AllDirectories)
                    .Where(e => !Path.GetFileName(e).StartsWith("setup", StringComparison.OrdinalIgnoreCase)
                             && !Path.GetFileName(e).StartsWith("unins", StringComparison.OrdinalIgnoreCase)
                             && !Path.GetFileName(e).StartsWith("vc_", StringComparison.OrdinalIgnoreCase)
                             && !Path.GetFileName(e).StartsWith("dx", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                var bestMatch = allExes.OrderByDescending(f => new FileInfo(f).Length).FirstOrDefault();
                if (bestMatch != null) return bestMatch;
            }

            return null;
        }

        public async Task StartDownloadAsync(GameModel game, Action<string, double>? progressCallback = null)
        {
            if (_engine == null)
            {
                InitializeEngine();
                if (_engine == null)
                {
                    MessageBox.Show("No se pudo inicializar el motor de descarga Torrent de PandaStore.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }
            }

            string appId = game.AppId;
            if (string.IsNullOrEmpty(appId)) return;

            // If already downloading, toggle Pause / Resume
            if (_activeManagers.TryGetValue(appId, out var existingManager))
            {
                if (existingManager.State == TorrentState.Downloading || existingManager.State == TorrentState.Starting)
                {
                    await existingManager.PauseAsync();
                    game.StatusMessage = "⏸️ Descarga en pausa (Clic para reanudar)";
                    progressCallback?.Invoke(game.StatusMessage, game.ProgressValue);
                    return;
                }
                else if (existingManager.State == TorrentState.Paused)
                {
                    await existingManager.StartAsync();
                    game.StatusMessage = "▶️ Reanudando descarga...";
                    progressCallback?.Invoke(game.StatusMessage, game.ProgressValue);
                    return;
                }
            }

            string torrentPath = game.TorrentFilePath ?? string.Empty;
            if (string.IsNullOrEmpty(torrentPath) || !File.Exists(torrentPath))
            {
                string fileName = game.Name.Contains("5", StringComparison.OrdinalIgnoreCase)
                    ? "For5zaHo5riz5on5UE-1.688.109.torrent"
                    : "forzahorizon6-pe1778859852461.torrent";

                string appDirFallback = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "juegos_torrent", fileName);
                string rootFallback = Path.Combine(@"C:\Users\Usuario\proyectopandastore20\juegos_torrent", fileName);

                if (File.Exists(appDirFallback))
                {
                    torrentPath = appDirFallback;
                }
                else if (File.Exists(rootFallback))
                {
                    torrentPath = rootFallback;
                }
                else
                {
                    // Descargar automáticamente el .torrent desde el hosting si no está en local
                    try
                    {
                        string localTorrentDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore", "torrents");
                        if (!Directory.Exists(localTorrentDir)) Directory.CreateDirectory(localTorrentDir);
                        string downloadedTarget = Path.Combine(localTorrentDir, fileName);

                        if (!File.Exists(downloadedTarget))
                        {
                            using var http = new HttpClient();
                            http.Timeout = TimeSpan.FromSeconds(15);
                            string onlineUrl = $"https://pandastoreupdate.web.app/torrents/{fileName}";
                            var bytes = await http.GetByteArrayAsync(onlineUrl);
                            if (bytes != null && bytes.Length > 0)
                            {
                                await File.WriteAllBytesAsync(downloadedTarget, bytes);
                            }
                        }

                        if (File.Exists(downloadedTarget))
                        {
                            torrentPath = downloadedTarget;
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger.LogError(ex, $"Error descargando archivo .torrent desde servidor para {game.Name}");
                    }
                }
            }

            if (string.IsNullOrEmpty(torrentPath) || !File.Exists(torrentPath))
            {
                MessageBox.Show($"No se encontró el archivo de descarga .torrent para '{game.Name}'.", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            string destinationFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
            if (!Directory.Exists(destinationFolder)) Directory.CreateDirectory(destinationFolder);

            game.IsProcessing = true;
            game.StatusMessage = "⏳ Conectando con peers y anunciando en red BitTorrent...";
            game.ProgressValue = 0;
            progressCallback?.Invoke(game.StatusMessage, 0);

            try
            {
                var torrent = await Torrent.LoadAsync(torrentPath);

                // Verificación y Cálculo de Espacio en Disco antes de descargar
                string rootDrive = Path.GetPathRoot(Path.GetFullPath(destinationFolder)) ?? "C:\\";
                var driveInfo = new DriveInfo(rootDrive);
                long freeBytes = driveInfo.AvailableFreeSpace;

                double torrentGB = torrent.Size / (1024.0 * 1024.0 * 1024.0);
                double finalGameGB = Math.Round(torrentGB * 0.85, 1); // Tamaño estimado una vez descomprimido
                double tempReqGB = Math.Round(torrentGB + (torrentGB * 0.65), 1); // Espacio pico temporal durante descompresión
                double freeGB = Math.Round(freeBytes / (1024.0 * 1024.0 * 1024.0), 1);

                // Caso 1: Espacio Insuficiente en el disco del cliente
                if (freeBytes < (long)(tempReqGB * 1024 * 1024 * 1024))
                {
                    double missingGB = Math.Round(tempReqGB - freeGB, 1);

                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        game.IsProcessing = false;
                        game.StatusMessage = $"⚠️ Espacio insuficiente en {rootDrive} (Faltan {missingGB} GB)";
                        progressCallback?.Invoke(game.StatusMessage, 0);

                        MessageBox.Show(
                            $"⚠️ ATENCIÓN: ESPACIO EN DISCO REQUERIDO\n\n" +
                            $"Para descargar e instalar '{game.Name}' necesitas temporalmente:\n" +
                            $"• Espacio temporal pico: {tempReqGB} GB\n" +
                            $"  - Descarga del instalador: {torrentGB:F1} GB\n" +
                            $"  - Descompresión del juego: {finalGameGB} GB\n\n" +
                            $"💾 Tu disco ({rootDrive}) solo tiene: {freeGB} GB libres\n" +
                            $"❌ Te faltan al menos {missingGB} GB libres en este disco para poder realizar la instalación.\n\n" +
                            $"💡 IMPORTANTE: Una vez instalado, el juego solo pesará {finalGameGB} GB porque PandaStore eliminará automáticamente los {torrentGB:F1} GB del instalador, devolviéndote todo ese espacio libre.\n\n" +
                            $"Por favor libera espacio antes de comenzar la descarga.",
                            "PandaStore - Verificación de Espacio en Disco",
                            MessageBoxButton.OK,
                            MessageBoxImage.Warning);
                    });
                    return;
                }

                // Caso 2: Tiene espacio suficiente -> Mostrar diálogo explicativo de espacio y devolución
                bool userAccepted = true;
                Application.Current.Dispatcher.Invoke(() =>
                {
                    var confirm = MessageBox.Show(
                        $"🎮 CONFIRMACIÓN DE INSTALACIÓN: {game.Name}\n\n" +
                        $"📊 RESUMEN DE ESPACIO EN DISCO ({rootDrive}):\n" +
                        $"• Tamaño de descarga: {torrentGB:F1} GB\n" +
                        $"• Tamaño final del juego: {finalGameGB} GB\n" +
                        $"• Espacio temporal durante instalación: {tempReqGB} GB\n" +
                        $"• Espacio libre disponible en tu PC: {freeGB} GB (¡Espacio suficiente! ✅)\n\n" +
                        $"💡 AHORRO AUTOMÁTICO DE ESPACIO:\n" +
                        $"Al terminar la instalación, PandaStore eliminará automáticamente los {torrentGB:F1} GB del instalador temporal, devolviéndote ese espacio para que tu disco quede totalmente liviano.\n\n" +
                        $"¿Deseas iniciar la descarga ahora?",
                        "PandaStore Launcher - Descarga Directa",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (confirm != MessageBoxResult.Yes)
                    {
                        userAccepted = false;
                        game.IsProcessing = false;
                        game.StatusMessage = "Disponible para descarga directa";
                        progressCallback?.Invoke(game.StatusMessage, 0);
                    }
                });

                if (!userAccepted) return;

                var torrentSettings = new TorrentSettingsBuilder
                {
                    MaximumConnections = 300,
                    MaximumDownloadRate = 0, // Unlimited
                    MaximumUploadRate = 0    // Unlimited para recibir máxima prioridad de peers
                }.ToSettings();

                var manager = await _engine.AddAsync(torrent, destinationFolder, torrentSettings);
                _activeManagers[appId] = manager;

                // Inject public fast trackers
                try
                {
                    foreach (var trUri in FastTrackers)
                    {
                        _ = manager.TrackerManager.AddTrackerAsync(new Uri(trUri));
                    }
                }
                catch { }

                var cts = new CancellationTokenSource();
                _activeCts[appId] = cts;

                await manager.StartAsync();

                // Background monitoring loop
                _ = Task.Run(async () =>
                {
                    DateTime lastDiskCheck = DateTime.UtcNow;

                    while (!cts.Token.IsCancellationRequested)
                    {
                        await Task.Delay(800);

                        double progress = manager.Progress; // 0 to 100
                        long speedBytes = manager.Monitor.DownloadRate;
                        int peers = manager.OpenConnections;

                        // Monitoreo periódico de espacio en disco durante la descarga
                        if ((DateTime.UtcNow - lastDiskCheck).TotalSeconds >= 5)
                        {
                            lastDiskCheck = DateTime.UtcNow;
                            try
                            {
                                var currentDrive = new DriveInfo(rootDrive);
                                // Si queda menos de 1.5 GB libres durante la descarga
                                if (currentDrive.AvailableFreeSpace < (1.5 * 1024 * 1024 * 1024))
                                {
                                    await manager.PauseAsync();
                                    Application.Current.Dispatcher.Invoke(() =>
                                    {
                                        game.StatusMessage = $"⚠️ Descarga pausada: Poco espacio en {rootDrive}";
                                        progressCallback?.Invoke(game.StatusMessage, progress);

                                        MessageBox.Show(
                                            $"⚠️ ALERTA: DISCO CASI LLENO\n\n" +
                                            $"La descarga de '{game.Name}' se ha pausado automáticamente porque tu disco ({rootDrive}) tiene menos de 1.5 GB libres.\n\n" +
                                            $"Esto se hace para proteger tu sistema Windows y evitar fallos.\n\n" +
                                            $"👉 Por favor libera espacio en tu disco y haz clic en 'Reanudar' en PandaStore para continuar desde donde quedó.",
                                            "PandaStore - Protección de Disco",
                                            MessageBoxButton.OK,
                                            MessageBoxImage.Warning);
                                    });
                                    break;
                                }
                            }
                            catch { }
                        }

                        // Calculate ETA
                        string etaStr = "";
                        if (speedBytes > 1024 && progress < 100)
                        {
                            long remainingBytes = (long)(torrent.Size * (1.0 - (progress / 100.0)));
                            if (remainingBytes > 0)
                            {
                                var sec = remainingBytes / speedBytes;
                                var span = TimeSpan.FromSeconds(sec);
                                etaStr = span.Hours > 0 ? $"{span.Hours}h {span.Minutes}m" : $"{span.Minutes}m {span.Seconds}s";
                            }
                        }

                        string speedStr = FormatBytes(speedBytes);
                        string status = $"📥 {progress:F1}% • {speedStr}/s • {peers} peers" + (string.IsNullOrEmpty(etaStr) ? "" : $" • {etaStr}");

                        Application.Current.Dispatcher.Invoke(() =>
                        {
                            game.ProgressValue = progress;
                            game.StatusMessage = status;
                            progressCallback?.Invoke(status, progress);
                        });

                        if (manager.Complete || progress >= 99.9)
                        {
                            Logger.Log($"Descarga completada al 100% para {game.Name}!");
                            break;
                        }
                    }

                    if (!cts.Token.IsCancellationRequested)
                    {
                        await HandleDownloadCompletionAsync(game, manager, destinationFolder, progressCallback);
                    }
                }, cts.Token);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"Error iniciando descarga torrent para {game.Name}");
                Application.Current.Dispatcher.Invoke(() =>
                {
                    game.IsProcessing = false;
                    game.StatusMessage = $"❌ Error: {ex.Message}";
                    MessageBox.Show($"Error al iniciar descarga de {game.Name}:\n\n{ex.Message}", "PandaStore Launcher", MessageBoxButton.OK, MessageBoxImage.Error);
                });
            }
        }

        private async Task HandleDownloadCompletionAsync(GameModel game, TorrentManager manager, string destinationFolder, Action<string, double>? progressCallback)
        {
            try
            {
                await manager.StopAsync();
            }
            catch { }

            Application.Current.Dispatcher.Invoke(() =>
            {
                game.ProgressValue = 100;
                game.StatusMessage = "⚙️ Descarga completa. Verificando instalador silencioso...";
                progressCallback?.Invoke(game.StatusMessage, 100);
            });

            // Look for setup.exe or silent installer
            string? setupExe = Directory.GetFiles(destinationFolder, "*setup*.exe", SearchOption.AllDirectories).FirstOrDefault();
            if (string.IsNullOrEmpty(setupExe))
            {
                setupExe = Directory.GetFiles(destinationFolder, "installer.exe", SearchOption.AllDirectories).FirstOrDefault();
            }

            if (!string.IsNullOrEmpty(setupExe) && File.Exists(setupExe))
            {
                Application.Current.Dispatcher.Invoke(() =>
                {
                    game.StatusMessage = "⚙️ Ejecutando instalador en segundo plano...";
                });

                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = setupExe,
                        Arguments = $"/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR=\"{destinationFolder}\"",
                        UseShellExecute = true,
                        WorkingDirectory = Path.GetDirectoryName(setupExe)
                    };
                    var proc = Process.Start(psi);
                    if (proc != null)
                    {
                        await proc.WaitForExitAsync();
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error al ejecutar setup.exe en modo silencioso");
                }
            }

            // Find game executable
            string? gameExe = GetInstalledExecutable(game);
            if (string.IsNullOrEmpty(gameExe))
            {
                var allExes = Directory.GetFiles(destinationFolder, "*.exe", SearchOption.AllDirectories)
                    .Where(e => !Path.GetFileName(e).StartsWith("setup", StringComparison.OrdinalIgnoreCase) && !Path.GetFileName(e).StartsWith("unins", StringComparison.OrdinalIgnoreCase))
                    .ToList();
                gameExe = allExes.OrderByDescending(f => new FileInfo(f).Length).FirstOrDefault();
            }

            // Limpieza automática de instaladores temporales (.bin, .iso, setup*.exe) para devolver espacio al disco
            long freedBytes = 0;
            if (!string.IsNullOrEmpty(gameExe) && File.Exists(gameExe))
            {
                try
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        game.StatusMessage = "🧹 Liberando espacio: Eliminando instaladores temporales...";
                    });

                    var tempFiles = Directory.GetFiles(destinationFolder, "*.*", SearchOption.AllDirectories)
                        .Where(f =>
                        {
                            string ext = Path.GetExtension(f).ToLowerInvariant();
                            string fname = Path.GetFileName(f).ToLowerInvariant();
                            return ext == ".bin" || ext == ".iso" || ext == ".tmp" || (fname.StartsWith("setup") && ext == ".exe");
                        })
                        .ToList();

                    foreach (var file in tempFiles)
                    {
                        try
                        {
                            var fi = new FileInfo(file);
                            long sz = fi.Length;
                            File.Delete(file);
                            freedBytes += sz;
                        }
                        catch { }
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error en limpieza de archivos temporales");
                }
            }

            var record = new InstalledTorrentGameRecord
            {
                AppId = game.AppId,
                Name = game.Name,
                InstallDirectory = destinationFolder,
                ExecutablePath = gameExe ?? "",
                InstalledAt = DateTime.UtcNow
            };
            _installedGames[game.AppId] = record;
            SaveInstalledRecords();

            // Crear automáticamente acceso directo en el escritorio de Windows
            if (!string.IsNullOrEmpty(gameExe))
            {
                CreateDesktopShortcut(game, gameExe);
            }

            Application.Current.Dispatcher.Invoke(() =>
            {
                game.IsProcessing = false;
                game.IsInstalled = true;
                game.StatusMessage = "✔ Instalado al 100% y listo para jugar";
                progressCallback?.Invoke(game.StatusMessage, 100);

                string cleanupMsg = freedBytes > 0
                    ? $"\n\n🧹 PandaStore eliminó automáticamente {FormatBytes(freedBytes)} de instaladores temporales.\n¡Tu disco recuperó todo ese espacio!"
                    : "";

                MessageBox.Show($"¡{game.Name} se ha descargado e instalado con éxito!{cleanupMsg}\n\nSe ha creado el acceso directo en tu Escritorio y ya puedes presionar 'JUGAR' en PandaStore.",
                    "PandaStore - Instalación Completada", MessageBoxButton.OK, MessageBoxImage.Information);
            });
        }

        public void CreateDesktopShortcut(GameModel game, string? exePath = null)
        {
            try
            {
                string? exe = exePath ?? GetInstalledExecutable(game);
                if (string.IsNullOrEmpty(exe) || !File.Exists(exe)) return;

                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopPath, $"{SanitizeFolderName(game.Name)}.lnk");

                Type? shellType = Type.GetTypeFromCLSID(new Guid("72C24DD5-D70A-438B-8A42-98424B88AFB8"));
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType)!;
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = exe;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(exe);
                    shortcut.Description = $"Jugar a {game.Name} desde PandaStore";
                    shortcut.IconLocation = $"{exe},0";
                    shortcut.Save();
                    Logger.Log($"Acceso directo creado en el escritorio: {shortcutPath}");
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"Error al crear acceso directo en el escritorio para {game.Name}");
            }
        }

        public string? GetInstalledDirectory(GameModel game)
        {
            if (_installedGames.TryGetValue(game.AppId, out var rec) && !string.IsNullOrEmpty(rec.InstallDirectory) && Directory.Exists(rec.InstallDirectory))
            {
                return rec.InstallDirectory;
            }

            string targetFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
            if (Directory.Exists(targetFolder)) return targetFolder;

            return null;
        }

        public async Task<bool> UninstallGameAsync(GameModel game)
        {
            try
            {
                string targetFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
                if (_installedGames.TryGetValue(game.AppId, out var rec) && !string.IsNullOrEmpty(rec.InstallDirectory))
                {
                    targetFolder = rec.InstallDirectory;
                }

                // Calcular peso total de la carpeta para informar al usuario
                long totalBytes = 0;
                if (Directory.Exists(targetFolder))
                {
                    try
                    {
                        var files = Directory.GetFiles(targetFolder, "*.*", SearchOption.AllDirectories);
                        foreach (var f in files)
                        {
                            try { totalBytes += new FileInfo(f).Length; } catch { }
                        }
                    }
                    catch { }
                }

                string sizeStr = FormatBytes(totalBytes);
                var confirm = MessageBox.Show(
                    $"¿Estás seguro de que deseas desinstalar '{game.Name}' de tu PC?\n\n" +
                    $"📁 Carpeta: {targetFolder}\n" +
                    $"💾 Espacio que se liberará: {sizeStr}\n\n" +
                    "Se eliminarán todos los archivos del juego y el acceso directo del escritorio para liberar espacio en tu disco.",
                    "PandaStore - Confirmar Desinstalación",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (confirm != MessageBoxResult.Yes) return false;

                // 1. Eliminar acceso directo del escritorio si existe
                try
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string shortcutPath = Path.Combine(desktopPath, $"{SanitizeFolderName(game.Name)}.lnk");
                    if (File.Exists(shortcutPath)) File.Delete(shortcutPath);
                }
                catch { }

                // 2. Eliminar carpeta del juego
                if (Directory.Exists(targetFolder))
                {
                    await Task.Run(() =>
                    {
                        try
                        {
                            Directory.Delete(targetFolder, true);
                        }
                        catch (Exception ex)
                        {
                            Logger.LogError(ex, $"Error borrando carpeta {targetFolder}");
                        }
                    });
                }

                // 3. Remover de registros instalados
                _installedGames.Remove(game.AppId);
                SaveInstalledRecords();

                // 4. Actualizar estado del juego en la UI
                Application.Current.Dispatcher.Invoke(() =>
                {
                    game.IsInstalled = false;
                    game.ProgressValue = 0;
                    game.StatusMessage = "Disponible para descarga directa";
                    MessageBox.Show($"¡{game.Name} ha sido desinstalado con éxito!\n\nSe liberaron {sizeStr} en tu disco.", "PandaStore", MessageBoxButton.OK, MessageBoxImage.Information);
                });

                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"Error desinstalando {game.Name}");
                MessageBox.Show($"Error al desinstalar {game.Name}: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        public void LaunchGame(GameModel game)
        {
            try
            {
                string? exe = GetInstalledExecutable(game);
                if (string.IsNullOrEmpty(exe) || !File.Exists(exe))
                {
                    // Check if setup exists to complete install
                    string targetFolder = Path.Combine(_baseInstallPath, SanitizeFolderName(game.Name));
                    string? setup = Directory.GetFiles(targetFolder, "*setup*.exe", SearchOption.AllDirectories).FirstOrDefault();
                    if (!string.IsNullOrEmpty(setup) && File.Exists(setup))
                    {
                        Process.Start(new ProcessStartInfo { FileName = setup, UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(setup) });
                        return;
                    }

                    MessageBox.Show($"No se encontró el ejecutable del juego en:\n{targetFolder}\n\nPor favor vuelve a presionar 'Descargar' o ejecuta el instalador manualmente.",
                        "PandaStore Launcher", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                Logger.Log($"Lanzando juego Torrent: {exe}");
                Process.Start(new ProcessStartInfo
                {
                    FileName = exe,
                    WorkingDirectory = Path.GetDirectoryName(exe),
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"Error al iniciar {game.Name}");
                MessageBox.Show($"Error al iniciar el juego: {ex.Message}", "PandaStore Launcher", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private static string SanitizeFolderName(string name)
        {
            var invalid = Path.GetInvalidFileNameChars();
            return string.Concat(name.Where(c => !invalid.Contains(c))).Trim();
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes <= 0) return "0 KB";
            if (bytes < 1024 * 1024) return $"{(bytes / 1024.0):F0} KB";
            if (bytes < 1024 * 1024 * 1024) return $"{(bytes / (1024.0 * 1024.0)):F1} MB";
            return $"{(bytes / (1024.0 * 1024.0 * 1024.0)):F2} GB";
        }
    }
}
