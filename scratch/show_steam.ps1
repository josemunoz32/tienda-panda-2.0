Add-Type @'
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class WinUtil {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
  }
'@

[WinUtil]::EnumWindows({
  param($hWnd, $lParam)
  $targetPid = 0
  [WinUtil]::GetWindowThreadProcessId($hWnd, [ref]$targetPid)
  $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
  if ($proc -and ($proc.ProcessName -like "*steam*")) {
    $sb = New-Object System.Text.StringBuilder 256
    [WinUtil]::GetWindowText($hWnd, $sb, 256) | Out-Null
    $title = $sb.ToString()
    $vis = [WinUtil]::IsWindowVisible($hWnd)
    if ($title.Length -gt 0) {
      Write-Host "HWND: $hWnd | PID: $targetPid | Title: $title | Visible: $vis"
      if ($title -like "*Steam*") {
        [WinUtil]::ShowWindow($hWnd, 9)
        [WinUtil]::SetForegroundWindow($hWnd)
        Write-Host "Restored and brought to foreground: $title"
      }
    }
  }
  return $true
}, [IntPtr]::Zero)
