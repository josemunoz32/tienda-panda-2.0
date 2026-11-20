# Exporta el arte aprobado en la proporción del banner original de Halloween.
Add-Type -AssemblyName System.Drawing
$publicDir = Join-Path $PSScriptRoot '../public'
$source = [Drawing.Image]::FromFile((Resolve-Path (Join-Path $publicDir 'navidad-letras-pc.png')))
$banner = New-Object Drawing.Bitmap 1920,340
$graphics = [Drawing.Graphics]::FromImage($banner)
try {
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  # Extiende el escenario lateral. Conserva la escala del rótulo y las caras.
  $bands = @(
    @(0,120,0,245), @(120,610,245,470), @(730,720,715,490),
    @(1450,540,1205,415), @(1990,182,1620,300)
  )
  foreach ($band in $bands) {
    $from = [Drawing.Rectangle]::new($band[0],95,$band[1],530)
    $to = [Drawing.Rectangle]::new($band[2],0,$band[3],340)
    $graphics.DrawImage($source,$to,$from,[Drawing.GraphicsUnit]::Pixel)
  }
  $banner.Save((Join-Path $publicDir 'navidad-panorama-pc.jpg'),[Drawing.Imaging.ImageFormat]::Jpeg)
} finally {
  $graphics.Dispose()
  $banner.Dispose()
  $source.Dispose()
}
