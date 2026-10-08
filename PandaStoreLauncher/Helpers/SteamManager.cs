using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Win32;
using PandaStoreLauncher.Models;

namespace PandaStoreLauncher.Helpers
{
    public static class SteamManager
    {
        private static readonly string[] InjectorFiles = new[]
        {
            "OpenSteamTool.dll",
            "dwmapi.dll",
            "xinput1_4.dll",
            "opensteamtool.toml"
        };

        /// <summary>
        /// Checks if Steam root path currently has any of the injector DLLs installed.
        /// </summary>
        public static bool IsSteamInjected()
        {
            try
            {
                string steamPath = GetSteamPath();
                foreach (string file in InjectorFiles)
                {
                    string fullPath = Path.Combine(steamPath, file);
                    if (File.Exists(fullPath)) return true;
                }
            }
            catch { }
            return false;
        }

        /// <summary>
        /// Gets the main Steam installation path from Windows Registry.
        /// </summary>
        public static string GetSteamPath()
        {
            string? path = null;

            try
            {
                path = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Valve\Steam", "SteamPath", null) as string;
            }
            catch { }

            if (string.IsNullOrEmpty(path))
            {
                try
                {
                    path = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath", null) as string;
                }
                catch { }
            }

            // Check standard Windows default paths
            if (string.IsNullOrEmpty(path))
            {
                if (Directory.Exists(@"C:\Program Files (x86)\Steam"))
                    path = @"C:\Program Files (x86)\Steam";
                else if (Directory.Exists(@"C:\Program Files\Steam"))
                    path = @"C:\Program Files\Steam";
            }

            // Check SteamOS / Linux / Proton drive_c mapped paths
            if (string.IsNullOrEmpty(path))
            {
                if (Directory.Exists(@"Z:\home"))
                {
                    try
                    {
                        foreach (var userDir in Directory.GetDirectories(@"Z:\home"))
                        {
                            string[] candidates = new[]
                            {
                                Path.Combine(userDir, @".local\share\Steam"),
                                Path.Combine(userDir, @".steam\steam"),
                                Path.Combine(userDir, @".steam\root")
                            };
                            foreach (var cand in candidates)
                            {
                                if (Directory.Exists(cand))
                                {
                                    path = cand;
                                    break;
                                }
                            }
                            if (!string.IsNullOrEmpty(path)) break;
                        }
                    }
                    catch { }
                }

                if (string.IsNullOrEmpty(path))
                {
                    string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    string[] linuxSteamPaths = new[]
                    {
                        Path.Combine(userProfile, @".local\share\Steam"),
                        Path.Combine(userProfile, @".steam\steam"),
                        Path.Combine(userProfile, @".steam\root")
                    };

                    foreach (var linuxPath in linuxSteamPaths)
                    {
                        if (Directory.Exists(linuxPath))
                        {
                            path = linuxPath;
                            break;
                        }
                    }
                }
            }

            if (string.IsNullOrEmpty(path))
            {
                throw new DirectoryNotFoundException("No se encontró la instalación de Steam en el registro ni en las rutas de SteamOS / Windows.");
            }

            return path.Replace("/", @"\");
        }

        /// <summary>
        /// Returns all potential Steam installation paths (especially useful in Linux / Steam Deck multi-user / symlink setups).
        /// </summary>
        public static List<string> GetAllSteamPaths()
        {
            List<string> paths = new List<string>();

            try
            {
                string mainPath = GetSteamPath();
                if (!string.IsNullOrEmpty(mainPath) && Directory.Exists(mainPath))
                    paths.Add(mainPath);
            }
            catch { }

            if (IsLinuxEnvironment() && Directory.Exists(@"Z:\home"))
            {
                try
                {
                    foreach (var userDir in Directory.GetDirectories(@"Z:\home"))
                    {
                        string[] candidates = new[]
                        {
                            Path.Combine(userDir, @".local\share\Steam"),
                            Path.Combine(userDir, @".steam\steam"),
                            Path.Combine(userDir, @".steam\root")
                        };
                        foreach (var cand in candidates)
                        {
                            string formattedPath = cand.Replace("/", @"\");
                            if (Directory.Exists(cand) && !paths.Contains(formattedPath, StringComparer.OrdinalIgnoreCase))
                            {
                                paths.Add(formattedPath);
                            }
                        }
                    }
                }
                catch { }
            }

            return paths;
        }

        /// <summary>
        /// Checks if running under a Linux / Proton / Wine environment (Steam Deck, SteamOS).
        /// </summary>
        public static bool IsLinuxEnvironment()
        {
            try
            {
                return Directory.Exists(@"Z:\home") || Directory.Exists(@"Z:\usr") || Directory.Exists(@"Z:\etc");
            }
            catch { return false; }
        }

        /// <summary>
        /// Force closes steam.exe and steamwebhelper.exe.
        /// <summary>
        /// Force closes steam.exe, steamwebhelper.exe, gameoverlayui.exe, and steamservice.exe cleanly without leaving orphaned processes.
        /// </summary>
        public static void KillSteam()
        {
            string[] processNames = { "steam", "steamwebhelper", "gameoverlayui", "steamservice" };
            foreach (var name in processNames)
            {
                try
                {
                    var processes = Process.GetProcessesByName(name);
                    foreach (var proc in processes)
                    {
                        try
                        {
                            proc.Kill(entireProcessTree: true);
                            proc.WaitForExit(2500);
                        }
                        catch
                        {
                            // Process may already be dead
                        }
                    }
                }
                catch { }
            }

            // Pausa de seguridad para que el sistema operativo y Steam liberen sockets, archivos IPC y descriptores
            System.Threading.Thread.Sleep(800);

            // If running on Linux/Steam Deck under Wine/Proton, attempt to kill native Linux Steam process
            if (IsLinuxEnvironment())
            {
                try
                {
                    if (File.Exists(@"Z:\usr\bin\steam"))
                    {
                        using var p = Process.Start(new ProcessStartInfo
                        {
                            FileName = @"Z:\usr\bin\steam",
                            Arguments = "-shutdown",
                            UseShellExecute = false,
                            CreateNoWindow = true
                        });
                        p?.WaitForExit(2000);
                    }
                }
                catch { }

                try
                {
                    if (File.Exists(@"Z:\usr\bin\pkill"))
                    {
                        using var p = Process.Start(new ProcessStartInfo
                        {
                            FileName = @"Z:\usr\bin\pkill",
                            Arguments = "-9 -f steam",
                            UseShellExecute = false,
                            CreateNoWindow = true
                        });
                        p?.WaitForExit(2000);
                    }
                }
                catch { }
            }
        }

        /// <summary>
        /// Starts Steam cleanly with proper WorkingDirectory to prevent loops, missing DLLs or hangs on ROG Ally and Windows 10/11.
        /// </summary>
        public static void StartSteam()
        {
            string steamPath = GetSteamPath();
            string exePath = Path.Combine(steamPath, "steam.exe");

            if (File.Exists(exePath))
            {
                try
                {
                    // Asegurar que no quede ningún proceso fantasma bloqueando el socket antes de abrir
                    var lingering = Process.GetProcessesByName("steam");
                    if (lingering.Length > 0)
                    {
                        System.Threading.Thread.Sleep(800);
                    }

                    Process.Start(new ProcessStartInfo
                    {
                        FileName = exePath,
                        WorkingDirectory = steamPath, // Vital para ROG Ally y Windows 10/11
                        UseShellExecute = true
                    });
                    return;
                }
                catch { }
            }

            if (IsLinuxEnvironment())
            {
                List<string> linuxSteamExes = new List<string>
                {
                    @"Z:\usr\bin\steam"
                };

                if (Directory.Exists(@"Z:\home"))
                {
                    try
                    {
                        foreach (var userDir in Directory.GetDirectories(@"Z:\home"))
                        {
                            linuxSteamExes.Add(Path.Combine(userDir, @".local\share\Steam\steam.sh"));
                            linuxSteamExes.Add(Path.Combine(userDir, @".steam\steam\steam.sh"));
                        }
                    }
                    catch { }
                }

                foreach (var linuxExe in linuxSteamExes)
                {
                    if (File.Exists(linuxExe))
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = linuxExe,
                                UseShellExecute = true
                            });
                            break;
                        }
                        catch { }
                    }
                }
            }
        }

        /// <summary>
        /// Extracts the embedded injector DLLs into Steam's root folder.
        /// </summary>
        public static void ExtractInjectorComponents(string steamPath)
        {
            Assembly assembly = Assembly.GetExecutingAssembly();

            // Clean up any rogue/cached update files or duplicate hijackers
            string[] staleFiles = new[]
            {
                "winmm.dll",
                "winmm_real.dll",
                "BetterSteamTools.dll",
                "BetterSteamTools.exe",
                "opensteamtool_update.dll",
                "cloud_redirect_update.dll"
            };
            foreach (var stale in staleFiles)
            {
                try
                {
                    string p = Path.Combine(steamPath, stale);
                    if (File.Exists(p)) File.Delete(p);
                    else if (Directory.Exists(p)) Directory.Delete(p, true);
                }
                catch { }
            }

            foreach (var filename in InjectorFiles)
            {
                string resourceName = $"PandaStoreLauncher.Resources.Injector.{filename}";
                string destinationPath = Path.Combine(steamPath, filename);

                using Stream? resourceStream = assembly.GetManifestResourceStream(resourceName);
                if (resourceStream != null)
                {
                    using FileStream fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write);
                    resourceStream.CopyTo(fileStream);
                }
            }

            // Ensure intermediate CA certificates (YE1 / ISRG Root) are installed so CloudRedirect SSL requests don't fail
            EnsureCertificatesInstalled();
        }

        /// <summary>
        /// Ensures Let's Encrypt YE1 / ISRG Root intermediate certificates are installed in Windows Certificate Store.
        /// </summary>
        public static void EnsureCertificatesInstalled()
        {
            try
            {
                string[] certUrls = new[]
                {
                    "http://ye1.i.lencr.org/",
                    "https://letsencrypt.org/certs/isrgrootx1.der",
                    "https://letsencrypt.org/certs/isrg-root-x2.der"
                };

                using (X509Store store = new X509Store(StoreName.CertificateAuthority, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadWrite);
                    using (HttpClient client = new HttpClient())
                    {
                        client.Timeout = TimeSpan.FromSeconds(4);
                        foreach (var url in certUrls)
                        {
                            try
                            {
                                byte[] certBytes = client.GetByteArrayAsync(url).GetAwaiter().GetResult();
                                X509Certificate2 cert = new X509Certificate2(certBytes);
                                store.Add(cert);
                            }
                            catch { }
                        }
                    }
                    store.Close();
                }
            }
            catch { }
        }

        /// <summary>
        /// Installs ONLY the 7 injector DLLs in Steam without altering or adding Lua licenses.
        /// </summary>
        public static async Task InyectarSoloInyectoresAsync()
        {
            await Task.Run(() =>
            {
                string steamPath = GetSteamPath();
                KillSteam();
                ExtractInjectorComponents(steamPath);

                string appcachePath = Path.Combine(steamPath, "appcache");
                if (Directory.Exists(appcachePath))
                {
                    try { Directory.Delete(appcachePath, true); } catch { }
                }

                StartSteam();
            });
        }
        public const string RyuuAuthCode = "RYUUMANIFEST1uypp1";

        /// <summary>
        /// Sends an automated update request to Ryuu Reseller API for a specific AppID.
        /// </summary>
        public static async Task<(bool Success, string Message)> RequestRyuuGameUpdateAsync(string appId)
        {
            if (string.IsNullOrWhiteSpace(appId)) return (false, "AppID inválido.");

            try
            {
                string requestUpdateUrl = $"https://generator.ryuu.lol/resellerrequestupdate?appid={appId}&auth_code={RyuuAuthCode}";
                string requestGameUrl = $"https://generator.ryuu.lol/resellerrequest?appid={appId}&auth_code={RyuuAuthCode}";

                using (HttpClient client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(20);
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("PandaStoreLauncher/2.4");

                    // 1. Send update request
                    var response = await client.GetAsync(requestUpdateUrl);
                    string body = await response.Content.ReadAsStringAsync();

                    // 2. Ping game request to ensure catalog status
                    try { await client.GetAsync(requestGameUrl); } catch { }

                    if (response.IsSuccessStatusCode)
                    {
                        return (true, "Solicitud enviada al servidor bot de Ryuu con éxito.");
                    }
                    else
                    {
                        return (false, $"Respuesta del servidor Ryuu ({response.StatusCode}): {body}");
                    }
                }
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        /// <summary>
        /// Attempts to download the .lua and .manifest zip file from Ryuu Reseller API and extract into Steam.
        /// </summary>
        public static async Task<bool> DownloadAndInstallRyuuManifestAsync(string appId, string steamPath, List<string>? allowedDlcs = null)
        {
            try
            {
                var targetSteamPaths = GetAllSteamPaths();
                if (!targetSteamPaths.Contains(steamPath, StringComparer.OrdinalIgnoreCase))
                {
                    targetSteamPaths.Add(steamPath);
                }

                string url = $"https://generator.ryuu.lol/secure_download?appid={appId}&auth_code={RyuuAuthCode}";
                using (HttpClient client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(90);
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) PandaStoreLauncher/2.4");
                    var response = await client.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        byte[] zipData = await response.Content.ReadAsByteArrayAsync();
                        using (MemoryStream ms = new MemoryStream(zipData))
                        using (ZipArchive archive = new ZipArchive(ms))
                        {
                            foreach (var sPath in targetSteamPaths)
                            {
                                string configLua = Path.Combine(sPath, "config", "lua");
                                string configStPlugin = Path.Combine(sPath, "config", "st-plugin");
                                string configStPlugIn = Path.Combine(sPath, "config", "stplug-in");
                                string pluginsDir = Path.Combine(sPath, "plugins");

                                string configDepot = Path.Combine(sPath, "config", "depotcache");
                                string rootDepot = Path.Combine(sPath, "depotcache");

                                Directory.CreateDirectory(configLua);
                                Directory.CreateDirectory(configStPlugin);
                                Directory.CreateDirectory(configStPlugIn);
                                Directory.CreateDirectory(pluginsDir);
                                Directory.CreateDirectory(configDepot);
                                Directory.CreateDirectory(rootDepot);

                                var validManifests = new Dictionary<string, byte[]>();
                                var validDepotIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                                // 1. First pass: extract and validate real .manifest files (>= 500 bytes)
                                foreach (ZipArchiveEntry entry in archive.Entries)
                                {
                                    if (entry.FullName.EndsWith(".manifest", StringComparison.OrdinalIgnoreCase))
                                    {
                                        using Stream entryStream = entry.Open();
                                        using MemoryStream manifestMs = new MemoryStream();
                                        await entryStream.CopyToAsync(manifestMs);
                                        byte[] mBytes = manifestMs.ToArray();

                                        // Validate manifest protobuf structure before accepting it
                                        // Prevents Steam client crash on Assert(!m_strName.IsEmpty()) in contentmanifest.cpp:1630
                                        if (IsValidManifestData(mBytes))
                                        {
                                            string dId = entry.Name.Split('_')[0];
                                            if (!string.IsNullOrEmpty(dId) && !IsCorruptDepot(dId))
                                            {
                                                validManifests[entry.Name] = mBytes;
                                                validDepotIds.Add(dId);
                                            }
                                        }
                                    }
                                }

                                // 2. Write valid manifests to depotcache (both config/depotcache AND root depotcache)
                                foreach (var kvp in validManifests)
                                {
                                    try { File.WriteAllBytes(Path.Combine(configDepot, kvp.Key), kvp.Value); } catch { }
                                    try { File.WriteAllBytes(Path.Combine(rootDepot, kvp.Key), kvp.Value); } catch { }
                                }

                                // Ensure depotcache has all manifests and clean stubs
                                SyncDepotCaches(sPath);

                                // Also include any pre-existing real manifests on disk for this app
                                foreach (var diskPath in targetSteamPaths)
                                {
                                    var onDisk = GetValidDepotIdsOnDisk(diskPath);
                                    foreach (var did in onDisk)
                                    {
                                        validDepotIds.Add(did);
                                    }
                                }

                                // 3. Second pass: process and sanitize .lua files
                                foreach (ZipArchiveEntry entry in archive.Entries)
                                {
                                    if (entry.FullName.EndsWith(".lua", StringComparison.OrdinalIgnoreCase))
                                    {
                                        using Stream entryStream = entry.Open();
                                        using StreamReader reader = new StreamReader(entryStream);
                                        string luaText = await reader.ReadToEndAsync();

                                        string sanitizedLua = SanitizeLuaContent(luaText, appId, validDepotIds, allowedDlcs);

                                        File.WriteAllText(Path.Combine(configLua, entry.Name), sanitizedLua);
                                        File.WriteAllText(Path.Combine(configStPlugin, entry.Name), sanitizedLua);
                                        File.WriteAllText(Path.Combine(configStPlugIn, entry.Name), sanitizedLua);
                                        File.WriteAllText(Path.Combine(pluginsDir, entry.Name), sanitizedLua);
                                    }
                                }
                            }
                            return true;
                        }
                    }
                }
            }
            catch { }
            return false;
        }

        /// <summary>
        /// Validates manifest byte structure to prevent Steam client crashes.
        /// Catches:
        /// 1. Too small / dummy files (< 500 bytes).
        /// 2. Missing magic header (0x71F617D0).
        /// 3. EmptySteamDepot placeholder text.
        /// 4. Empty filename in FileMapping (0x0A 0x00 within header bytes), which triggers:
        ///    Assert( !m_strName.IsEmpty() ):contentmanifest.cpp:1630 causing Steam to terminate abruptly.
        /// </summary>
        public static bool IsValidManifestData(byte[]? data)
        {
            if (data == null || data.Length < 500) return false;

            // Magic: 0x71F617D0 (little-endian: 0xD0, 0x17, 0xF6, 0x71)
            if (data[0] != 0xD0 || data[1] != 0x17 || data[2] != 0xF6 || data[3] != 0x71)
            {
                return false;
            }

            // Check for EmptySteamDepot
            ReadOnlySpan<byte> emptyDepotPattern = "EmptySteamDepot"u8;
            if (data.AsSpan().IndexOf(emptyDepotPattern) >= 0)
            {
                return false;
            }

            // Check for empty filename bug in protobuf header (0x0A 0x00 within bytes 8..32)
            int checkLimit = Math.Min(data.Length - 1, 32);
            for (int i = 8; i < checkLimit; i++)
            {
                if (data[i] == 0x0A && data[i + 1] == 0x00)
                {
                    return false;
                }
            }

            return true;
        }

        public static bool IsValidManifestFile(string filePath)
        {
            try
            {
                var fi = new FileInfo(filePath);
                if (!fi.Exists || fi.Length < 500) return false;

                using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                byte[] header = new byte[Math.Min(1024, (int)fi.Length)];
                int read = fs.Read(header, 0, header.Length);
                if (read < 500) return false;

                if (header[0] != 0xD0 || header[1] != 0x17 || header[2] != 0xF6 || header[3] != 0x71)
                    return false;

                ReadOnlySpan<byte> emptyDepotPattern = "EmptySteamDepot"u8;
                if (header.AsSpan(0, read).IndexOf(emptyDepotPattern) >= 0)
                    return false;

                int checkLimit = Math.Min(read - 1, 32);
                for (int i = 8; i < checkLimit; i++)
                {
                    if (header[i] == 0x0A && header[i + 1] == 0x00)
                    {
                        return false;
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Checks if a depot ID is known to be corrupt or has invalid decryption keys in Ryuu generator
        /// that cause Steam client to fail manifest decryption ('Manifest is still encrypted' / 'Invalid content configuration').
        /// </summary>
        public static bool IsCorruptDepot(string depotId)
        {
            // 4651570 = Farming Simulator 25 Emergency Pack DLC (invalid decryption key causes prefetch crash)
            return depotId == "4651570";
        }

        /// <summary>
        /// Synchronizes manifest files from config/depotcache to root depotcache and cleans up empty/stub/corrupted files.
        /// Modern Steam requires manifests in root depotcache, otherwise it asks Valve CDN and throws 401 Unauthorized.
        /// </summary>
        public static void SyncDepotCaches(string steamPath)
        {
            if (string.IsNullOrWhiteSpace(steamPath)) return;
            try
            {
                string rootDepot = Path.Combine(steamPath, "depotcache");
                string configDepot = Path.Combine(steamPath, "config", "depotcache");
                Directory.CreateDirectory(rootDepot);
                Directory.CreateDirectory(configDepot);

                if (Directory.Exists(configDepot))
                {
                    foreach (var mf in Directory.GetFiles(configDepot, "*.manifest"))
                    {
                        var fi = new FileInfo(mf);
                        string fname = Path.GetFileName(mf);
                        string dId = fname.Split('_')[0];
                        if (IsValidManifestFile(mf) && !IsCorruptDepot(dId))
                        {
                            string target = Path.Combine(rootDepot, fname);
                            if (!File.Exists(target) || new FileInfo(target).Length != fi.Length)
                            {
                                try { File.Copy(mf, target, true); } catch { }
                            }
                        }
                        else
                        {
                            try { File.Delete(mf); } catch { }
                        }
                    }
                }

                if (Directory.Exists(rootDepot))
                {
                    foreach (var mf in Directory.GetFiles(rootDepot, "*.manifest"))
                    {
                        var fi = new FileInfo(mf);
                        string fname = Path.GetFileName(mf);
                        string dId = fname.Split('_')[0];
                        if (!IsValidManifestFile(mf) || IsCorruptDepot(dId))
                        {
                            try { File.Delete(mf); } catch { }
                        }
                    }
                }
            }
            catch { }
        }

        /// <summary>
        /// Retrieves all depot IDs from physical .manifest files on disk with valid structure.
        /// </summary>
        public static HashSet<string> GetValidDepotIdsOnDisk(string steamPath)
        {
            var validDepotIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(steamPath)) return validDepotIds;

            SyncDepotCaches(steamPath);

            var dirs = new[]
            {
                Path.Combine(steamPath, "depotcache"),
                Path.Combine(steamPath, "config", "depotcache")
            };

            foreach (var dir in dirs)
            {
                if (Directory.Exists(dir))
                {
                    try
                    {
                        foreach (var mf in Directory.GetFiles(dir, "*_*.manifest"))
                        {
                            if (IsValidManifestFile(mf))
                            {
                                string fname = Path.GetFileName(mf);
                                string dId = fname.Split('_')[0];
                                if (!string.IsNullOrEmpty(dId) && !IsCorruptDepot(dId))
                                {
                                    validDepotIds.Add(dId);
                                }
                            }
                        }
                    }
                    catch { }
                }
            }

            return validDepotIds;
        }

        /// <summary>
        /// Sanitizes a .lua activator script to ensure:
        /// 1. Depots and DLCs without physical .manifest files are commented out with '-- [NO_MANIFEST] '
        ///    so Steam never requests unowned manifests from Valve CDN (which causes 401/403, 'Failed downloading X manifests',
        ///    'Servidores de contenido inaccesibles' and 0% download loops).
        /// 2. Restricted DLCs are filtered.
        /// 3. Non-Windows depot flags are disabled on Windows.
        /// </summary>
        public static string SanitizeLuaContent(string rawLua, string appId, HashSet<string>? validDepotIds = null, List<string>? allowedDlcs = null)
        {
            if (string.IsNullOrWhiteSpace(rawLua)) return "";

            bool shouldFilterDlcs = allowedDlcs != null && allowedDlcs.Count > 0 && !allowedDlcs.Contains("*");
            var allowedSet = shouldFilterDlcs ? new HashSet<string>(allowedDlcs!, StringComparer.OrdinalIgnoreCase) : null;
            if (allowedSet != null) allowedSet.Add(appId);

            string[] sharedIds = new[] { "228980", "228984", "228988", "228989", "229002" };
            var lines = rawLua.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

            for (int li = 0; li < lines.Length; li++)
            {
                string line = lines[li];
                string trimmed = line.TrimStart();
                if (trimmed.StartsWith("--")) continue;

                bool isNonWindows = !IsLinuxEnvironment() && Regex.IsMatch(line, @"--\s*\((macos|linux|mac)\)", RegexOptions.IgnoreCase);
                bool isSharedRedist = sharedIds.Any(sId => Regex.IsMatch(line, $@"\baddappid\(\s*{sId}\b", RegexOptions.IgnoreCase));
                if (isNonWindows || isSharedRedist)
                {
                    lines[li] = "-- [NO_COMPRADO] " + line;
                    continue;
                }

                var matchApp = Regex.Match(line, @"addappid\(\s*(\d+)", RegexOptions.IgnoreCase);
                var matchManifest = Regex.Match(line, @"setManifestid\(\s*(\d+)", RegexOptions.IgnoreCase);
                string targetId = matchApp.Success ? matchApp.Groups[1].Value : (matchManifest.Success ? matchManifest.Groups[1].Value : "");

                if (!string.IsNullOrEmpty(targetId))
                {
                    if (IsCorruptDepot(targetId))
                    {
                        lines[li] = "-- [BAD_KEY] " + line;
                        continue;
                    }

                    if (shouldFilterDlcs && allowedSet != null && !allowedSet.Contains(targetId) && targetId != appId)
                    {
                        lines[li] = "-- [NO_COMPRADO] " + line;
                    }
                    else if (validDepotIds != null && validDepotIds.Count > 0 && !validDepotIds.Contains(targetId) && targetId != appId)
                    {
                        lines[li] = "-- [NO_MANIFEST] " + line;
                    }
                }
            }

            return string.Join(Environment.NewLine, lines);
        }

        /// <summary>
        /// Ensures games with custom pinned LuaContent (containing setManifestid) are written to Steam directories.
        /// </summary>
        public static void EnsurePinnedLuaInstalled(GameModel juego, string steamPath)
        {
            if (juego != null && !string.IsNullOrWhiteSpace(juego.LuaContent) && juego.LuaContent.Contains("setManifestid"))
            {
                string luaFileName = $"{juego.AppId}.lua";
                var validDepots = GetValidDepotIdsOnDisk(steamPath);
                string cleanLuaContent = SanitizeLuaContent(juego.LuaContent, juego.AppId, validDepots);
                string[] luaPaths = new[]
                {
                    Path.Combine(steamPath, "plugins", luaFileName),
                    Path.Combine(steamPath, "config", "st-plugin", luaFileName),
                    Path.Combine(steamPath, "config", "stplug-in", luaFileName),
                    Path.Combine(steamPath, "config", "lua", luaFileName)
                };

                foreach (var luaPath in luaPaths)
                {
                    try
                    {
                        Directory.CreateDirectory(Path.GetDirectoryName(luaPath)!);
                        File.WriteAllText(luaPath, cleanLuaContent);
                    }
                    catch { }
                }
            }
        }

        /// <summary>
        /// Activates a game by installing injector files, .lua activator, and .manifest files.
        /// </summary>
        public static async Task ActivarJuegoAsync(GameModel juego, List<string>? allowedDlcs = null, bool autoOpenInstallPrompt = true)
        {
            await Task.Run(async () =>
            {
                string steamPath = GetSteamPath();

                // 1. Kill Steam
                KillSteam();

                // 2. Extract injector DLLs
                ExtractInjectorComponents(steamPath);

                // 2.1 Preventive cleanup of corrupt downloading/temp chunks and failed appmanifest
                LimpiarDescargasTrabadas(juego.AppId, soloSiCorrupto: true);

                // 3. Ensure target folders exist
                string[] targetFolders = new[]
                {
                    Path.Combine(steamPath, "plugins"),
                    Path.Combine(steamPath, "config", "st-plugin"),
                    Path.Combine(steamPath, "config", "stplug-in"),
                    Path.Combine(steamPath, "config", "lua"),
                    Path.Combine(steamPath, "depotcache"),
                    Path.Combine(steamPath, "config", "depotcache")
                };

                foreach (var folder in targetFolders)
                {
                    if (!Directory.Exists(folder))
                        Directory.CreateDirectory(folder);
                }

                // 4. Try live download from Ryuu Reseller API
                bool ryuuSuccess = await DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath, allowedDlcs);

                // 5. Fallback to local / database content if Ryuu API wasn't used or failed
                if (!ryuuSuccess)
                {
                    string luaFileName = $"{juego.AppId}.lua";
                    string rawLuaContent = juego.LuaContent ?? "";

                    var targetPaths = GetAllSteamPaths();
                    if (!targetPaths.Contains(steamPath, StringComparer.OrdinalIgnoreCase))
                    {
                        targetPaths.Add(steamPath);
                    }

                    // Extract valid manifests first and collect valid depot IDs
                    var validDepotIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var sPath in targetPaths)
                    {
                        string depotcachePath = Path.Combine(sPath, "depotcache");
                        string configDepotPath = Path.Combine(sPath, "config", "depotcache");
                        Directory.CreateDirectory(depotcachePath);
                        Directory.CreateDirectory(configDepotPath);

                        if (juego.ManifestFiles != null)
                        {
                            foreach (var manifest in juego.ManifestFiles)
                            {
                                if (!string.IsNullOrEmpty(manifest.Filename) && !string.IsNullOrEmpty(manifest.ContentB64))
                                {
                                    byte[] manifestData = Convert.FromBase64String(manifest.ContentB64);
                                    string dId = manifest.Filename.Split('_')[0];
                                    if (IsValidManifestData(manifestData) && !IsCorruptDepot(dId))
                                    {
                                        try { File.WriteAllBytes(Path.Combine(depotcachePath, manifest.Filename), manifestData); } catch { }
                                        try { File.WriteAllBytes(Path.Combine(configDepotPath, manifest.Filename), manifestData); } catch { }
                                        if (!string.IsNullOrEmpty(dId)) validDepotIds.Add(dId);
                                    }
                                }
                            }
                        }

                        var onDisk = GetValidDepotIdsOnDisk(sPath);
                        foreach (var d in onDisk) validDepotIds.Add(d);
                    }

                    string cleanLuaContent = SanitizeLuaContent(rawLuaContent, juego.AppId, validDepotIds, allowedDlcs);

                    foreach (var sPath in targetPaths)
                    {
                        string[] luaPaths = new[]
                        {
                            Path.Combine(sPath, "plugins", luaFileName),
                            Path.Combine(sPath, "config", "st-plugin", luaFileName),
                            Path.Combine(sPath, "config", "stplug-in", luaFileName),
                            Path.Combine(sPath, "config", "lua", luaFileName)
                        };

                        foreach (var luaPath in luaPaths)
                        {
                            try
                            {
                                string parentDir = Path.GetDirectoryName(luaPath)!;
                                if (!Directory.Exists(parentDir)) Directory.CreateDirectory(parentDir);
                                File.WriteAllText(luaPath, cleanLuaContent);
                            }
                            catch { }
                        }
                    }
                }

                // 6. Delete target appcache files to force instant Steam license reload
                string appcachePath = Path.Combine(steamPath, "appcache");
                if (Directory.Exists(appcachePath))
                {
                    try
                    {
                        string appinfo = Path.Combine(appcachePath, "appinfo.vdf");
                        string packageinfo = Path.Combine(appcachePath, "packageinfo.vdf");
                        if (File.Exists(appinfo)) File.Delete(appinfo);
                        if (File.Exists(packageinfo)) File.Delete(packageinfo);
                    }
                    catch
                    {
                        try { Directory.Delete(appcachePath, true); } catch { }
                    }
                }

                // 6.5 Ensure steam_appid.txt is present in existing game directory and sub-bin folders
                try
                {
                    EnsureAppIdFileForGame(juego.AppId, juego.SteamFolderName);
                }
                catch { }

                // 7. Start Steam with clean environment
                StartSteam();

                // 8. Auto-open Steam download prompt reliably across all Windows devices & ROG Ally
                if (autoOpenInstallPrompt && !IsLinuxEnvironment() && !string.IsNullOrWhiteSpace(juego.AppId))
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            // Esperar a que steam.exe esté en memoria y respondiendo
                            for (int i = 0; i < 12; i++)
                            {
                                await Task.Delay(1000);
                                var pList = Process.GetProcessesByName("steam");
                                if (pList.Length > 0) break;
                            }

                            // Buffer de 2 segundos para asegurar que el socket de protocolo steam:// esté registrado y la UI cargada
                            await Task.Delay(2000);

                            Process.Start(new ProcessStartInfo($"steam://install/{juego.AppId}")
                            {
                                UseShellExecute = true
                            });
                        }
                        catch { }
                    });
                }
            });
        }

        /// <summary>
        /// Cleans stuck/corrupted download folders (steamapps/downloading/{appId}, steamapps/temp/{appId})
        /// and corrupt appmanifest_{appId}.acf files across all Steam library folders.
        /// If soloSiCorrupto is true, only files that exhibit error states or stuck downloads are removed.
        /// If soloSiCorrupto is false, all partial download staging files and appmanifest for this appId are purged.
        /// </summary>
        public static void LimpiarDescargasTrabadas(string appId, bool soloSiCorrupto = false)
        {
            if (string.IsNullOrWhiteSpace(appId)) return;

            try
            {
                var libraryFolders = GetSteamLibraryFolders();
                string steamPath = GetSteamPath();
                string mainCommon = Path.Combine(steamPath, "steamapps", "common");
                if (!libraryFolders.Contains(mainCommon, StringComparer.OrdinalIgnoreCase))
                {
                    libraryFolders.Add(mainCommon);
                }

                foreach (var libCommon in libraryFolders)
                {
                    try
                    {
                        DirectoryInfo? steamappsDir = Directory.GetParent(libCommon);
                        if (steamappsDir == null || !steamappsDir.Exists) continue;

                        string downloadingDir = Path.Combine(steamappsDir.FullName, "downloading", appId);
                        string tempDir = Path.Combine(steamappsDir.FullName, "temp", appId);
                        string manifestPath = Path.Combine(steamappsDir.FullName, $"appmanifest_{appId}.acf");

                        bool shouldClean = !soloSiCorrupto;

                        if (soloSiCorrupto)
                        {
                            if (File.Exists(manifestPath))
                            {
                                try
                                {
                                    string acfText = File.ReadAllText(manifestPath);
                                    // Check if UpdateResult is not 0 (e.g. "UpdateResult" "1")
                                    var matchUpdate = Regex.Match(acfText, @"""UpdateResult""\s+""([^0][^""]*)""", RegexOptions.IgnoreCase);
                                    if (matchUpdate.Success)
                                    {
                                        shouldClean = true;
                                    }
                                }
                                catch { }
                            }
                        }

                        if (shouldClean)
                        {
                            if (Directory.Exists(downloadingDir))
                            {
                                try { Directory.Delete(downloadingDir, true); } catch { }
                            }

                            if (Directory.Exists(tempDir))
                            {
                                try { Directory.Delete(tempDir, true); } catch { }
                            }

                            if (File.Exists(manifestPath))
                            {
                                try { File.Delete(manifestPath); } catch { }
                            }

                            // Clean any matching patch files
                            string downloadingRoot = Path.Combine(steamappsDir.FullName, "downloading");
                            if (Directory.Exists(downloadingRoot))
                            {
                                try
                                {
                                    foreach (var pFile in Directory.GetFiles(downloadingRoot, $"{appId}_*.patch"))
                                    {
                                        try { File.Delete(pFile); } catch { }
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    catch { }
                }

                // Purge any corrupted dummy manifests (< 500 bytes) across all depotcache folders
                // to prevent Steam Assert(!m_strName.IsEmpty()) crashes on startup
                foreach (var depotFolder in new[] { Path.Combine(steamPath, "depotcache"), Path.Combine(steamPath, "config", "depotcache") })
                {
                    if (Directory.Exists(depotFolder))
                    {
                        try
                        {
                            foreach (var mf in Directory.GetFiles(depotFolder, "*.manifest"))
                            {
                                try
                                {
                                    var fi = new FileInfo(mf);
                                    if (fi.Length < 500)
                                    {
                                        fi.Delete();
                                    }
                                }
                                catch { }
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        /// <summary>
        /// Fully repairs a game's download state in Steam:
        /// 1. Closes Steam cleanly.
        /// 2. Purges corrupt downloading/temp folders and stuck appmanifest for this appId.
        /// 3. Re-extracts injector DLLs and ensures folders exist.
        /// 4. Downloads official Ryuu manifests and LUA into depotcache and config/depotcache.
        /// 5. Clears appcache (appinfo.vdf / packageinfo.vdf).
        /// 6. Restarts Steam cleanly and triggers download prompt.
        /// </summary>
        public static async Task RepararDescargaJuegoAsync(GameModel juego, List<string>? allowedDlcs = null)
        {
            await Task.Run(async () =>
            {
                string steamPath = GetSteamPath();
                var allSteamPaths = GetAllSteamPaths();
                if (!allSteamPaths.Contains(steamPath, StringComparer.OrdinalIgnoreCase))
                {
                    allSteamPaths.Add(steamPath);
                }

                // 1. Force close Steam
                KillSteam();

                // 2. Wipe stuck downloading files and corrupt appmanifest for this specific appId
                LimpiarDescargasTrabadas(juego.AppId, soloSiCorrupto: false);

                // 3. Extract injector DLLs
                ExtractInjectorComponents(steamPath);

                // 4. Ensure target folders exist in all Steam paths
                foreach (var sPath in allSteamPaths)
                {
                    string[] targetFolders = new[]
                    {
                        Path.Combine(sPath, "plugins"),
                        Path.Combine(sPath, "config", "st-plugin"),
                        Path.Combine(sPath, "config", "stplug-in"),
                        Path.Combine(sPath, "config", "lua"),
                        Path.Combine(sPath, "depotcache"),
                        Path.Combine(sPath, "config", "depotcache")
                    };

                    foreach (var folder in targetFolders)
                    {
                        if (!Directory.Exists(folder))
                            Directory.CreateDirectory(folder);
                    }
                }

                // 5. Download and install Ryuu manifests & Lua
                bool ryuuSuccess = await DownloadAndInstallRyuuManifestAsync(juego.AppId, steamPath, allowedDlcs);

                // 6. Fallback if Ryuu download failed
                if (!ryuuSuccess)
                {
                    string luaFileName = $"{juego.AppId}.lua";
                    string rawLuaContent = juego.LuaContent ?? "";

                    var validDepotIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var sPath in allSteamPaths)
                    {
                        string depotcachePath = Path.Combine(sPath, "depotcache");
                        string configDepotPath = Path.Combine(sPath, "config", "depotcache");
                        Directory.CreateDirectory(depotcachePath);
                        Directory.CreateDirectory(configDepotPath);

                        if (juego.ManifestFiles != null)
                        {
                            foreach (var manifest in juego.ManifestFiles)
                            {
                                if (!string.IsNullOrEmpty(manifest.Filename) && !string.IsNullOrEmpty(manifest.ContentB64))
                                {
                                    byte[] manifestData = Convert.FromBase64String(manifest.ContentB64);
                                    if (manifestData.Length >= 500)
                                    {
                                        try { File.WriteAllBytes(Path.Combine(depotcachePath, manifest.Filename), manifestData); } catch { }
                                        try { File.WriteAllBytes(Path.Combine(configDepotPath, manifest.Filename), manifestData); } catch { }
                                        string dId = manifest.Filename.Split('_')[0];
                                        if (!string.IsNullOrEmpty(dId)) validDepotIds.Add(dId);
                                    }
                                }
                            }
                        }

                        var onDisk = GetValidDepotIdsOnDisk(sPath);
                        foreach (var d in onDisk) validDepotIds.Add(d);
                    }

                    string cleanLuaContent = SanitizeLuaContent(rawLuaContent, juego.AppId, validDepotIds, allowedDlcs);

                    foreach (var sPath in allSteamPaths)
                    {
                        string[] luaPaths = new[]
                        {
                            Path.Combine(sPath, "plugins", luaFileName),
                            Path.Combine(sPath, "config", "st-plugin", luaFileName),
                            Path.Combine(sPath, "config", "stplug-in", luaFileName),
                            Path.Combine(sPath, "config", "lua", luaFileName)
                        };

                        foreach (var luaPath in luaPaths)
                        {
                            try
                            {
                                Directory.CreateDirectory(Path.GetDirectoryName(luaPath)!);
                                File.WriteAllText(luaPath, cleanLuaContent);
                            }
                            catch { }
                        }
                    }
                }

                // 7. Wipe appcache to force fresh reload
                foreach (var sPath in allSteamPaths)
                {
                    string appcachePath = Path.Combine(sPath, "appcache");
                    if (Directory.Exists(appcachePath))
                    {
                        try
                        {
                            string appinfo = Path.Combine(appcachePath, "appinfo.vdf");
                            string packageinfo = Path.Combine(appcachePath, "packageinfo.vdf");
                            if (File.Exists(appinfo)) File.Delete(appinfo);
                            if (File.Exists(packageinfo)) File.Delete(packageinfo);
                        }
                        catch
                        {
                            try { Directory.Delete(appcachePath, true); } catch { }
                        }
                    }
                }

                System.Threading.Thread.Sleep(600);

                // 8. Start Steam clean
                StartSteam();

                // 9. Auto-open install prompt in Steam
                if (!IsLinuxEnvironment() && !string.IsNullOrWhiteSpace(juego.AppId))
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            for (int i = 0; i < 12; i++)
                            {
                                await Task.Delay(1000);
                                var pList = Process.GetProcessesByName("steam");
                                if (pList.Length > 0) break;
                            }
                            await Task.Delay(2000);

                            Process.Start(new ProcessStartInfo($"steam://install/{juego.AppId}")
                            {
                                UseShellExecute = true
                            });
                        }
                        catch { }
                    });
                }
            });
        }

        /// <summary>
        /// Cleans all injector DLLs and Lua scripts, resetting Steam to VAC Safe Official state.
        /// </summary>
        public static async Task ActivarModoSeguroVACAsync()
        {
            await Task.Run(() =>
            {
                string steamPath = GetSteamPath();

                // 1. Kill Steam
                KillSteam();

                // 2. Delete injector DLLs
                foreach (var filename in InjectorFiles)
                {
                    string filePath = Path.Combine(steamPath, filename);
                    if (File.Exists(filePath))
                    {
                        try { File.Delete(filePath); } catch { }
                    }
                }

                // 3. Delete lua files from plugins/config directories
                string[] luaDirs = new[]
                {
                    Path.Combine(steamPath, "plugins"),
                    Path.Combine(steamPath, "config", "st-plugin"),
                    Path.Combine(steamPath, "config", "stplug-in"),
                    Path.Combine(steamPath, "config", "lua")
                };

                foreach (var dir in luaDirs)
                {
                    if (Directory.Exists(dir))
                    {
                        try
                        {
                            foreach (var file in Directory.GetFiles(dir, "*.lua"))
                            {
                                File.Delete(file);
                            }
                        }
                        catch { }
                    }
                }

                // 4. Delete appcache
                string appcachePath = Path.Combine(steamPath, "appcache");
                if (Directory.Exists(appcachePath))
                {
                    try { Directory.Delete(appcachePath, true); } catch { }
                }

                // 5. Start Steam
                StartSteam();
            });
        }

        /// <summary>
        /// Emergency / Trial Expiration Purge: Kills Steam, deletes all PandaStore .LUA files,
        /// removes appmanifests for trial games, purges injector DLLs, and wipes cached appcache.
        /// </summary>
        public static async Task PurgeAndRevokeAllPandaGamesAsync(IEnumerable<string>? targetAppIds = null)
        {
            await Task.Run(() =>
            {
                try
                {
                    string steamPath = GetSteamPath();
                    var allSteamPaths = GetAllSteamPaths();
                    if (!allSteamPaths.Contains(steamPath, StringComparer.OrdinalIgnoreCase))
                    {
                        allSteamPaths.Add(steamPath);
                    }

                    // 1. Force close Steam and steamwebhelper
                    KillSteam();

                    // 2. Delete injector DLLs
                    foreach (var sPath in allSteamPaths)
                    {
                        foreach (var filename in InjectorFiles)
                        {
                            string filePath = Path.Combine(sPath, filename);
                            if (File.Exists(filePath))
                            {
                                try { File.Delete(filePath); } catch { }
                            }
                        }

                        // 3. Delete lua files from plugins/config directories
                        string[] luaDirs = new[]
                        {
                            Path.Combine(sPath, "plugins"),
                            Path.Combine(sPath, "config", "st-plugin"),
                            Path.Combine(sPath, "config", "stplug-in"),
                            Path.Combine(sPath, "config", "lua")
                        };

                        foreach (var dir in luaDirs)
                        {
                            if (!Directory.Exists(dir)) continue;

                            try
                            {
                                if (targetAppIds != null && targetAppIds.Any())
                                {
                                    foreach (var appId in targetAppIds)
                                    {
                                        string specificLua = Path.Combine(dir, $"{appId}.lua");
                                        if (File.Exists(specificLua))
                                        {
                                            try { File.Delete(specificLua); } catch { }
                                        }
                                    }
                                }
                                else
                                {
                                    // Wipe all lua scripts
                                    foreach (var file in Directory.GetFiles(dir, "*.lua"))
                                    {
                                        try { File.Delete(file); } catch { }
                                    }
                                }
                            }
                            catch { }
                        }

                        // 4. Delete appmanifest files for the target appids (to remove from Steam library)
                        if (targetAppIds != null)
                        {
                            var libraryPaths = GetSteamLibraryFolders();
                            foreach (var lib in libraryPaths)
                            {
                                string steamappsDir = Path.GetDirectoryName(lib) ?? "";
                                if (string.IsNullOrEmpty(steamappsDir)) continue;

                                foreach (var appId in targetAppIds)
                                {
                                    string manifestPath = Path.Combine(steamappsDir, $"appmanifest_{appId}.acf");
                                    if (File.Exists(manifestPath))
                                    {
                                        try { File.Delete(manifestPath); } catch { }
                                    }
                                }
                            }
                        }

                        // 5. Delete appcache and depotcache
                        string appcachePath = Path.Combine(sPath, "appcache");
                        if (Directory.Exists(appcachePath))
                        {
                            try { Directory.Delete(appcachePath, true); } catch { }
                        }
                    }

                    // 6. Delete local cached license
                    string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
                    string licenseFile = Path.Combine(appDataDir, "license.json");
                    string gamesCache = Path.Combine(appDataDir, "cache_games.json");
                    if (File.Exists(licenseFile)) try { File.Delete(licenseFile); } catch { }
                    if (File.Exists(gamesCache)) try { File.Delete(gamesCache); } catch { }

                    // 7. Restart clean Steam
                    StartSteam();
                }
                catch { }
            });
        }

        /// <summary>
        /// Reads libraryfolders.vdf to collect all Steam common folders across drives.
        /// </summary>
        public static List<string> GetSteamLibraryFolders()
        {
            string steamPath = GetSteamPath();
            List<string> libraries = new List<string>();

            string mainCommon = Path.Combine(steamPath, "steamapps", "common");
            if (Directory.Exists(mainCommon))
            {
                libraries.Add(mainCommon);
            }

            string vdfPath = Path.Combine(steamPath, "steamapps", "libraryfolders.vdf");
            if (File.Exists(vdfPath))
            {
                try
                {
                    string content = File.ReadAllText(vdfPath);
                    MatchCollection matches = Regex.Matches(content, @"""path""\s+""([^""]+)""", RegexOptions.IgnoreCase);

                    foreach (Match m in matches)
                    {
                        string rawPath = m.Groups[1].Value.Replace(@"\\", @"\");
                        string commonPath = Path.Combine(rawPath, "steamapps", "common");

                        if (Directory.Exists(commonPath) && !libraries.Contains(commonPath))
                        {
                            libraries.Add(commonPath);
                        }
                    }
                }
                catch { }
            }

            return libraries;
        }

        /// <summary>
        /// Finds the absolute path to a game's folder by reading installdir from appmanifest_{appId}.acf,
        /// falling back to steamFolderName if appmanifest is not available.
        /// </summary>
        public static string? GetGameDirectoryByAppId(string appId, string steamFolderName = "")
        {
            var libraries = GetSteamLibraryFolders();

            if (!string.IsNullOrWhiteSpace(appId))
            {
                foreach (var lib in libraries)
                {
                    DirectoryInfo? steamappsDir = Directory.GetParent(lib);
                    if (steamappsDir == null || !steamappsDir.Exists) continue;

                    string acfPath = Path.Combine(steamappsDir.FullName, $"appmanifest_{appId}.acf");
                    if (File.Exists(acfPath))
                    {
                        try
                        {
                            string content = File.ReadAllText(acfPath);
                            Match m = Regex.Match(content, @"""installdir""\s+""([^""]+)""", RegexOptions.IgnoreCase);
                            if (m.Success)
                            {
                                string installDirName = m.Groups[1].Value;
                                string targetDir = Path.Combine(lib, installDirName);
                                if (Directory.Exists(targetDir))
                                {
                                    return targetDir;
                                }
                            }
                        }
                        catch { }
                    }
                }
            }

            // Fallback: try by steamFolderName
            if (!string.IsNullOrWhiteSpace(steamFolderName))
            {
                return FindGameCommonFolder(steamFolderName);
            }

            return null;
        }

        /// <summary>
        /// Finds the absolute path to a game's common folder across all Steam libraries.
        /// Returns null if game folder is not found.
        /// </summary>
        public static string? FindGameCommonFolder(string steamFolderName)
        {
            if (string.IsNullOrWhiteSpace(steamFolderName)) return null;

            var libraries = GetSteamLibraryFolders();
            foreach (var lib in libraries)
            {
                // Direct check first
                string targetDir = Path.Combine(lib, steamFolderName);
                if (Directory.Exists(targetDir))
                {
                    return targetDir;
                }

                // Case-insensitive fallback check
                if (Directory.Exists(lib))
                {
                    try
                    {
                        var subdirs = Directory.GetDirectories(lib);
                        foreach (var dir in subdirs)
                        {
                            string dirName = Path.GetFileName(dir);
                            if (string.Equals(dirName, steamFolderName, StringComparison.OrdinalIgnoreCase))
                            {
                                return dir;
                            }
                        }
                    }
                    catch { }
                }
            }

            return null;
        }

        /// <summary>
        /// Checks if a game is 100% fully installed in Steam by verifying appmanifest_{appId}.acf or game directory files.
        /// </summary>
        public static bool IsGameInstalled(string appId, string steamFolderName)
        {
            if (string.IsNullOrWhiteSpace(appId) && string.IsNullOrWhiteSpace(steamFolderName)) return false;

            string? gameDir = GetGameDirectoryByAppId(appId, steamFolderName);
            if (!string.IsNullOrEmpty(gameDir) && Directory.Exists(gameDir))
            {
                try
                {
                    // If game directory exists and has files (or .exe files), it's installed!
                    var files = Directory.GetFiles(gameDir, "*.*", SearchOption.AllDirectories);
                    if (files.Length > 0)
                    {
                        return true;
                    }
                }
                catch { }
            }

            return false;
        }

        /// <summary>
        /// Checks if an installed game folder contains a custom launcher/fix EXE (e.g. Launcher.exe, PlayGTAIV.exe, etc.)
        /// </summary>
        public static bool HasCustomFixLauncher(string steamFolderName)
        {
            string? gameFolder = FindGameCommonFolder(steamFolderName);
            if (string.IsNullOrEmpty(gameFolder) || !Directory.Exists(gameFolder)) return false;

            string[] customLauncherNames = new[]
            {
                "Launcher.exe",
                "PlayGTAIV.exe",
                "PlayGTAV.exe",
                "PlayGTA3.exe",
                "PlayGTAViceCity.exe",
                "PlayGTASanAndreas.exe"
            };

            foreach (var name in customLauncherNames)
            {
                if (File.Exists(Path.Combine(gameFolder, name))) return true;
            }

            return false;
        }

        private static HashSet<string>? _installedAppIdsCache;
        private static DateTime _lastInstalledCacheTime = DateTime.MinValue;

        public static HashSet<string> GetInstalledAppIds(bool forceRefresh = false)
        {
            if (_installedAppIdsCache != null && !forceRefresh && (DateTime.Now - _lastInstalledCacheTime).TotalSeconds < 5)
            {
                return _installedAppIdsCache;
            }

            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var libraries = GetSteamLibraryFolders();
                foreach (var lib in libraries)
                {
                    DirectoryInfo? steamappsDir = Directory.GetParent(lib);
                    if (steamappsDir == null || !steamappsDir.Exists) continue;

                    foreach (var acfFile in Directory.GetFiles(steamappsDir.FullName, "appmanifest_*.acf"))
                    {
                        string filename = Path.GetFileName(acfFile);
                        string id = filename.Replace("appmanifest_", "").Replace(".acf", "");
                        if (!string.IsNullOrEmpty(id))
                        {
                            set.Add(id);
                        }
                    }
                }
            }
            catch { }

            _installedAppIdsCache = set;
            _lastInstalledCacheTime = DateTime.Now;
            return set;
        }

        public static bool IsGameInstalledFast(string appId, string steamFolderName)
        {
            if (string.IsNullOrWhiteSpace(appId)) return false;
            return GetInstalledAppIds().Contains(appId);
        }

        /// <summary>
        /// Escanea inteligentemente la carpeta del juego para encontrar el ejecutable principal.
        /// Retorna la ruta completa al .exe más probable, o null si no encuentra ninguno.
        /// </summary>
        public static string? FindGameExecutable(string gameFolderPath, string gameName)
        {
            if (string.IsNullOrEmpty(gameFolderPath) || !Directory.Exists(gameFolderPath))
                return null;

            // Prioridades:
            // 1. Archivos exactos conocidos para juegos rebeldes o de Fixes (incluyendo launchers Ryuu).
            string[] customLauncherNames = new[]
            {
                "Launcher.exe",
                "PlayGTAIV.exe",
                "PlayGTAV.exe",
                "PlayGTA3.exe",
                "PlayGTAViceCity.exe",
                "PlayGTASanAndreas.exe",
                "PlayRDR2.exe",
                "RDR2.exe",
                // Common Ryuu/CrackFix custom launchers
                "start.exe",
                "Start.exe",
                "launch.exe",
                "Launch.exe",
                "game.exe",
                "Play.exe",
                "run.exe",
                "Run.exe"
            };

            foreach (var customExeName in customLauncherNames)
            {
                string customExePath = Path.Combine(gameFolderPath, customExeName);
                if (File.Exists(customExePath))
                {
                    return customExePath;
                }
            }

            // 2. Buscar ejecutables en la raíz y subcarpetas que tengan nombres que coincidan parcialmente con el nombre del juego
            try
            {
                var allExecutables = Directory.GetFiles(gameFolderPath, "*.exe", SearchOption.AllDirectories);
                if (allExecutables.Length == 0)
                    return null;

                if (allExecutables.Length == 1)
                    return allExecutables[0];

                // Filtrar basura conocida
                var validExecutables = allExecutables.Where(e => 
                    !e.Contains("CrashReport", StringComparison.OrdinalIgnoreCase) &&
                    !e.Contains("UnityCrashHandler", StringComparison.OrdinalIgnoreCase) &&
                    !e.Contains("unins", StringComparison.OrdinalIgnoreCase) &&
                    !e.Contains("setup", StringComparison.OrdinalIgnoreCase) &&
                    !e.Contains("redist", StringComparison.OrdinalIgnoreCase) &&
                    !e.Contains("dxwebsetup", StringComparison.OrdinalIgnoreCase)
                ).ToList();

                if (validExecutables.Count == 0)
                    return allExecutables[0];

                // Si hay varios, intentar buscar el que más se parezca al nombre o a la carpeta
                string folderName = new DirectoryInfo(gameFolderPath).Name;
                
                // Primero, coincidencia con el nombre de la carpeta
                var bestMatch = validExecutables.FirstOrDefault(e => Path.GetFileNameWithoutExtension(e).Contains(folderName, StringComparison.OrdinalIgnoreCase));
                if (bestMatch != null)
                    return bestMatch;

                // Segundo, buscar el ejecutable más grande (suele ser el juego principal)
                var largestExe = validExecutables.OrderByDescending(e => new FileInfo(e).Length).FirstOrDefault();
                if (largestExe != null)
                    return largestExe;

                // Fallback al primero de la lista válida
                return validExecutables.First();
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Ensures steam_appid.txt is present in the game directory and executable subdirectories
        /// for a specific game. This prevents "filesystem failed to initialize" or SteamAPI initialization crashes.
        /// </summary>
        public static void EnsureAppIdFileForGame(string appId, string steamFolderName = "")
        {
            if (string.IsNullOrWhiteSpace(appId)) return;

            try
            {
                string? gameDir = GetGameDirectoryByAppId(appId, steamFolderName);

                // If not found yet, also try pre-creating in main library if steamFolderName is provided
                if (string.IsNullOrEmpty(gameDir) && !string.IsNullOrWhiteSpace(steamFolderName))
                {
                    string steamPath = GetSteamPath();
                    string mainCommon = Path.Combine(steamPath, "steamapps", "common");
                    if (Directory.Exists(mainCommon))
                    {
                        string candidate = Path.Combine(mainCommon, steamFolderName);
                        try
                        {
                            if (!Directory.Exists(candidate)) Directory.CreateDirectory(candidate);
                            WriteAppIdSafely(candidate, appId);
                        }
                        catch { }
                    }
                    return;
                }

                if (!string.IsNullOrEmpty(gameDir) && Directory.Exists(gameDir))
                {
                    WriteAppIdSafely(gameDir, appId);

                    // Check bin subfolders
                    string binDir = Path.Combine(gameDir, "bin");
                    if (Directory.Exists(binDir))
                    {
                        WriteAppIdSafely(binDir, appId);
                        foreach (var sub in Directory.GetDirectories(binDir))
                        {
                            WriteAppIdSafely(sub, appId);
                        }
                    }

                    // Check all 1st and 2nd level subdirectories that contain .exe
                    foreach (var sub in Directory.GetDirectories(gameDir))
                    {
                        try
                        {
                            if (Directory.GetFiles(sub, "*.exe").Length > 0)
                            {
                                WriteAppIdSafely(sub, appId);
                            }

                            foreach (var sub2 in Directory.GetDirectories(sub))
                            {
                                if (Directory.GetFiles(sub2, "*.exe").Length > 0)
                                {
                                    WriteAppIdSafely(sub2, appId);
                                }
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        public static void WriteAppIdSafely(string targetDir, string appId)
        {
            try
            {
                if (!Directory.Exists(targetDir)) return;
                string targetFile = Path.Combine(targetDir, "steam_appid.txt");
                if (!File.Exists(targetFile) || File.ReadAllText(targetFile).Trim() != appId)
                {
                    File.WriteAllText(targetFile, appId);
                }
            }
            catch { }
        }

        /// <summary>
        /// Scans all Steam libraries for installed games (via appmanifest_*.acf)
        /// and guarantees steam_appid.txt exists in each game directory and exe folders.
        /// Prevents games like American Truck Simulator / Euro Truck Simulator 2 from failing filesystem init.
        /// </summary>
        public static void EnsureAllInstalledSteamAppIdFiles()
        {
            try
            {
                var libraries = GetSteamLibraryFolders();
                var exePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var gameDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                try
                {
                    string steamPath = GetSteamPath();
                    string steamExe = Path.Combine(steamPath, "steam.exe");
                    if (File.Exists(steamExe)) exePaths.Add(steamExe);
                    if (Directory.Exists(steamPath)) gameDirs.Add(steamPath);
                }
                catch { }

                foreach (var lib in libraries)
                {
                    try
                    {
                        DirectoryInfo? steamappsDir = Directory.GetParent(lib);
                        if (steamappsDir == null || !steamappsDir.Exists) continue;

                        foreach (var acfFile in Directory.GetFiles(steamappsDir.FullName, "appmanifest_*.acf"))
                        {
                            try
                            {
                                string content = File.ReadAllText(acfFile);
                                var matchAppId = Regex.Match(content, @"""appid""\s+""(\d+)""", RegexOptions.IgnoreCase);
                                var matchDir = Regex.Match(content, @"""installdir""\s+""([^""]+)""", RegexOptions.IgnoreCase);

                                if (matchAppId.Success && matchDir.Success)
                                {
                                    string appId = matchAppId.Groups[1].Value;
                                    string installDirName = matchDir.Groups[1].Value;
                                    string gameDir = Path.Combine(lib, installDirName);

                                    if (Directory.Exists(gameDir))
                                    {
                                        gameDirs.Add(gameDir);
                                        WriteAppIdSafely(gameDir, appId);

                                        foreach (var f in Directory.GetFiles(gameDir, "*.exe", SearchOption.TopDirectoryOnly))
                                        {
                                            exePaths.Add(f);
                                        }

                                        string binDir = Path.Combine(gameDir, "bin");
                                        if (Directory.Exists(binDir))
                                        {
                                            WriteAppIdSafely(binDir, appId);
                                            foreach (var sub in Directory.GetDirectories(binDir))
                                            {
                                                WriteAppIdSafely(sub, appId);
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
                                                    WriteAppIdSafely(sub, appId);
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
                    catch { }
                }

                // Fix Windows Defender Controlled Folder Access & Exclusions
                // This resolves "The game filesystem failed to initialize, aborting now."
                FixDefenderAndControlledFolderAccess(exePaths, gameDirs);

                // Fix Documents permissions and ensure critical game directories exist
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
    }
}
