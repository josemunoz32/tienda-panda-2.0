using System;
using System.Management;
using System.Security.Cryptography;
using System.Text;

namespace PandaStoreLauncher.Helpers
{
    public static class HardwareIdHelper
    {
        private static string? _cachedHwid;

        /// <summary>
        /// Generates a unique SHA256 hash based on Motherboard Serial Number and Computer System UUID.
        /// </summary>
        public static string GetHardwareId()
        {
            if (!string.IsNullOrEmpty(_cachedHwid))
                return _cachedHwid;

            try
            {
                string boardSerial = GetWmiProperty("Win32_BaseBoard", "SerialNumber");
                string systemUuid = GetWmiProperty("Win32_ComputerSystemProduct", "UUID");

                if (string.IsNullOrWhiteSpace(boardSerial) || boardSerial.Equals("To be filled by O.E.M.", StringComparison.OrdinalIgnoreCase))
                {
                    boardSerial = GetWmiProperty("Win32_Processor", "ProcessorId");
                }

                if (string.IsNullOrWhiteSpace(systemUuid) || systemUuid.Equals("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF", StringComparison.OrdinalIgnoreCase))
                {
                    systemUuid = Environment.MachineName;
                }

                string rawId = $"PANDA_HWID_{boardSerial.Trim()}_{systemUuid.Trim()}";

                using var sha256 = SHA256.Create();
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawId));

                StringBuilder builder = new StringBuilder();
                foreach (byte b in bytes)
                {
                    builder.Append(b.ToString("X2"));
                }

                _cachedHwid = builder.ToString();
                return _cachedHwid;
            }
            catch (Exception)
            {
                // Fallback to MachineName + UserName SHA256 if WMI is restricted
                string fallbackRaw = $"PANDA_FALLBACK_{Environment.MachineName}_{Environment.UserName}";
                using var sha256 = SHA256.Create();
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(fallbackRaw));
                StringBuilder builder = new StringBuilder();
                foreach (byte b in bytes)
                {
                    builder.Append(b.ToString("X2"));
                }
                _cachedHwid = builder.ToString();
                return _cachedHwid;
            }
        }

        private static string GetWmiProperty(string wmiClass, string propertyName)
        {
            try
            {
                using var searcher = new ManagementObjectSearcher($"SELECT {propertyName} FROM {wmiClass}");
                foreach (ManagementObject obj in searcher.Get())
                {
                    var val = obj[propertyName]?.ToString();
                    if (!string.IsNullOrWhiteSpace(val))
                    {
                        return val.Trim();
                    }
                }
            }
            catch
            {
                // Ignore WMI errors and let caller fallback
            }

            return string.Empty;
        }
    }
}
