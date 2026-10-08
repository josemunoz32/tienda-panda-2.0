using System;
using System.Windows;
using PandaStoreLauncher.Helpers;

namespace PandaStoreLauncher
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            Logger.Log("PandaStore Launcher OnStartup iniciado");
            base.OnStartup(e);

            AppDomain.CurrentDomain.UnhandledException += (sender, args) =>
            {
                if (args.ExceptionObject is Exception ex)
                {
                    Logger.LogError(ex, "AppDomain UnhandledException");
                    MessageBox.Show($"Error fatal no controlado:\n\n{ex.Message}\n\nRevisa el archivo de log en %AppData%\\PandaStore\\launcher.log", "PandaStore Launcher Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            };

            this.DispatcherUnhandledException += (sender, args) =>
            {
                Logger.LogError(args.Exception, "Dispatcher UnhandledException");
                MessageBox.Show($"Error de interfaz:\n\n{args.Exception.Message}\n\nRevisa el archivo de log en %AppData%\\PandaStore\\launcher.log", "PandaStore Launcher Error", MessageBoxButton.OK, MessageBoxImage.Error);
                args.Handled = true;
            };

            try
            {
                MainWindow main = new MainWindow();
                main.Show();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error iniciando MainWindow");
                MessageBox.Show($"Error al iniciar la ventana principal:\n\n{ex.Message}\n\nRevisa el archivo de log en %AppData%\\PandaStore\\launcher.log", "PandaStore Launcher Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
