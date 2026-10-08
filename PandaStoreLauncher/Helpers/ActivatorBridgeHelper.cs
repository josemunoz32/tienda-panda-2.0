using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace PandaStoreLauncher.Helpers
{
    public static class ActivatorBridgeHelper
    {
        public static string? FindActivatorExecutable()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string[] candidatePaths = new[]
            {
                Path.Combine(baseDir, "PandaStoreActivator.exe"),
                Path.Combine(baseDir, "tools", "PandaStoreActivator.exe"),
                Path.Combine(baseDir, "Publish", "PandaStoreActivator.exe"),
                Path.Combine(baseDir, "TokeerDRM.exe"),
                @"c:\Users\Usuario\proyectopandastore20\PandaStoreActivator.exe",
                @"c:\Users\Usuario\proyectopandastore20\public\downloads\PandaStoreActivator.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PandaStore", "PandaStoreActivator.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "PandaStore", "PandaStoreActivator.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "PandaStore", "PandaStoreActivator.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "PandaStore", "PandaStoreActivator.exe")
            };

            foreach (var path in candidatePaths)
            {
                try
                {
                    if (File.Exists(path))
                    {
                        return Path.GetFullPath(path);
                    }
                }
                catch
                {
                    // Ignore path lookup errors
                }
            }

            return null;
        }

        public static async Task<string?> EnsureActivatorDownloadedAsync()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string pandaDir = Path.Combine(localAppData, "PandaStore");
                if (!Directory.Exists(pandaDir)) Directory.CreateDirectory(pandaDir);

                string targetExe = Path.Combine(pandaDir, "PandaStoreActivator.exe");
                if (File.Exists(targetExe) && new FileInfo(targetExe).Length > 1000000)
                {
                    return targetExe;
                }

                Logger.Log("Descargando PandaStoreActivator.exe...", "INFO");
                string downloadUrl = "https://pandastoreupdate.web.app/downloads/PandaStoreActivator.exe";

                try
                {
                    var ghAsset = await GitHubUpdateHelper.CheckForUpdatesAsync("0.0.1", "PandaStoreActivator.exe");
                    if (ghAsset.HasUpdate && !string.IsNullOrEmpty(ghAsset.DownloadUrl))
                    {
                        downloadUrl = ghAsset.DownloadUrl;
                    }
                }
                catch { }

                using (var client = new System.Net.Http.HttpClient())
                {
                    client.Timeout = TimeSpan.FromMinutes(3);
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("PandaStoreLauncher/2.4");
                    var bytes = await client.GetByteArrayAsync(downloadUrl);
                    if (bytes != null && bytes.Length > 1000000)
                    {
                        await File.WriteAllBytesAsync(targetExe, bytes);
                        Logger.Log("PandaStoreActivator.exe descargado exitosamente.", "INFO");
                        return targetExe;
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error al auto-descargar PandaStoreActivator.exe");
            }

            return null;
        }

        public static void WriteBridgeFiles(string appId, string gameName)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string pandaDir = Path.Combine(localAppData, "PandaStore");
                if (!Directory.Exists(pandaDir))
                {
                    Directory.CreateDirectory(pandaDir);
                }

                string bridgeJsonPath = Path.Combine(pandaDir, "launch_bridge.json");
                var bridgeData = new
                {
                    appId = appId,
                    gameName = gameName,
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };

                string json = JsonSerializer.Serialize(bridgeData, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(bridgeJsonPath, json);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error escribiendo launch_bridge.json");
            }

            try
            {
                string tempFile = Path.Combine(Path.GetTempPath(), "pandastore_pending_appid.txt");
                File.WriteAllText(tempFile, appId);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error escribiendo pandastore_pending_appid.txt");
            }
        }

        public static async Task<bool> LaunchActivatorAsync(string appId, string gameName)
        {
            try
            {
                // 1. Escribir archivos puente para el activador
                WriteBridgeFiles(appId, gameName);

                // 2. Buscar ejecutable del activador
                string? exePath = FindActivatorExecutable();
                if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
                {
                    // Si no está localmente, intentar auto-descargarlo directamente
                    exePath = await EnsureActivatorDownloadedAsync();
                }

                if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
                {
                    Logger.Log("PandaStoreActivator.exe no fue encontrado ni se pudo descargar.", "WARN");
                    return false;
                }

                // 3. Iniciar el proceso con argumentos CLI
                var psi = new ProcessStartInfo
                {
                    FileName = exePath,
                    Arguments = $"--appid {appId} --autofill",
                    UseShellExecute = true,
                    WorkingDirectory = Path.GetDirectoryName(exePath) ?? string.Empty
                };

                Process.Start(psi);
                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"Fallo al lanzar activador para AppID {appId}");
                return false;
            }
        }
    }
}
