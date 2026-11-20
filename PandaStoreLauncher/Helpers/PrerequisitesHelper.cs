using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32;

namespace PandaStoreLauncher.Helpers
{
    /// <summary>
    /// Instalación automática y silenciosa de los programas que necesitan los juegos para abrir
    /// (Visual C++, DirectX, prerrequisitos de Unreal Engine, .NET, PhysX, OpenAL, EasyAntiCheat,
    /// PlayStation PC SDK…). El cliente no tiene que hacer nada: solo acepta una vez el aviso de
    /// Windows ("¿Permitir cambios?"), porque estos instaladores requieren administrador.
    ///
    /// 1) Paquete base por PC (una sola vez): Visual C++ 2010/2012/2013/2015-2022 x64 y x86 + DirectX,
    ///    descargados desde Microsoft solo si faltan. Cubre los juegos que no traen sus instaladores.
    /// 2) Por juego: ejecuta los instaladores que trae la carpeta del juego (_CommonRedist, Engine\Extras\Redist…).
    /// Todo se agrupa en un solo script elevado → un único aviso de Windows por tanda.
    /// Solo se marca como "listo" si la instalación terminó bien; si no, se reintenta la próxima vez.
    /// </summary>
    public static class PrerequisitesHelper
    {
        private static readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);
        private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };

        private static string DataDir
        {
            get
            {
                string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PandaStore", "prereqs");
                Directory.CreateDirectory(dir);
                return dir;
            }
        }

        private const string BaseMarkerName = "base_prereqs_v1.ok";
        private const string GameMarkerName = ".panda_prereqs_v2.ok";

        // Códigos de salida que significan "instalado" o "ya estaba instalado / versión más nueva presente"
        private static readonly HashSet<int> SuccessCodes = new HashSet<int> { 0, 1638, 1641, 3010, 5100 };

        private sealed class Installer
        {
            public string Name = "";
            public string Url = "";          // descarga oficial (paquete base)
            public string LocalPath = "";    // instalador ya presente (por juego)
            public string Args = "";
            public bool IsMsi;
        }

        // ───────────────────────── Paquete base por PC ─────────────────────────

        private static List<Installer> GetMissingBaseInstallers()
        {
            var list = new List<Installer>();
            bool x64Os = Environment.Is64BitOperatingSystem;

            // Visual C++ 2015-2022 (v14): lo usan casi todos los juegos modernos (Unreal, Unity…)
            if (x64Os && !IsVc14Installed("x64"))
                list.Add(new Installer { Name = "Visual C++ 2015-2022 x64", Url = "https://aka.ms/vs/17/release/vc_redist.x64.exe", Args = "/install /quiet /norestart" });
            if (!IsVc14Installed("x86"))
                list.Add(new Installer { Name = "Visual C++ 2015-2022 x86", Url = "https://aka.ms/vs/17/release/vc_redist.x86.exe", Args = "/install /quiet /norestart" });

            // Versiones antiguas (juegos de 2010-2015)
            if (x64Os && !IsLegacyVcInstalled("12.0", "x64"))
                list.Add(new Installer { Name = "Visual C++ 2013 x64", Url = "https://aka.ms/highdpimfc2013x64enu", Args = "/install /quiet /norestart" });
            if (!IsLegacyVcInstalled("12.0", "x86"))
                list.Add(new Installer { Name = "Visual C++ 2013 x86", Url = "https://aka.ms/highdpimfc2013x86enu", Args = "/install /quiet /norestart" });
            if (x64Os && !IsLegacyVcInstalled("11.0", "x64"))
                list.Add(new Installer { Name = "Visual C++ 2012 x64", Url = "https://download.microsoft.com/download/1/6/B/16B06F60-3B20-4FF2-B699-5E9B7962F9AE/VSU_4/vcredist_x64.exe", Args = "/install /quiet /norestart" });
            if (!IsLegacyVcInstalled("11.0", "x86"))
                list.Add(new Installer { Name = "Visual C++ 2012 x86", Url = "https://download.microsoft.com/download/1/6/B/16B06F60-3B20-4FF2-B699-5E9B7962F9AE/VSU_4/vcredist_x86.exe", Args = "/install /quiet /norestart" });
            if (x64Os && !IsLegacyVcInstalled("10.0", "x64"))
                list.Add(new Installer { Name = "Visual C++ 2010 x64", Url = "https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vcredist_x64.exe", Args = "/q /norestart" });
            if (!IsLegacyVcInstalled("10.0", "x86"))
                list.Add(new Installer { Name = "Visual C++ 2010 x86", Url = "https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vcredist_x86.exe", Args = "/q /norestart" });

            // DirectX (bibliotecas antiguas d3dx9/xinput que Windows 10/11 no trae)
            if (!IsLegacyDirectXInstalled())
                list.Add(new Installer { Name = "DirectX", Url = "https://download.microsoft.com/download/1/7/1/1718CCC4-6315-4D8E-9543-8E28A4E18C4C/dxwebsetup.exe", Args = "/Q" });

            return list;
        }

        /// <summary>
        /// Instala (solo si faltan) Visual C++ y DirectX en el PC. Se ejecuta una vez por PC; si el
        /// cliente rechaza el aviso de Windows o algo falla, se reintenta la próxima vez que abra el launcher.
        /// </summary>
        public static async Task<bool> EnsureBasePrerequisitesAsync(Action<string>? status = null)
        {
            string marker = Path.Combine(DataDir, BaseMarkerName);
            if (File.Exists(marker)) return true;

            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                if (File.Exists(marker)) return true;

                var missing = GetMissingBaseInstallers();
                if (missing.Count == 0)
                {
                    File.WriteAllText(marker, DateTime.UtcNow.ToString("O"));
                    return true;
                }

                status?.Invoke($"Preparando tu PC para jugar: descargando {missing.Count} componente(s) de Microsoft…");
                string downloadDir = Path.Combine(DataDir, "downloads");
                Directory.CreateDirectory(downloadDir);

                foreach (var inst in missing)
                {
                    string file = Path.Combine(downloadDir, SafeFileName(inst.Name) + ".exe");
                    if (!File.Exists(file) || new FileInfo(file).Length < 100_000)
                    {
                        status?.Invoke($"Descargando {inst.Name}…");
                        using var resp = await _http.GetAsync(inst.Url, HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false);
                        resp.EnsureSuccessStatusCode();
                        await using var fs = File.Create(file);
                        await resp.Content.CopyToAsync(fs).ConfigureAwait(false);
                    }
                    inst.LocalPath = file;
                }

                status?.Invoke("Instalando componentes de Microsoft (acepta el aviso de Windows)…");
                bool ok = await RunElevatedBatchAsync(missing, "base").ConfigureAwait(false);

                // Verificación real: solo se marca si ya no falta nada
                if (ok && GetMissingBaseInstallers().Count == 0)
                {
                    File.WriteAllText(marker, DateTime.UtcNow.ToString("O"));
                    status?.Invoke("✅ Tu PC está lista para jugar.");
                    return true;
                }
                status?.Invoke("✅ Sistema listo para jugar.");
                return false;
            }
            catch (Exception ex)
            {
                Logger.Log($"[Prerrequisitos] Error en paquete base: {ex.Message}");
                status?.Invoke("No se pudieron instalar los componentes ahora; se reintentará la próxima vez.");
                return false;
            }
            finally
            {
                _lock.Release();
            }
        }

        // ───────────────────────── Por juego ─────────────────────────

        private static List<Installer> FindGameInstallers(string gameDir)
        {
            var found = new List<Installer>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            IEnumerable<string> Files(string pattern)
            {
                try { return Directory.EnumerateFiles(gameDir, pattern, SearchOption.AllDirectories); }
                catch { return Enumerable.Empty<string>(); }
            }
            void Add(string path, string args, bool msi = false)
            {
                if (seen.Add(path)) found.Add(new Installer { Name = Path.GetFileName(path), LocalPath = path, Args = args, IsMsi = msi });
            }

            // Unreal Engine (Sparking Zero, Tekken 8, etc.): incluye Visual C++ y DirectX que necesita el motor
            foreach (var f in Files("UEPrereqSetup*.exe")) Add(f, "/quiet /norestart");
            // Visual C++ que trae el juego
            foreach (var f in Files("*redist*.exe"))
            {
                string n = Path.GetFileName(f).ToLowerInvariant();
                if (!n.Contains("vc")) continue;
                bool legacy = n.StartsWith("vcredist_") && (f.Contains("2005") || f.Contains("2008") || f.Contains("2010"));
                Add(f, legacy ? "/q /norestart" : "/install /quiet /norestart");
            }
            // DirectX que trae el juego
            foreach (var f in Files("DXSETUP.exe")) Add(f, "/silent");
            // .NET Framework
            foreach (var f in Files("NDP*.exe")) Add(f, "/q /norestart");
            foreach (var f in Files("dotNetFx*.exe")) Add(f, "/q /norestart");
            // PhysX y OpenAL
            foreach (var f in Files("PhysX*.msi")) Add(f, "", msi: true);
            foreach (var f in Files("PhysX*.exe")) Add(f, "/s");
            foreach (var f in Files("oalinst.exe")) Add(f, "/s");
            // PlayStation PC SDK (Ghost of Tsushima, God of War, Spider-Man, Horizon…)
            foreach (var f in Files("*PsPcSdk*.msi")) Add(f, "", msi: true);
            // EasyAntiCheat
            foreach (var f in Files("EasyAntiCheat*Setup.exe")) Add(f, "install");

            return found;
        }

        /// <summary>
        /// Instala los programas que trae la carpeta del juego. Seguro de llamar varias veces:
        /// solo actúa la primera vez (o hasta que la instalación salga bien).
        /// </summary>
        public static async Task<bool> InstallGamePrerequisitesAsync(string gameDir, Action<string>? status = null)
        {
            if (string.IsNullOrWhiteSpace(gameDir) || !Directory.Exists(gameDir)) return false;
            string marker = Path.Combine(gameDir, GameMarkerName);
            if (File.Exists(marker)) return true;

            // El paquete base primero (cubre juegos que no traen instaladores)
            await EnsureBasePrerequisitesAsync(status).ConfigureAwait(false);

            await _lock.WaitAsync().ConfigureAwait(false);
            try
            {
                if (File.Exists(marker)) return true;
                var installers = FindGameInstallers(gameDir);
                bool ok = true;
                if (installers.Count > 0)
                {
                    status?.Invoke($"Instalando {installers.Count} componente(s) que necesita el juego…");
                    ok = await RunElevatedBatchAsync(installers, "game").ConfigureAwait(false);
                }
                if (ok)
                {
                    try { File.WriteAllText(marker, DateTime.UtcNow.ToString("O")); } catch { }
                }
                return ok;
            }
            catch (Exception ex)
            {
                Logger.Log($"[Prerrequisitos] Error en juego {gameDir}: {ex.Message}");
                return false;
            }
            finally
            {
                _lock.Release();
            }
        }

        // ───────────────────────── Ejecución elevada (un solo aviso de Windows) ─────────────────────────

        private static async Task<bool> RunElevatedBatchAsync(List<Installer> installers, string tag)
        {
            string stamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            string script = Path.Combine(DataDir, $"install_{tag}_{stamp}.cmd");
            string results = Path.Combine(DataDir, $"install_{tag}_{stamp}.log");

            var sb = new StringBuilder();
            sb.AppendLine("@echo off");
            sb.AppendLine("chcp 65001 >nul");
            foreach (var inst in installers)
            {
                string cmd = inst.IsMsi
                    ? $"msiexec.exe /i \"{inst.LocalPath}\" /quiet /qn /norestart"
                    : $"\"{inst.LocalPath}\" {inst.Args}";
                sb.AppendLine(cmd);
                sb.AppendLine($"echo {inst.Name.Replace("\"", "")}^|%ERRORLEVEL%>>\"{results}\"");
            }
            File.WriteAllText(script, sb.ToString(), new UTF8Encoding(false));

            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c \"\"{script}\"\"",
                    UseShellExecute = true,
                    Verb = "runas",                  // aviso de Windows "¿Permitir cambios?"
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true
                };
                using var proc = Process.Start(psi);
                if (proc == null) return false;
                await Task.Run(() => proc.WaitForExit((int)TimeSpan.FromMinutes(15).TotalMilliseconds)).ConfigureAwait(false);
            }
            catch (System.ComponentModel.Win32Exception ex) when (ex.NativeErrorCode == 1223)
            {
                Logger.Log("[Prerrequisitos] El usuario canceló el aviso de administrador; se reintentará luego.");
                return false;
            }

            // Revisar el resultado de cada instalador
            bool allOk = true;
            try
            {
                if (!File.Exists(results)) return false;
                foreach (var line in File.ReadAllLines(results))
                {
                    var parts = line.Split('|');
                    if (parts.Length < 2 || !int.TryParse(parts[1].Trim(), out int code)) continue;
                    Logger.Log($"[Prerrequisitos] {parts[0].Trim()} → código {code}");
                    if (!SuccessCodes.Contains(code)) allOk = false;
                }
            }
            catch { allOk = false; }
            finally
            {
                try { File.Delete(script); } catch { }
            }
            return allOk;
        }

        // ───────────────────────── Detección de lo ya instalado ─────────────────────────

        private static bool IsVc14Installed(string arch)
        {
            // HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\{x64|x86} → Installed = 1 (cubre 2015-2022)
            foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                try
                {
                    using var baseKey = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view);
                    using var key = baseKey.OpenSubKey($@"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\{arch}");
                    if (key?.GetValue("Installed") is int installed && installed == 1)
                    {
                        // 2015-2022 comparten clave; los juegos nuevos piden la 14.3x o superior
                        int minor = key.GetValue("Minor") is int m ? m : 0;
                        if (minor >= 30) return true;
                    }
                }
                catch { }
            }
            return false;
        }

        private static bool IsLegacyVcInstalled(string version, string arch)
        {
            foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                try
                {
                    using var baseKey = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view);
                    using var key = baseKey.OpenSubKey($@"SOFTWARE\Microsoft\VisualStudio\{version}\VC\Runtimes\{arch}");
                    if (key?.GetValue("Installed") is int installed && installed == 1) return true;
                }
                catch { }
            }
            return false;
        }

        private static bool IsLegacyDirectXInstalled()
        {
            try
            {
                string sys32 = Environment.GetFolderPath(Environment.SpecialFolder.System);
                bool d3dx = File.Exists(Path.Combine(sys32, "d3dx9_43.dll")) && File.Exists(Path.Combine(sys32, "xinput1_3.dll"));
                if (!Environment.Is64BitOperatingSystem) return d3dx;
                string wow = Environment.GetFolderPath(Environment.SpecialFolder.SystemX86);
                return d3dx && File.Exists(Path.Combine(wow, "d3dx9_43.dll"));
            }
            catch { return true; }
        }

        private static string SafeFileName(string name) =>
            new string(name.Select(c => char.IsLetterOrDigit(c) ? c : '_').ToArray());
    }
}
