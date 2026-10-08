using System;
using System.IO;

namespace PandaStoreLauncher.Helpers
{
    public static class Logger
    {
        private static readonly string LogDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore");
        private static readonly string LogFile = Path.Combine(LogDir, "launcher.log");
        private static readonly object _lock = new object();

        static Logger()
        {
            try
            {
                if (!Directory.Exists(LogDir))
                    Directory.CreateDirectory(LogDir);

                // Check file size, if > 5MB, archive it
                if (File.Exists(LogFile))
                {
                    var fileInfo = new FileInfo(LogFile);
                    if (fileInfo.Length > 5 * 1024 * 1024)
                    {
                        File.Move(LogFile, Path.Combine(LogDir, $"launcher_{DateTime.Now:yyyyMMdd_HHmmss}.log"));
                    }
                }
            }
            catch { }
        }

        public static void Log(string message, string level = "INFO")
        {
            try
            {
                lock (_lock)
                {
                    string logEntry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{level}] {message}{Environment.NewLine}";
                    File.AppendAllText(LogFile, logEntry);
                }
            }
            catch { }
        }

        public static void LogError(Exception ex, string context = "")
        {
            string msg = string.IsNullOrEmpty(context) ? ex.ToString() : $"{context}: {ex}";
            Log(msg, "ERROR");
        }
    }
}
