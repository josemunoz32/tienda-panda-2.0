using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Text;

namespace PandaStoreLauncher.Helpers
{
    public static class DiagnosticsHelper
    {
        public static string GenerateDiagnosticReport(string hwid, string clientEmail)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("=== PANDASTORE LAUNCHER DIAGNOSTICO DE SOPORTE ===");
            sb.AppendLine($"Fecha: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine($"Cliente: {clientEmail}");
            sb.AppendLine($"HWID: {hwid}");
            sb.AppendLine();

            sb.AppendLine("--- ESPECIFICACIONES DE HARDWARE ---");
            sb.AppendLine($"SO: {Environment.OSVersion}");
            sb.AppendLine($"Arquitectura: {(Environment.Is64BitOperatingSystem ? "64-bit" : "32-bit")}");

            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT Caption, TotalPhysicalMemory FROM Win32_OperatingSystem");
                foreach (var obj in searcher.Get())
                {
                    if (ulong.TryParse(obj["TotalPhysicalMemory"]?.ToString(), out ulong totalRamBytes))
                    {
                        double ramGb = totalRamBytes / (1024.0 * 1024.0 * 1024.0);
                        sb.AppendLine($"RAM Total: {ramGb:F1} GB");
                    }
                }
            }
            catch
            {
                sb.AppendLine("RAM Total: Desconocida");
            }

            try
            {
                using var cpuSearcher = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor");
                foreach (var obj in cpuSearcher.Get())
                {
                    sb.AppendLine($"Procesador (CPU): {obj["Name"]}");
                    break;
                }
            }
            catch { }

            try
            {
                using var gpuSearcher = new ManagementObjectSearcher("SELECT Name FROM Win32_VideoController");
                foreach (var obj in gpuSearcher.Get())
                {
                    sb.AppendLine($"Tarjeta Gráfica (GPU): {obj["Name"]}");
                }
            }
            catch { }

            sb.AppendLine();
            sb.AppendLine("--- ESTADO DE STEAM ---");
            bool isSteamRunning = Process.GetProcessesByName("steam").Length > 0;
            sb.AppendLine($"Proceso Steam ejecutándose: {(isSteamRunning ? "SÍ" : "NO")}");

            string? steamPath = null;
            try { steamPath = SteamManager.GetSteamPath(); } catch { }
            sb.AppendLine($"Ruta de Instalación Steam: {steamPath ?? "NO ENCONTRADA"}");


            if (!string.IsNullOrEmpty(steamPath) && Directory.Exists(steamPath))
            {
                string stapps = Path.Combine(steamPath, "steamapps");
                sb.AppendLine($"Carpeta steamapps existe: {(Directory.Exists(stapps) ? "SÍ" : "NO")}");
                
                string common = Path.Combine(stapps, "common");
                sb.AppendLine($"Carpeta common existe: {(Directory.Exists(common) ? "SÍ" : "NO")}");

                if (Directory.Exists(common))
                {
                    try
                    {
                        var dirs = Directory.GetDirectories(common);
                        sb.AppendLine($"Juegos instalados detectados ({dirs.Length}):");
                        foreach (var d in dirs)
                        {
                            sb.AppendLine($" - {Path.GetFileName(d)}");
                        }
                    }
                    catch { }
                }
            }

            sb.AppendLine();
            sb.AppendLine("=== FIN DE REPORT ===");
            return sb.ToString();
        }

        public static string GetQuickSpecsSummary()
        {
            try
            {
                string ram = "Desconocida";
                using (var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_OperatingSystem"))
                {
                    foreach (var obj in searcher.Get())
                    {
                        if (ulong.TryParse(obj["TotalPhysicalMemory"]?.ToString(), out ulong totalRamBytes))
                        {
                            ram = $"{totalRamBytes / (1024.0 * 1024.0 * 1024.0):F0} GB RAM";
                        }
                    }
                }

                string cpu = "CPU";
                using (var cpuSearcher = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor"))
                {
                    foreach (var obj in cpuSearcher.Get())
                    {
                        cpu = obj["Name"]?.ToString() ?? "CPU";
                        break;
                    }
                }

                return $"💻 Mi PC: {ram} | {cpu}";
            }
            catch
            {
                return "💻 Mi PC: Windows";
            }
        }
    }
}
