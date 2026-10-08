using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace PandaStoreLauncher.Helpers
{
    public class GitHubUpdateResult
    {
        public bool HasUpdate { get; set; }
        public string LatestVersion { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public string Changelog { get; set; } = string.Empty;
        public string AssetName { get; set; } = string.Empty;
    }

    public static class GitHubUpdateHelper
    {
        private const string Owner = "josemunoz32";
        private const string Repo = "tienda-panda-2.0";
        private static readonly HttpClient HttpClient = new HttpClient();

        static GitHubUpdateHelper()
        {
            HttpClient.DefaultRequestHeaders.UserAgent.ParseAdd("PandaStoreLauncher-AutoUpdater/2.4");
            HttpClient.Timeout = TimeSpan.FromSeconds(15);
        }

        /// <summary>
        /// Checks GitHub Releases API for new version.
        /// Target asset can be 'PandaStoreSetup.exe', 'PandaStoreLauncher.exe' or 'PandaStoreActivator.exe'.
        /// </summary>
        public static async Task<GitHubUpdateResult> CheckForUpdatesAsync(string currentVersion, string targetAsset = "PandaStoreSetup.exe")
        {
            try
            {
                string apiUrl = $"https://api.github.com/repos/{Owner}/{Repo}/releases/latest";
                HttpResponseMessage response = await HttpClient.GetAsync(apiUrl);

                if (!response.IsSuccessStatusCode)
                {
                    return new GitHubUpdateResult { HasUpdate = false };
                }

                string json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                string tagName = root.TryGetProperty("tag_name", out var tProp) ? tProp.GetString() ?? "" : "";
                string cleanTag = tagName.TrimStart('v', 'V').Trim();
                string changelog = root.TryGetProperty("body", out var bProp) ? bProp.GetString() ?? "" : "";

                if (string.IsNullOrWhiteSpace(cleanTag))
                {
                    return new GitHubUpdateResult { HasUpdate = false };
                }

                if (Version.TryParse(cleanTag, out Version? latestVer) &&
                    Version.TryParse(currentVersion.TrimStart('v', 'V').Trim(), out Version? curVer))
                {
                    if (latestVer > curVer)
                    {
                        string downloadUrl = string.Empty;
                        string assetFound = string.Empty;

                        if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var asset in assets.EnumerateArray())
                            {
                                string aName = asset.TryGetProperty("name", out var aProp) ? aProp.GetString() ?? "" : "";
                                string dUrl = asset.TryGetProperty("browser_download_url", out var dProp) ? dProp.GetString() ?? "" : "";

                                // Match target asset exact name, or fallback to any matching setup/exe
                                if (aName.Equals(targetAsset, StringComparison.OrdinalIgnoreCase))
                                {
                                    downloadUrl = dUrl;
                                    assetFound = aName;
                                    break;
                                }
                                else if (targetAsset == "PandaStoreSetup.exe" && aName.Contains("Setup", StringComparison.OrdinalIgnoreCase) && aName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                                {
                                    downloadUrl = dUrl;
                                    assetFound = aName;
                                }
                                else if (string.IsNullOrEmpty(downloadUrl) && aName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                                {
                                    downloadUrl = dUrl;
                                    assetFound = aName;
                                }
                            }
                        }

                        if (!string.IsNullOrEmpty(downloadUrl))
                        {
                            return new GitHubUpdateResult
                            {
                                HasUpdate = true,
                                LatestVersion = cleanTag,
                                DownloadUrl = downloadUrl,
                                Changelog = changelog,
                                AssetName = assetFound
                            };
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "GitHubUpdateHelper Error");
            }

            return new GitHubUpdateResult { HasUpdate = false };
        }
    }
}
