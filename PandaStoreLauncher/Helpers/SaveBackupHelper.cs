using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using PandaStoreLauncher.Models;

namespace PandaStoreLauncher.Helpers
{
    public static class SaveBackupHelper
    {
        public static string GetBaseBackupFolder()
        {
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string folder = Path.Combine(docs, "PandaStorePartidas");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            return folder;
        }

        public static void OpenBackupsFolder()
        {
            try
            {
                string folder = GetBaseBackupFolder();
                Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
            }
            catch { }
        }

        /// <summary>
        /// Escanea las carpetas estándar de guardado en el PC del cliente (Documentos, Saved Games, AppData, Steam userdata)
        /// y genera una copia de seguridad local timestamped en Documentos\PandaStorePartidas\<NombreJuego>\
        /// </summary>
        public static async Task<bool> BackupGameSavesAsync(GameModel game)
        {
            if (game == null) return false;
            return await Task.Run(() =>
            {
                try
                {
                    string safeName = string.Join("_", (game.Name ?? "Juego").Split(Path.GetInvalidFileNameChars()));
                    string gameBackupDir = Path.Combine(GetBaseBackupFolder(), safeName);
                    Directory.CreateDirectory(gameBackupDir);

                    var saveCandidatePaths = FindPotentialSavePaths(game);
                    if (saveCandidatePaths.Count == 0) return false;

                    string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                    string zipPath = Path.Combine(gameBackupDir, $"Respaldo_{timestamp}.zip");

                    using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                    {
                        foreach (var path in saveCandidatePaths)
                        {
                            if (File.Exists(path))
                            {
                                zip.CreateEntryFromFile(path, Path.GetFileName(path));
                            }
                            else if (Directory.Exists(path))
                            {
                                string parentDir = Directory.GetParent(path)?.FullName ?? path;
                                foreach (var file in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
                                {
                                    string rel = Path.GetRelativePath(parentDir, file);
                                    zip.CreateEntryFromFile(file, rel);
                                }
                            }
                        }
                    }

                    // Conservar hasta 5 respaldos más recientes para no saturar espacio en disco
                    try
                    {
                        var oldZips = Directory.GetFiles(gameBackupDir, "*.zip")
                            .Select(f => new FileInfo(f))
                            .OrderByDescending(f => f.CreationTime)
                            .Skip(5);
                        foreach (var oldZip in oldZips)
                        {
                            try { oldZip.Delete(); } catch { }
                        }
                    }
                    catch { }

                    return true;
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "BackupGameSavesAsync Error");
                    return false;
                }
            });
        }

        private static List<string> FindPotentialSavePaths(GameModel game)
        {
            var results = new List<string>();
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string name = (game.Name ?? "").Trim();
            string folderName = (game.SteamFolderName ?? "").Trim();
            string appId = (game.AppId ?? "").Trim();

            string[] names = new[] { name, folderName }.Where(n => !string.IsNullOrEmpty(n)).Distinct().ToArray();

            // 1. Documentos y My Games
            foreach (var n in names)
            {
                string p1 = Path.Combine(docs, n);
                if (Directory.Exists(p1)) results.Add(p1);

                string p2 = Path.Combine(docs, "My Games", n);
                if (Directory.Exists(p2)) results.Add(p2);
            }

            // 2. Saved Games
            string savedGames = Path.Combine(userProfile, "Saved Games");
            if (Directory.Exists(savedGames))
            {
                foreach (var n in names)
                {
                    string p = Path.Combine(savedGames, n);
                    if (Directory.Exists(p)) results.Add(p);
                }
            }

            // 3. LocalAppData y AppData
            foreach (var n in names)
            {
                string pLoc = Path.Combine(localAppData, n);
                if (Directory.Exists(pLoc)) results.Add(pLoc);

                string pApp = Path.Combine(appData, n);
                if (Directory.Exists(pApp)) results.Add(pApp);
            }

            // 4. Steam UserData saves
            try
            {
                string steamPath = SteamManager.GetSteamPath();
                string userdata = Path.Combine(steamPath, "userdata");
                if (Directory.Exists(userdata) && !string.IsNullOrEmpty(appId))
                {
                    foreach (var uDir in Directory.GetDirectories(userdata))
                    {
                        string appSaveDir = Path.Combine(uDir, appId);
                        if (Directory.Exists(appSaveDir)) results.Add(appSaveDir);
                    }
                }
            }
            catch { }

            return results.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }
    }
}
