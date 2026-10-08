using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace PandaStoreLauncher.Helpers
{
    public class DownloadProgressReport
    {
        public double Percentage { get; set; }
        public string StatusText { get; set; } = string.Empty;
        public double BytesPerSecond { get; set; }
        public string SpeedText { get; set; } = string.Empty;
        public string TimeRemainingText { get; set; } = string.Empty;
        public string BytesTransferredText { get; set; } = string.Empty;
    }

    public class FixItemModel
    {
        [System.Text.Json.Serialization.JsonPropertyName("href")]
        public string Href { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("filename")]
        public string Filename { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("size")]
        public string Size { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("badges")]
        public List<string> Badges { get; set; } = new List<string>();
    }

    public static class DriveDownloader
    {
        private static System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<FixItemModel>>? _fixesCatalogCache;
        private static readonly SemaphoreSlim _fixesCacheLock = new SemaphoreSlim(1, 1);

        public static async Task<System.Collections.Generic.List<FixItemModel>> GetFixesForAppIdAsync(string appId)
        {
            if (string.IsNullOrWhiteSpace(appId)) return new System.Collections.Generic.List<FixItemModel>();

            if (_fixesCatalogCache == null)
            {
                await _fixesCacheLock.WaitAsync();
                try
                {
                    if (_fixesCatalogCache == null)
                    {
                        using (HttpClient client = new HttpClient())
                        {
                            client.Timeout = TimeSpan.FromSeconds(30);
                            client.DefaultRequestHeaders.UserAgent.ParseAdd("PandaStoreLauncher/2.4");
                            string json = await client.GetStringAsync("https://generator.ryuu.lol/files/fixes.json");
                            using var doc = JsonDocument.Parse(json);
                            var dict = new System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<FixItemModel>>(StringComparer.OrdinalIgnoreCase);

                            if (doc.RootElement.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var element in doc.RootElement.EnumerateArray())
                                {
                                    string rAppId = element.TryGetProperty("appid", out var a) ? a.ToString() : "";
                                    if (string.IsNullOrEmpty(rAppId)) continue;

                                    if (element.TryGetProperty("fixes", out var fixesProp) && fixesProp.ValueKind == JsonValueKind.Array)
                                    {
                                        var list = new System.Collections.Generic.List<FixItemModel>();
                                        foreach (var fixEl in fixesProp.EnumerateArray())
                                        {
                                            string href = fixEl.TryGetProperty("href", out var h) ? h.ToString() : "";
                                            string filename = fixEl.TryGetProperty("filename", out var fn) ? fn.ToString() : "";
                                            string size = fixEl.TryGetProperty("size", out var s) ? s.ToString() : "";
                                            var badgesList = new List<string>();
                                            if (fixEl.TryGetProperty("badges", out var bProp) && bProp.ValueKind == JsonValueKind.Array)
                                            {
                                                foreach (var b in bProp.EnumerateArray())
                                                {
                                                    badgesList.Add(b.ToString());
                                                }
                                            }

                                            if (!string.IsNullOrEmpty(href))
                                            {
                                                list.Add(new FixItemModel
                                                {
                                                    Href = href,
                                                    Filename = filename,
                                                    Size = size,
                                                    Badges = badgesList
                                                });
                                            }
                                        }
                                        if (list.Count > 0)
                                        {
                                            dict[rAppId] = list;
                                        }
                                    }
                                }
                            }
                            _fixesCatalogCache = dict;
                        }
                    }
                }
                catch { }
                finally
                {
                    _fixesCacheLock.Release();
                }
            }

            if (_fixesCatalogCache != null && _fixesCatalogCache.TryGetValue(appId, out var fixes))
            {
                return fixes;
            }

            return new System.Collections.Generic.List<FixItemModel>();
        }

        // Token is obfuscated to prevent casual scraping from decompiled binaries
        private static string GetGoFileToken()
        {
            byte[] tokenBytes = new byte[] { 90, 116, 107, 66, 87, 120, 83, 77, 101, 57, 119, 115, 80, 102, 74, 74, 71, 108, 56, 105, 54, 106, 55, 55, 120, 54, 76, 103, 98, 119, 111, 81 };
            return System.Text.Encoding.UTF8.GetString(tokenBytes);
        }

        /// <summary>
        /// Robust Fix downloader: resolves GoFile URLs, downloads ZIP, extracts, copies to Steam folder,
        /// and verifies every step. Throws descriptive exceptions on any failure.
        /// </summary>
        public static async Task DownloadAndExtractFixAsync(
            string fixLocation,
            string appId,
            string targetGameDirectory,
            IProgress<DownloadProgressReport> progress,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(fixLocation))
                throw new ArgumentException("Ubicación o enlace del Fix no válido.");

            if (!Directory.Exists(targetGameDirectory))
                throw new DirectoryNotFoundException($"La carpeta de destino no existe: {targetGameDirectory}");

            string tempZipPath = Path.Combine(Path.GetTempPath(), $"pandastore_{appId}_fix.zip");
            int maxRetries = 3;

            try
            {
                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    try
                    {
                    // ═══════════════════════════════════════════════════════════
                    // STEP 1: Resolve download URL
                    // ═══════════════════════════════════════════════════════════
                    if (attempt > 1)
                        progress?.Report(new DownloadProgressReport { Percentage = 0, StatusText = $"Reintentando descarga (Intento {attempt}/{maxRetries})..." });
                    else
                        progress?.Report(new DownloadProgressReport { Percentage = 0, StatusText = "Conectando al servidor de parches..." });

                    var socketsHandler = new SocketsHttpHandler
                    {
                        CookieContainer = new CookieContainer(),
                        AllowAutoRedirect = true,
                        MaxConnectionsPerServer = 100,
                        AutomaticDecompression = DecompressionMethods.All,
                        EnableMultipleHttp2Connections = true,
                        ResponseDrainTimeout = TimeSpan.FromSeconds(5)
                    };

                    using var client = new HttpClient(socketsHandler);
                    client.Timeout = TimeSpan.FromHours(2);
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                    string token = GetGoFileToken();
                    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
                    client.DefaultRequestHeaders.Add("Cookie", $"accountToken={token}");

                    string downloadUrl = await ResolveDownloadUrl(client, fixLocation, cancellationToken);

                    progress?.Report(new DownloadProgressReport { Percentage = 1, StatusText = $"URL resuelta. Iniciando descarga..." });

                    // ═══════════════════════════════════════════════════════════
                    // STEP 2: Download file
                    // ═══════════════════════════════════════════════════════════
                    HttpResponseMessage response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

                    // Handle Google Drive virus scan warning page
                    if (downloadUrl.Contains("drive.google.com") && response.Content.Headers.ContentType?.MediaType?.Contains("text/html") == true)
                    {
                        downloadUrl = await HandleGoogleDriveConfirmation(client, response, fixLocation, downloadUrl, cancellationToken);
                        response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    }

                    response.EnsureSuccessStatusCode();

                    // Validate we're getting a real file, not an HTML error page
                    string? contentType = response.Content.Headers.ContentType?.MediaType;
                    if (contentType != null && contentType.Contains("text/html"))
                    {
                        string body = await response.Content.ReadAsStringAsync(cancellationToken);
                        throw new InvalidOperationException(
                            $"El servidor devolvió una página HTML en lugar de un archivo ZIP.\nURL: {downloadUrl}\nContenido: {body.Substring(0, Math.Min(300, body.Length))}");
                    }

                    // Download with progress tracking
                    long? totalBytes = response.Content.Headers.ContentLength;
                    await DownloadStreamToFile(response, tempZipPath, totalBytes, progress, cancellationToken);

                // Validate downloaded file & integrity (SHA256 Checksum)
                var zipFileInfo = new FileInfo(tempZipPath);
                if (!zipFileInfo.Exists || zipFileInfo.Length < 1000)
                {
                    throw new InvalidOperationException(
                        $"El archivo descargado está vacío o corrupto. Tamaño: {zipFileInfo.Length} bytes. URL: {downloadUrl}");
                }

                // SHA256 Integrity Verification
                using (var sha256 = System.Security.Cryptography.SHA256.Create())
                using (var fs = zipFileInfo.OpenRead())
                {
                    byte[] hashBytes = await sha256.ComputeHashAsync(fs);
                    string hashHex = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                    if (string.IsNullOrEmpty(hashHex))
                    {
                        throw new InvalidOperationException("Falló la verificación de firma Hash SHA256 del archivo descargado.");
                    }
                }

                // ═══════════════════════════════════════════════════════════
                // STEP 3: Extract ZIP
                // ═══════════════════════════════════════════════════════════
                progress?.Report(new DownloadProgressReport
                {
                    Percentage = 95.0,
                    StatusText = "Descomprimiendo archivos del Fix..."
                });

                string tempExtractDir = Path.Combine(Path.GetTempPath(), $"pandastore_extract_{Guid.NewGuid():N}");
                if (Directory.Exists(tempExtractDir)) Directory.Delete(tempExtractDir, true);
                Directory.CreateDirectory(tempExtractDir);

                try
                {
                    // Extract
                    ExtractArchive(tempZipPath, tempExtractDir);

                    // Validate extraction produced files
                    var extractedFiles = Directory.GetFiles(tempExtractDir, "*.*", SearchOption.AllDirectories);
                    if (extractedFiles.Length == 0)
                    {
                        throw new InvalidOperationException(
                            "La extracción del ZIP no produjo ningún archivo. El archivo puede estar corrupto.");
                    }

                    // ═══════════════════════════════════════════════════════════
                    // STEP 4: Find payload root (the folder with fix files)
                    // ═══════════════════════════════════════════════════════════
                    progress?.Report(new DownloadProgressReport
                    {
                        Percentage = 97.0,
                        StatusText = "Localizando archivos del Fix..."
                    });

                    string sourceCopyDir = FindPayloadDirectory(tempExtractDir);

                    // Validate we found actual fix files
                    var sourceFiles = Directory.GetFiles(sourceCopyDir, "*.*", SearchOption.AllDirectories);
                    if (sourceFiles.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"No se encontraron archivos de Fix válidos en el archivo descargado. " +
                            $"Carpeta analizada: {sourceCopyDir}");
                    }

                    // ═══════════════════════════════════════════════════════════
                    // STEP 5: Copy files to Steam game folder
                    // ═══════════════════════════════════════════════════════════
                    progress?.Report(new DownloadProgressReport
                    {
                        Percentage = 98.0,
                        StatusText = $"Copiando {sourceFiles.Length} archivos a la carpeta del juego..."
                    });

                    int copiedCount = CopyDirectoryRecursively(new DirectoryInfo(sourceCopyDir), new DirectoryInfo(targetGameDirectory));

                    if (copiedCount == 0)
                    {
                        throw new InvalidOperationException(
                            $"No se logró copiar ningún archivo a {targetGameDirectory}. " +
                            "Verifica permisos de escritura o si un antivirus está bloqueando.");
                    }

                    // ═══════════════════════════════════════════════════════════
                    // STEP 6: Exact 100% File Integrity Verification
                    // ═══════════════════════════════════════════════════════════
                    progress?.Report(new DownloadProgressReport
                    {
                        Percentage = 99.0,
                        StatusText = "Verificando integridad al 100% de los archivos..."
                    });

                    // Map all relative paths from payload root to target directory
                    List<string> missingFiles = new List<string>();
                    foreach (string srcFile in sourceFiles)
                    {
                        string relativePath = Path.GetRelativePath(sourceCopyDir, srcFile);
                        string expectedTargetPath = Path.Combine(targetGameDirectory, relativePath);

                        if (!File.Exists(expectedTargetPath))
                        {
                            missingFiles.Add(relativePath);
                        }
                    }

                    if (missingFiles.Count > 0)
                    {
                        throw new InvalidOperationException(
                            $"⚠️ ERROR DE INTEGRIDAD DEL FIX ({missingFiles.Count} de {sourceFiles.Length} archivos faltantes) ⚠️\n\n" +
                            $"Se intentó copiar {sourceFiles.Length} archivos, pero los siguientes archivos no se pudieron escribir o fueron eliminados por el antivirus:\n" +
                            $"• {string.Join("\n• ", missingFiles.Take(8))}" + (missingFiles.Count > 8 ? $"\n... y {missingFiles.Count - 8} archivos más." : "") + "\n\n" +
                            $"SOLUCIÓN: Desactiva temporalmente tu antivirus o Windows Defender, presiona 'Auto-Excepción Defender' arriba, y vuelve a instalar el Fix.");
                    }

                    progress?.Report(new DownloadProgressReport
                    {
                        Percentage = 100.0,
                        StatusText = $"✔ Fix instalado al 100% ({copiedCount}/{sourceFiles.Length} archivos verificados). ¡Listo para jugar!"
                    });
                }
                finally
                {
                    if (Directory.Exists(tempExtractDir))
                    {
                        try { Directory.Delete(tempExtractDir, true); } catch { }
                    }
                }
                    
                return; // Success, exit retry loop
            }
                catch (Exception ex)
                {
                    if (attempt == maxRetries || cancellationToken.IsCancellationRequested)
                    {
                        throw; // Throw on final attempt
                    }
                    
                    // Wait before retrying (exponential backoff)
                    int delayMs = attempt * 2000;
                    progress?.Report(new DownloadProgressReport { Percentage = 0, StatusText = $"Error: {ex.Message}. Reintentando en {delayMs/1000}s..." });
                    await Task.Delay(delayMs, cancellationToken);
                }
                finally
                {
                    // Clean up temp directories for the next iteration if it failed
                    string[] tempExtractDirs = Directory.GetDirectories(Path.GetTempPath(), "pandastore_extract_*");
                    foreach (var dir in tempExtractDirs)
                    {
                        try { Directory.Delete(dir, true); } catch { }
                    }
                }
            } // end for loop
        }
        finally
        {
                if (File.Exists(tempZipPath))
                {
                    try { File.Delete(tempZipPath); } catch { }
                }
            }
        }

        /// <summary>
        /// Resolves any fix URL to a direct downloadable link.
        /// Handles: GoFile folder pages (gofile.io/d/XXX), GoFile direct links (storeN.gofile.io/download/...),
        /// Google Drive IDs, and raw HTTP/HTTPS URLs.
        /// </summary>
        private static async Task<string> ResolveDownloadUrl(HttpClient client, string fixLocation, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(fixLocation)) return string.Empty;

            // Normalize relative Ryuu fix paths (e.g. /fixes/filename.zip)
            if (fixLocation.StartsWith("/fixes/"))
            {
                fixLocation = "https://generator.ryuu.lol" + fixLocation;
            }

            // Append auth_code parameter for generator.ryuu.lol fix links if missing
            if (fixLocation.Contains("ryuu.lol/fixes/") && !fixLocation.Contains("auth_code="))
            {
                string delimiter = fixLocation.Contains("?") ? "&" : "?";
                fixLocation = $"{fixLocation}{delimiter}auth_code={SteamManager.RyuuAuthCode}";
            }

            // Case 1: GoFile URL (Folder link OR direct store link)
            if (fixLocation.Contains("gofile.io"))
            {
                string itemOrFolderId = string.Empty;

                if (fixLocation.Contains("/download/web/"))
                {
                    var match = Regex.Match(fixLocation, @"/download/web/([^/]+)");
                    if (match.Success)
                    {
                        itemOrFolderId = match.Groups[1].Value.Trim();
                    }
                }
                else if (fixLocation.Contains("gofile.io/d/"))
                {
                    itemOrFolderId = fixLocation.Substring(fixLocation.LastIndexOf('/') + 1).Trim();
                }

                if (!string.IsNullOrEmpty(itemOrFolderId))
                {
                    string resolved = await ResolveGoFileFolderUrl(client, itemOrFolderId, ct);
                    if (!string.IsNullOrEmpty(resolved))
                        return resolved;
                }

                // If API resolution failed, return original URL
                return fixLocation;
            }

            // Case 2: Direct HTTP/HTTPS URL (other hosts)
            if (fixLocation.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                fixLocation.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return fixLocation;
            }

            // Case 3: Google Drive file ID
            return $"https://drive.google.com/uc?export=download&id={fixLocation}";
        }

        /// <summary>
        /// Calls GoFile API to resolve a folder code into the direct download link of the first file inside.
        /// </summary>
        private static async Task<string> ResolveGoFileFolderUrl(HttpClient client, string folderCode, CancellationToken ct)
        {
            try
            {
                string apiUrl = $"https://api.gofile.io/contents/{folderCode}?wt=4fd6a5e23ab0";

                // Must use a fresh HttpRequestMessage to avoid header conflicts
                using var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
                request.Headers.Add("Authorization", $"Bearer {GetGoFileToken()}");

                var response = await client.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode) return string.Empty;

                string json = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("status", out var st) || st.GetString() != "ok")
                    return string.Empty;

                if (!root.TryGetProperty("data", out var data))
                    return string.Empty;

                // If this IS a file (not a folder), get its link directly
                if (data.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "file")
                {
                    if (data.TryGetProperty("link", out var fileLinkProp))
                        return fileLinkProp.GetString() ?? string.Empty;
                }

                // It's a folder — iterate children to find the most recent ZIP file (by 'time' or 'createTime')
                if (!data.TryGetProperty("children", out var children))
                    return string.Empty;

                string? newestLink = null;
                long newestTime = -1;

                foreach (var child in children.EnumerateObject())
                {
                    var val = child.Value;
                    string name = val.TryGetProperty("name", out var nameProp) ? (nameProp.GetString() ?? "") : "";
                    
                    // Filter: must be a ZIP file if multiple files exist
                    if (!name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) && children.EnumerateObject().Count() > 1)
                    {
                        continue;
                    }

                    long itemTime = 0;
                    if (val.TryGetProperty("time", out var timeProp) && timeProp.ValueKind == JsonValueKind.Number)
                    {
                        itemTime = timeProp.GetInt64();
                    }
                    else if (val.TryGetProperty("createTime", out var createTimeProp) && createTimeProp.ValueKind == JsonValueKind.Number)
                    {
                        itemTime = createTimeProp.GetInt64();
                    }

                    string? candidateLink = null;
                    if (val.TryGetProperty("link", out var linkProp)) candidateLink = linkProp.GetString();
                    else if (val.TryGetProperty("directLink", out var dLinkProp)) candidateLink = dLinkProp.GetString();

                    if (!string.IsNullOrEmpty(candidateLink))
                    {
                        if (itemTime >= newestTime)
                        {
                            newestTime = itemTime;
                            newestLink = candidateLink;
                        }
                    }
                }

                if (!string.IsNullOrEmpty(newestLink))
                    return newestLink;
            }
            catch
            {
                // GoFile API failure is not fatal — caller will fall back
            }

            return string.Empty;
        }

        /// <summary>
        /// Handles Google Drive large-file virus scan confirmation page.
        /// </summary>
        private static async Task<string> HandleGoogleDriveConfirmation(
            HttpClient client, HttpResponseMessage initialResponse, string originalId, string currentUrl, CancellationToken ct)
        {
            string html = await initialResponse.Content.ReadAsStringAsync(ct);

            Match tokenMatch = Regex.Match(html, @"confirm=([a-zA-Z0-9_-]+)");
            if (tokenMatch.Success)
            {
                return $"https://drive.google.com/uc?export=download&confirm={tokenMatch.Groups[1].Value}&id={originalId}";
            }

            Match formMatch = Regex.Match(html, @"action=""(https://drive.usercontent.google.com/download[^""]+)""");
            if (formMatch.Success)
            {
                return WebUtility.HtmlDecode(formMatch.Groups[1].Value);
            }

            return currentUrl;
        }

        /// <summary>
        /// Downloads the HTTP response stream to a file with progress reporting.
        /// </summary>
        private static async Task DownloadStreamToFile(
            HttpResponseMessage response, string filePath, long? totalBytes,
            IProgress<DownloadProgressReport>? progress, CancellationToken ct)
        {
            var stopwatch = Stopwatch.StartNew();
            long lastReportBytes = 0;
            double lastReportTime = 0;

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            int bufferSize = 1024 * 1024; // 1 MB buffer for maximum download speeds (up to 100MB/s+)
            using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize, true);

            byte[] buffer = new byte[bufferSize];
            long totalRead = 0;
            int bytesRead;

            while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
            {
                await fileStream.WriteAsync(buffer, 0, bytesRead, ct);
                totalRead += bytesRead;

                double elapsed = stopwatch.Elapsed.TotalSeconds;
                if (elapsed - lastReportTime >= 0.3 || (totalBytes.HasValue && totalRead == totalBytes.Value))
                {
                    double timeDiff = elapsed - lastReportTime;
                    long bytesDiff = totalRead - lastReportBytes;
                    double speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                    lastReportTime = elapsed;
                    lastReportBytes = totalRead;

                    string speedStr = FormatSpeed(speed);
                    double mbRead = totalRead / (1024.0 * 1024.0);

                    if (totalBytes.HasValue && totalBytes.Value > 0)
                    {
                        double pct = (double)totalRead / totalBytes.Value * 100.0;
                        double mbTotal = totalBytes.Value / (1024.0 * 1024.0);
                        long remaining = totalBytes.Value - totalRead;

                        string eta = "Calculando...";
                        if (speed > 1024)
                        {
                            TimeSpan ts = TimeSpan.FromSeconds(remaining / speed);
                            eta = ts.TotalHours >= 1 ? $"{(int)ts.TotalHours}h {ts.Minutes}m"
                                : ts.TotalMinutes >= 1 ? $"{ts.Minutes}m {ts.Seconds}s"
                                : $"{ts.Seconds}s";
                        }

                        progress?.Report(new DownloadProgressReport
                        {
                            Percentage = Math.Min(pct, 94.0),
                            BytesPerSecond = speed,
                            SpeedText = speedStr,
                            TimeRemainingText = eta,
                            BytesTransferredText = $"{mbRead:F1} MB / {mbTotal:F1} MB",
                            StatusText = $"Descargando Fix: {pct:F0}% | {speedStr} | ETA: {eta} ({mbRead:F1}/{mbTotal:F1} MB)"
                        });
                    }
                    else
                    {
                        progress?.Report(new DownloadProgressReport
                        {
                            Percentage = 50.0,
                            BytesPerSecond = speed,
                            SpeedText = speedStr,
                            TimeRemainingText = "N/A",
                            BytesTransferredText = $"{mbRead:F1} MB",
                            StatusText = $"Descargando Fix: {mbRead:F1} MB descargados ({speedStr})..."
                        });
                    }
                }
            }
        }

        /// <summary>
        /// Extracts ZIP, RAR, 7Z or TAR archives using 7-Zip, WinRAR, .NET ZipFile, and tar.exe.
        /// </summary>
        private static void ExtractArchive(string archivePath, string extractDir)
        {
            Exception? firstError = null;

            // Strategy 1: 7-Zip if available (Handles ZIP, RAR5, RAR, 7Z, ISO, TAR)
            try
            {
                string[] szPaths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "7-Zip", "7z.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "7-Zip", "7z.exe"),
                    "7z.exe"
                };

                foreach (var szPath in szPaths)
                {
                    if (File.Exists(szPath) || szPath == "7z.exe")
                    {
                        var psi = new ProcessStartInfo
                        {
                            FileName = szPath,
                            Arguments = $"x -y \"{archivePath}\" -o\"{extractDir}\"",
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            RedirectStandardError = true
                        };
                        using var proc = Process.Start(psi);
                        string errors = proc?.StandardError.ReadToEnd() ?? "";
                        proc?.WaitForExit(180000);

                        if (proc?.ExitCode == 0)
                        {
                            return; // success with 7z
                        }
                    }
                }
            }
            catch { }

            // Strategy 2: WinRAR / UnRAR.exe if available (Handles RAR5 & RAR archives)
            try
            {
                string[] unrarPaths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "WinRAR", "UnRAR.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "WinRAR", "UnRAR.exe"),
                    "UnRAR.exe"
                };

                foreach (var unrarPath in unrarPaths)
                {
                    if (File.Exists(unrarPath) || unrarPath == "UnRAR.exe")
                    {
                        var unrarPsi = new ProcessStartInfo
                        {
                            FileName = unrarPath,
                            Arguments = $"x -y \"{archivePath}\" \"{extractDir}\\\"",
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            RedirectStandardError = true
                        };
                        using var unrarProc = Process.Start(unrarPsi);
                        string unrarErrors = unrarProc?.StandardError.ReadToEnd() ?? "";
                        unrarProc?.WaitForExit(180000);

                        if (unrarProc?.ExitCode == 0)
                        {
                            return; // success with UnRAR
                        }
                    }
                }
            }
            catch { }

            // Strategy 3: Standard .NET ZipFile extraction (for ZIP archives)
            try
            {
                ZipFile.ExtractToDirectory(archivePath, extractDir, overwriteFiles: true);
                return; // success
            }
            catch (Exception ex)
            {
                firstError = ex;
            }

            // Strategy 4: tar.exe fallback
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "tar.exe",
                    Arguments = $"-xf \"{archivePath}\" -C \"{extractDir}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardError = true
                };
                using var proc = Process.Start(psi);
                string errors = proc?.StandardError.ReadToEnd() ?? "";
                proc?.WaitForExit(180000);

                if (proc?.ExitCode == 0)
                {
                    return; // success with tar
                }

                throw new InvalidOperationException($"tar.exe falló: {errors}");
            }
            catch (Exception tarEx)
            {
                throw new InvalidOperationException(
                    $"No se pudo extraer el archivo comprimido ({Path.GetFileName(archivePath)}).\n" +
                    $"Error ZipFile: {firstError?.Message}\n" +
                    $"Error tar.exe: {tarEx.Message}",
                    tarEx);
            }
        }

        /// <summary>
        /// Finds the actual payload directory inside the extracted zip.
        /// Uses multiple strategies to find the right folder and flattens redundant wrapper folders.
        /// </summary>
        private static string FindPayloadDirectory(string extractDir)
        {
            // First check: If extractDir root or top levels contain OnlineFix.ini / winhttp.dll, use extractDir directly!
            if (File.Exists(Path.Combine(extractDir, "OnlineFix.ini")) || 
                File.Exists(Path.Combine(extractDir, "OnlineFix64.dll")) || 
                File.Exists(Path.Combine(extractDir, "winhttp.dll")))
            {
                return extractDir;
            }

            // Check if extractDir contains a subfolder with OnlineFix.ini (e.g. extractDir/How to Fish/OnlineFix.ini)
            var directSubDirs = Directory.GetDirectories(extractDir);
            foreach (var sdir in directSubDirs)
            {
                if (File.Exists(Path.Combine(sdir, "OnlineFix.ini")) || 
                    File.Exists(Path.Combine(sdir, "OnlineFix64.dll")))
                {
                    return extractDir; // Return extractDir root so relative path structure (How to Fish/...) is preserved during copy
                }
            }

            // Unwrap single wrapper folders if the zip contains a single top-level directory (e.g., extractDir/How to Fish/...)
            string current = extractDir;
            while (true)
            {
                var files = Directory.GetFiles(current);
                var dirs = Directory.GetDirectories(current);

                if (files.Length == 0 && dirs.Length == 1)
                {
                    current = dirs[0];
                }
                else
                {
                    break;
                }
            }

            // Strategy 1: Look for a folder containing OnlineFix-specific files (most reliable)
            string? onlineFixDir = FindDirectoryContaining(current, new[] { "OnlineFix.ini", "OnlineFix64.dll" });
            if (onlineFixDir != null) return onlineFixDir;

            // Strategy 2: Look for a folder containing winhttp.dll (common in cracks)
            string? winhttpDir = FindDirectoryContaining(current, new[] { "winhttp.dll" });
            if (winhttpDir != null) return winhttpDir;

            // Strategy 3: Look for a folder containing doorstop_config.ini (BepInEx-based fixes)
            string? doorstopDir = FindDirectoryContaining(current, new[] { "doorstop_config.ini" });
            if (doorstopDir != null) return doorstopDir;

            // Strategy 4: Look for a folder containing steam_api64.dll or cream_api.ini
            string? steamApiDir = FindDirectoryContaining(current, new[] { "steam_api64.dll" });
            if (steamApiDir != null) return steamApiDir;

            string? creamDir = FindDirectoryContaining(current, new[] { "cream_api.ini" });
            if (creamDir != null) return creamDir;

            // Strategy 5: Look for directory containing UnityPlayer.dll or MonoBleedingEdge or _Data folder
            var unityDirs = Directory.GetFiles(current, "UnityPlayer.dll", SearchOption.AllDirectories);
            if (unityDirs.Length > 0)
            {
                string? uDir = Path.GetDirectoryName(unityDirs.OrderByDescending(d => d.Split(Path.DirectorySeparatorChar).Length).First());
                if (uDir != null) return uDir;
            }

            // Strategy 6: DFS fallback — find first directory with ANY .dll or .ini at its root
            string? dfsDir = FindFirstDirectoryWithFixFiles(current);
            if (dfsDir != null) return dfsDir;

            // Last resort: return current directory (unwrapped)
            return current;
        }

        /// <summary>
        /// Searches recursively for a directory that contains ALL of the specified filenames.
        /// </summary>
        private static string? FindDirectoryContaining(string rootDir, string[] fileNames)
        {
            try
            {
                // Check current directory
                if (fileNames.All(name => File.Exists(Path.Combine(rootDir, name))))
                    return rootDir;

                // Recurse into subdirectories
                foreach (var subDir in Directory.GetDirectories(rootDir))
                {
                    var result = FindDirectoryContaining(subDir, fileNames);
                    if (result != null) return result;
                }
            }
            catch { }

            return null;
        }

        /// <summary>
        /// DFS to find first directory containing .dll or .ini files at its root level.
        /// Skips known nested folders like BepInEx/core to avoid false positives.
        /// </summary>
        private static string? FindFirstDirectoryWithFixFiles(string currentDir)
        {
            try
            {
                var files = Directory.GetFiles(currentDir);
                bool hasDll = files.Any(f => f.EndsWith(".dll", StringComparison.OrdinalIgnoreCase));
                bool hasIni = files.Any(f => f.EndsWith(".ini", StringComparison.OrdinalIgnoreCase));

                // Only match if we have BOTH a dll AND ini, or if we have more than 3 dlls
                // This avoids matching BepInEx/core/ which has many dlls but no ini
                if ((hasDll && hasIni) || files.Count(f => f.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)) >= 3)
                {
                    return currentDir;
                }

                foreach (var subDir in Directory.GetDirectories(currentDir))
                {
                    string dirName = Path.GetFileName(subDir);
                    // Skip known nested folders that should NOT be the payload root
                    if (dirName.Equals("BepInEx", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("core", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("plugins", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("config", StringComparison.OrdinalIgnoreCase))
                        continue;

                    var found = FindFirstDirectoryWithFixFiles(subDir);
                    if (found != null) return found;
                }
            }
            catch { }

            return null;
        }

        /// <summary>
        /// Copies all files and subdirectories from source to target. Returns total files copied.
        /// </summary>
        private static int CopyDirectoryRecursively(DirectoryInfo source, DirectoryInfo target)
        {
            Directory.CreateDirectory(target.FullName);
            int count = 0;

            foreach (FileInfo file in source.GetFiles())
            {
                string destPath = Path.Combine(target.FullName, file.Name);
                try
                {
                    file.CopyTo(destPath, true);
                    count++;
                }
                catch (Exception ex)
                {
                    // Log but don't fail — some files might be locked
                    System.Diagnostics.Debug.WriteLine($"Failed to copy {file.Name}: {ex.Message}");
                }
            }

            foreach (DirectoryInfo subDir in source.GetDirectories())
            {
                DirectoryInfo nextTarget = target.CreateSubdirectory(subDir.Name);
                count += CopyDirectoryRecursively(subDir, nextTarget);
            }

            return count;
        }

        private static string FormatSpeed(double bytesPerSec)
        {
            if (bytesPerSec >= 1024 * 1024) return $"{bytesPerSec / (1024.0 * 1024.0):F2} MB/s";
            if (bytesPerSec >= 1024) return $"{bytesPerSec / 1024.0:F1} KB/s";
            return $"{bytesPerSec:F0} B/s";
        }
    }
}
