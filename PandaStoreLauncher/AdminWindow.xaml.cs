using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using PandaStoreLauncher.Helpers;
using PandaStoreLauncher.Models;
using PandaStoreLauncher.Services;

namespace PandaStoreLauncher
{
    public partial class AdminWindow : Window
    {
        private readonly FirebaseService _firebaseService;
        private readonly string _currentHwid;
        private List<LicenseModel> _allLicenses = new List<LicenseModel>();

        public AdminWindow(FirebaseService firebaseService, string currentHwid)
        {
            InitializeComponent();
            _firebaseService = firebaseService;
            _currentHwid = currentHwid;
            Loaded += AdminWindow_Loaded;
        }

        private async void AdminWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadLicensesAsync();
        }

        private async Task LoadLicensesAsync()
        {
            try
            {
                lblLicenseStats.Text = "Cargando licencias desde Firestore...";
                _allLicenses = await _firebaseService.GetAllLicensesAsync();
                ApplyFilter();
            }
            catch (Exception ex)
            {
                lblLicenseStats.Text = $"❌ Error al cargar licencias: {ex.Message}";
            }
        }

        private void ApplyFilter()
        {
            string query = txtSearchLicense.Text.Trim().ToLower();
            var filtered = _allLicenses.Where(l =>
                string.IsNullOrEmpty(query) ||
                (l.Key ?? "").ToLower().Contains(query) ||
                (l.ClientEmail ?? "").ToLower().Contains(query) ||
                (l.Hwid ?? "").ToLower().Contains(query) ||
                (l.Status ?? "").ToLower().Contains(query)
            ).ToList();

            dgLicenses.ItemsSource = filtered;
            int activeCount = _allLicenses.Count(l => l.Status == "active");
            int suspendedCount = _allLicenses.Count(l => l.Status == "suspended");
            lblLicenseStats.Text = $"Total: {_allLicenses.Count} licencias | ✅ Activas: {activeCount} | 🚫 Suspendidas: {suspendedCount}";
        }

        private void TxtSearchLicense_TextChanged(object sender, TextChangedEventArgs e)
        {
            ApplyFilter();
        }

        private async void BtnRefreshLicenses_Click(object sender, RoutedEventArgs e)
        {
            btnRefreshLicenses.IsEnabled = false;
            await LoadLicensesAsync();
            btnRefreshLicenses.IsEnabled = true;
        }

        private async void BtnRegisterAdminHwid_Click(object sender, RoutedEventArgs e)
        {
            var res = MessageBox.Show(
                $"¿Deseas registrar tu equipo actual como el único Administrador Oficial?\n\nTu HWID:\n{_currentHwid}",
                "PandaStore Admin",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (res == MessageBoxResult.Yes)
            {
                try
                {
                    await _firebaseService.SetAdminHwidAsync(_currentHwid);
                    MessageBox.Show("¡HWID Admin guardado con éxito en Firestore! Solo desde esta PC tendrás acceso al panel de control.", "PandaStore Admin", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error al guardar HWID Admin: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private async void BtnSaveRow_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.DataContext is LicenseModel lic)
            {
                btn.IsEnabled = false;
                try
                {
                    await _firebaseService.UpdateLicenseFieldsAsync(lic);
                    MessageBox.Show($"Licencia '{lic.Key}' actualizada correctamente.", "PandaStore Admin", MessageBoxButton.OK, MessageBoxImage.Information);
                    await LoadLicensesAsync();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error al actualizar licencia: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                finally
                {
                    btn.IsEnabled = true;
                }
            }
        }

        private async void BtnToggleStatusRow_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.DataContext is LicenseModel lic)
            {
                string newStatus = lic.Status == "active" ? "suspended" : "active";
                string actionLabel = newStatus == "suspended" ? "SUSPENDER" : "ACTIVAR";

                var res = MessageBox.Show(
                    $"¿Estás seguro de {actionLabel} la licencia '{lic.Key}' ({lic.ClientEmail})?\n\nSi la suspendes, PandaChecker eliminará los archivos .lua del cliente.",
                    "PandaStore Admin",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (res == MessageBoxResult.Yes)
                {
                    btn.IsEnabled = false;
                    try
                    {
                        lic.Status = newStatus;
                        await _firebaseService.UpdateLicenseFieldsAsync(lic);
                        MessageBox.Show($"Licencia '{lic.Key}' cambiada a estado: {newStatus.ToUpper()}.", "PandaStore Admin", MessageBoxButton.OK, MessageBoxImage.Information);
                        await LoadLicensesAsync();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error al cambiar estado: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                    finally
                    {
                        btn.IsEnabled = true;
                    }
                }
            }
        }

        private async void BtnResetHwidRow_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn && btn.DataContext is LicenseModel lic)
            {
                var res = MessageBox.Show(
                    $"¿Deseas desvincular el HWID de la licencia '{lic.Key}' ({lic.ClientEmail})?\n\nEsto permitirá que el cliente inicie sesión en una nueva PC.",
                    "PandaStore Admin",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (res == MessageBoxResult.Yes)
                {
                    btn.IsEnabled = false;
                    try
                    {
                        lic.Hwid = null;
                        await _firebaseService.UpdateLicenseFieldsAsync(lic);
                        MessageBox.Show($"HWID desvinculado con éxito para la licencia '{lic.Key}'.", "PandaStore Admin", MessageBoxButton.OK, MessageBoxImage.Information);
                        await LoadLicensesAsync();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error al desvincular HWID: {ex.Message}", "PandaStore Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                    finally
                    {
                        btn.IsEnabled = true;
                    }
                }
            }
        }

        private void BtnClose_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
