using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows;

namespace PandaStoreLauncher
{
    public partial class UpdateWindow : Window
    {
        private readonly string _downloadUrl;
        private readonly string _latestVersion;

        public UpdateWindow(string downloadUrl, string latestVersion)
        {
            InitializeComponent();
            _downloadUrl = downloadUrl;
            _latestVersion = latestVersion;
            Loaded += UpdateWindow_Loaded;
        }

        private async void UpdateWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await DownloadAndInstallUpdateAsync();
        }

        private async Task DownloadAndInstallUpdateAsync()
        {
            try
            {
                string tempSetupExe = Path.Combine(Path.GetTempPath(), $"PandaStoreSetup_{Guid.NewGuid()}.exe");

                if (File.Exists(tempSetupExe)) File.Delete(tempSetupExe);

                using (var client = new HttpClient())
                {
                    using (var response = await client.GetAsync(_downloadUrl, HttpCompletionOption.ResponseHeadersRead))
                    {
                        response.EnsureSuccessStatusCode();
                        long? totalBytes = response.Content.Headers.ContentLength;

                        using (var contentStream = await response.Content.ReadAsStreamAsync())
                        using (var fileStream = new FileStream(tempSetupExe, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true))
                        {
                            var buffer = new byte[8192];
                            long totalRead = 0;
                            int read;

                            while ((read = await contentStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                            {
                                await fileStream.WriteAsync(buffer, 0, read);
                                totalRead += read;

                                if (totalBytes.HasValue)
                                {
                                    double progress = (double)totalRead / totalBytes.Value * 100;
                                    Dispatcher.Invoke(() =>
                                    {
                                        pbDownload.Value = progress;
                                        lblProgress.Text = $"{progress:F0}%";
                                        lblStatus.Text = $"Descargando: {totalRead / 1024 / 1024} MB / {totalBytes.Value / 1024 / 1024} MB";
                                    });
                                }
                            }
                        }
                    }
                }

                lblStatus.Text = "Instalando...";
                pbDownload.IsIndeterminate = true;

                string installedExe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "PandaStore", "PandaStoreLauncher.exe");
                string installedExe86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "PandaStore", "PandaStoreLauncher.exe");
                int currentPid = Process.GetCurrentProcess().Id;

                string scriptPath = Path.Combine(Path.GetTempPath(), "pandastore_updater.ps1");
                string psScript = $@"
# Esperar que el launcher se cierre completamente
Start-Sleep -Seconds 2
try {{ Stop-Process -Id {currentPid} -Force -ErrorAction SilentlyContinue }} catch {{}}
Start-Sleep -Seconds 1

# Instalar la nueva version silenciosamente
Start-Process -FilePath '{tempSetupExe}' -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART' -Wait

# Limpiar el instalador temporal
try {{ Remove-Item -Path '{tempSetupExe}' -Force -ErrorAction SilentlyContinue }} catch {{}}

# Abrir el launcher RECIEN INSTALADO (no el exe viejo)
if (Test-Path '{installedExe}') {{
    Start-Process -FilePath '{installedExe}'
}} elseif (Test-Path '{installedExe86}') {{
    Start-Process -FilePath '{installedExe86}'
}}
";

                await File.WriteAllTextAsync(scriptPath, psScript);

                // ANTI-LOOP FIX: Write a flag so the newly installed launcher
                // skips the update check on its first boot (breaks the infinite loop).
                try
                {
                    string pandaDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                    if (!Directory.Exists(pandaDir)) Directory.CreateDirectory(pandaDir);
                    await File.WriteAllTextAsync(Path.Combine(pandaDir, "update_just_installed.flag"), _latestVersion);
                }
                catch { }

                Process.Start(new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\"",
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                });

                Application.Current.Shutdown();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al actualizar: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }
    }
}
