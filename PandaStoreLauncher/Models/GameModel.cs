using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;
using System.Windows;

namespace PandaStoreLauncher.Models
{
    public class ManifestFileModel
    {
        [JsonPropertyName("filename")]
        public string Filename { get; set; } = string.Empty;

        [JsonPropertyName("content_b64")]
        public string ContentB64 { get; set; } = string.Empty;
    }

    public class DlcModel : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        [JsonPropertyName("app_id")]
        public string AppId { get; set; } = string.Empty;

        private string _name = string.Empty;
        [JsonPropertyName("name")]
        public string Name
        {
            get
            {
                if (!string.IsNullOrEmpty(_name) && (_name.Contains("'name':") || _name.Contains("\"name\":")))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(_name, @"['""]name['""]\s*:\s*['""]([^'""]+)['""]");
                    if (match.Success) return match.Groups[1].Value.Trim();
                }
                return _name;
            }
            set => _name = value;
        }

        [JsonPropertyName("price_clp")]
        public int PriceClp { get; set; } = 1000;

        [JsonIgnore]
        public string HeaderImageUrl => !string.IsNullOrEmpty(AppId)
            ? $"https://cdn.cloudflare.steamstatic.com/steam/apps/{AppId}/header.jpg"
            : "pack://application:,,,/Assets/miicono.png";

        private bool _isOwned = false;
        [JsonIgnore]
        public bool IsOwned
        {
            get => _isOwned;
            set
            {
                if (_isOwned != value)
                {
                    _isOwned = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(StatusBadgeText));
                    OnPropertyChanged(nameof(StatusBadgeColor));
                    OnPropertyChanged(nameof(PurchaseControlVisibility));
                    OnPropertyChanged(nameof(OwnedBadgeVisibility));
                }
            }
        }

        private bool _isSelectedForPurchase = false;
        [JsonIgnore]
        public bool IsSelectedForPurchase
        {
            get => _isSelectedForPurchase;
            set
            {
                if (_isSelectedForPurchase != value)
                {
                    _isSelectedForPurchase = value;
                    OnPropertyChanged();
                }
            }
        }

        [JsonIgnore]
        public string StatusBadgeText => IsOwned ? "✔ En tu biblioteca" : "$1.000 CLP";

        [JsonIgnore]
        public string StatusBadgeColor => IsOwned ? "#10B981" : "#F59E0B";

        [JsonIgnore]
        public Visibility PurchaseControlVisibility => IsOwned ? Visibility.Collapsed : Visibility.Visible;

        [JsonIgnore]
        public Visibility OwnedBadgeVisibility => IsOwned ? Visibility.Visible : Visibility.Collapsed;
    }

    public class GameModel : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        [JsonPropertyName("app_id")]
        public string AppId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("steam_folder_name")]
        public string SteamFolderName { get; set; } = string.Empty;

        [JsonPropertyName("lua_content")]
        public string LuaContent { get; set; } = string.Empty;

        [JsonPropertyName("manifest_files")]
        public List<ManifestFileModel>? ManifestFiles { get; set; }

        [JsonPropertyName("fix_drive_id")]
        public string FixDriveId { get; set; } = string.Empty;

        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;

        // DLCs Catalog
        private ObservableCollection<DlcModel> _dlcs = new ObservableCollection<DlcModel>();
        [JsonPropertyName("dlcs")]
        public ObservableCollection<DlcModel> Dlcs
        {
            get => _dlcs;
            set
            {
                _dlcs = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(HasDlcs));
                OnPropertyChanged(nameof(DlcButtonText));
                OnPropertyChanged(nameof(DlcButtonVisibility));
            }
        }

        [JsonIgnore]
        public bool HasDlcs => Dlcs != null && Dlcs.Count > 0;

        private bool _isDlcDrawerOpen = false;
        [JsonIgnore]
        public bool IsDlcDrawerOpen
        {
            get => _isDlcDrawerOpen;
            set
            {
                if (_isDlcDrawerOpen != value)
                {
                    _isDlcDrawerOpen = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(DlcDrawerVisibility));
                    OnPropertyChanged(nameof(DlcToggleIcon));
                }
            }
        }

        [JsonIgnore]
        public Visibility DlcDrawerVisibility => IsDlcDrawerOpen ? Visibility.Visible : Visibility.Collapsed;

        [JsonIgnore]
        public string DlcToggleIcon => IsDlcDrawerOpen ? "▲" : "▼";

        [JsonIgnore]
        public string DlcButtonText
        {
            get
            {
                if (Dlcs == null || Dlcs.Count == 0) return string.Empty;
                int unowned = Dlcs.Count(d => !d.IsOwned);
                if (unowned > 0)
                    return $"🎁 DLCs ({unowned} disponibles) {DlcToggleIcon}";
                return $"🎁 DLCs ({Dlcs.Count} en biblioteca) {DlcToggleIcon}";
            }
        }

        [JsonIgnore]
        public Visibility DlcButtonVisibility => (IsAuthorizedForClient && HasDlcs) ? Visibility.Visible : Visibility.Collapsed;

        public void RefreshDlcOwnership(List<string>? allowedDlcs, bool isFullAccess = false)
        {
            if (Dlcs == null || Dlcs.Count == 0) return;

            // Legacy keys (allowedDlcs is null) or Full Access keys unlock ALL DLCs with zero restrictions
            bool unlockAll = isFullAccess || allowedDlcs == null || allowedDlcs.Contains("*");

            HashSet<string>? allowedSet = null;
            if (!unlockAll && allowedDlcs != null)
            {
                allowedSet = new HashSet<string>(allowedDlcs, StringComparer.OrdinalIgnoreCase);
            }

            foreach (var dlc in Dlcs)
            {
                if (unlockAll)
                {
                    dlc.IsOwned = true;
                }
                else if (allowedSet != null)
                {
                    dlc.IsOwned = allowedSet.Contains(dlc.AppId);
                }
                else
                {
                    dlc.IsOwned = false;
                }
            }

            OnPropertyChanged(nameof(DlcButtonText));
        }

        // Cover Image URL from Steam CDN (header.jpg is available for 100% of Steam AppIDs)
        [JsonIgnore]
        public string CoverImageUrl => !string.IsNullOrEmpty(AppId)
            ? $"https://cdn.cloudflare.steamstatic.com/steam/apps/{AppId}/header.jpg"
            : "pack://application:,,,/Assets/miicono.png";

        [JsonIgnore]
        public Visibility CoverFallbackVisibility => string.IsNullOrEmpty(AppId) ? Visibility.Visible : Visibility.Collapsed;

        // UI Helpers
        private bool _isSelected = false;
        [JsonIgnore]
        public bool IsSelected
        {
            get => _isSelected;
            set { if (_isSelected != value) { _isSelected = value; OnPropertyChanged(); } }
        }

        private string _statusMessage = "Listo";
        [JsonIgnore]
        public string StatusMessage
        {
            get => _statusMessage;
            set { if (_statusMessage != value) { _statusMessage = value; OnPropertyChanged(); } }
        }

        private double _progressValue = 0;
        [JsonIgnore]
        public double ProgressValue
        {
            get => _progressValue;
            set { if (_progressValue != value) { _progressValue = value; OnPropertyChanged(); } }
        }

        private bool _isProcessing = false;
        [JsonIgnore]
        public bool IsProcessing
        {
            get => _isProcessing;
            set
            {
                if (_isProcessing != value)
                {
                    _isProcessing = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(CanInstallFix));
                    OnPropertyChanged(nameof(CanActivate));
                    OnPropertyChanged(nameof(CanActivateVip));
                }
            }
        }

        private bool _isInstalled = false;
        [JsonIgnore]
        public bool IsInstalled
        {
            get => _isInstalled;
            set
            {
                if (_isInstalled != value)
                {
                    _isInstalled = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(InstallBadgeText));
                    OnPropertyChanged(nameof(InstallBadgeColor));
                    OnPropertyChanged(nameof(CanInstallFix));
                    OnPropertyChanged(nameof(CanActivateVip));
                    OnPropertyChanged(nameof(VipButtonToolTip));
                    OnPropertyChanged(nameof(CanLaunchGame));
                    OnPropertyChanged(nameof(PlayButtonVisibility));
                }
            }
        }

        private bool _isAuthorizedForClient = true;
        [JsonIgnore]
        public bool IsAuthorizedForClient
        {
            get => _isAuthorizedForClient;
            set
            {
                if (_isAuthorizedForClient != value)
                {
                    _isAuthorizedForClient = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(InstallBadgeText));
                    OnPropertyChanged(nameof(InstallBadgeColor));
                    OnPropertyChanged(nameof(CanInstallFix));
                    OnPropertyChanged(nameof(CanActivate));
                    OnPropertyChanged(nameof(CanActivateVip));
                    OnPropertyChanged(nameof(FixButtonVisibility));
                    OnPropertyChanged(nameof(VipButtonVisibility));
                    OnPropertyChanged(nameof(ActivateButtonVisibility));
                    OnPropertyChanged(nameof(RepairButtonVisibility));
                    OnPropertyChanged(nameof(RequestButtonVisibility));
                    OnPropertyChanged(nameof(DlcButtonVisibility));
                }
            }
        }

        [JsonIgnore]
        public string InstallBadgeText
        {
            get
            {
                if (!IsAuthorizedForClient)
                    return "🔒 No Incluido en tu Licencia Actual";
                if (IsInstalled)
                    return "✔ Instalado 100% en Steam";
                return "⚠️ Debes instalar el juego en Steam primero";
            }
        }

        [JsonIgnore]
        public string InstallBadgeColor
        {
            get
            {
                if (!IsAuthorizedForClient)
                    return "#6B7280"; // Gray
                if (IsInstalled)
                    return "#10B981"; // Emerald Green
                return "#F59E0B"; // Amber Warning
            }
        }

        private bool _hasCustomLauncher = false;
        [JsonIgnore]
        public bool HasCustomLauncher
        {
            get => _hasCustomLauncher;
            set
            {
                if (_hasCustomLauncher != value)
                {
                    _hasCustomLauncher = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(CanLaunchGame));
                    OnPropertyChanged(nameof(PlayButtonVisibility));
                }
            }
        }

        private bool _isFixInstalled = false;
        [JsonIgnore]
        public bool IsFixInstalled
        {
            get => _isFixInstalled;
            set
            {
                if (_isFixInstalled != value)
                {
                    _isFixInstalled = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(CanLaunchGame));
                }
            }
        }

        // VIP / Denuvo / Ubisoft / EA Detection
        [JsonIgnore]
        public bool IsVip => Helpers.DenuvoGamesHelper.IsVipGame(AppId, Name, SteamFolderName);

        [JsonIgnore]
        public bool IsDenuvo => IsVip;

        [JsonIgnore]
        public string FixButtonText => "🛠️ Fix";

        [JsonIgnore]
        public bool CanInstallFix => IsAuthorizedForClient && !IsVip && !IsProcessing;

        [JsonIgnore]
        public bool CanActivate => IsAuthorizedForClient && !IsProcessing;

        [JsonIgnore]
        public bool CanActivateVip => IsAuthorizedForClient && IsInstalled && !IsProcessing;

        [JsonIgnore]
        public string VipButtonToolTip => IsInstalled
            ? "Abrir Activador VIP PandaStore con AppID precargado para generar reporte"
            : "⚠️ Debes instalar y descargar el juego al 100% en Steam primero antes de activar";

        [JsonIgnore]
        public bool CanLaunchGame => IsAuthorizedForClient && IsInstalled && !IsProcessing;

        [JsonIgnore]
        public Visibility PlayButtonVisibility => (IsAuthorizedForClient && IsInstalled) ? Visibility.Visible : Visibility.Collapsed;

        private bool _hasFix = false;
        [JsonPropertyName("has_fix")]
        public bool HasFix
        {
            get => _hasFix;
            set
            {
                if (_hasFix != value)
                {
                    _hasFix = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(FixButtonVisibility));
                }
            }
        }

        // Fix button is ONLY for non-VIP games that actually have an active fix in Ryuu
        [JsonIgnore]
        public Visibility FixButtonVisibility => (IsAuthorizedForClient && !IsVip && HasFix) ? Visibility.Visible : Visibility.Collapsed;

        // VIP button "🔑 Activar" is for VIP games (Denuvo, Ubisoft, EA)
        [JsonIgnore]
        public Visibility VipButtonVisibility => (IsAuthorizedForClient && IsVip) ? Visibility.Visible : Visibility.Collapsed;

        // Primary library injection button "📥 Agregar a la biblioteca"
        [JsonIgnore]
        public Visibility ActivateButtonVisibility => IsAuthorizedForClient ? Visibility.Visible : Visibility.Collapsed;

        // Repair stuck/corrupted download button "🧹 Reparar Descarga"
        [JsonIgnore]
        public Visibility RepairButtonVisibility => IsAuthorizedForClient ? Visibility.Visible : Visibility.Collapsed;

        [JsonIgnore]
        public Visibility RequestButtonVisibility => !IsAuthorizedForClient ? Visibility.Visible : Visibility.Collapsed;
    }
}
