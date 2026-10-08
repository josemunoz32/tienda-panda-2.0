using System;
using System.Windows;
using PandaStoreLauncher.Helpers;

namespace PandaStoreLauncher
{
    public static class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                Logger.Log("==========================================");
                Logger.Log("PandaStore Launcher - Program.Main iniciado");
                Logger.Log($"OS: {Environment.OSVersion}, .NET: {Environment.Version}");

                AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
                {
                    if (e.ExceptionObject is Exception ex)
                    {
                        Logger.LogError(ex, "AppDomain UnhandledException");
                        MessageBox.Show($"Error fatal no controlado:\n\n{ex.Message}\n\nRevisa el archivo de log en %AppData%\\PandaStore\\launcher.log", "PandaStore Launcher Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                };

                App app = new App();
                app.InitializeComponent();
                Logger.Log("App.InitializeComponent completado con exito");
                app.Run();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error en Program.Main");
                MessageBox.Show($"Error crítico iniciando el Launcher:\n\n{ex.Message}\n\nDetalles guardados en %AppData%\\PandaStore\\launcher.log", "PandaStore Launcher Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
