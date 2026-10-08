using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PandaStoreLauncher.Models
{
    public class LicenseModel
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("client_email")]
        public string ClientEmail { get; set; } = string.Empty;

        [JsonPropertyName("hwid")]
        public string? Hwid { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "active";

        [JsonPropertyName("license_type")]
        public string LicenseType { get; set; } = "permanent";

        [JsonPropertyName("expiry_date")]
        public string? ExpiryDate { get; set; }

        [JsonPropertyName("last_seen")]
        public string? LastSeen { get; set; }

        [JsonPropertyName("is_trial")]
        public bool IsTrial { get; set; } = false;

        [JsonPropertyName("trial_minutes")]
        public int TrialMinutes { get; set; } = 15;

        [JsonPropertyName("activated_at")]
        public string? ActivatedAt { get; set; }

        [JsonPropertyName("expires_at")]
        public string? ExpiresAt { get; set; }

        [JsonPropertyName("allowed_games")]
        public List<string> AllowedGames { get; set; } = new List<string>();

        /// <summary>
        /// Specific DLC AppIDs purchased for this license.
        /// If NULL: Legacy key (all DLCs unlocked by default, zero regression).
        /// If contains "*": Full DLC access.
        /// If empty: Only base game authorized, DLCs excluded.
        /// </summary>
        [JsonPropertyName("allowed_dlcs")]
        public List<string>? AllowedDlcs { get; set; } = null;

        public bool IsFullAccess => AllowedGames != null && AllowedGames.Contains("*");

        public bool IsLegacyKey => AllowedDlcs == null;
    }
}
