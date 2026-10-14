Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Fondo idéntico al estilo PlayStation (#003791) / Nintendo (#e60012) pero en el azul/gris de Steam (#171a21 a #1b2838)
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$cTop = [System.Drawing.Color]::FromArgb(23, 26, 33)
$cBottom = [System.Drawing.Color]::FromArgb(27, 40, 56)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 90.0)
$g.FillRectangle($brush, $rect)

# Cargar el logo oficial de Steam desde src/assets/logos/logosteam.png
$iconPath = "c:\Users\Usuario\proyectopandastore20\src\assets\logos\logosteam.png"
if (Test-Path $iconPath) {
    $steamImg = [System.Drawing.Image]::FromFile($iconPath)
    # Dibujar el logo oficial centrado
    $logoSize = 310
    $posX = [int](($width - $logoSize) / 2)
    $posY = [int](($height - $logoSize) / 2 - 20)
    $g.DrawImage($steamImg, $posX, $posY, $logoSize, $logoSize)
    $steamImg.Dispose()
}

# Texto oficial "STEAM" debajo
$font = New-Object System.Drawing.Font("Arial Black", 32, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("STEAM", $font, $textBrush, [float]($width / 2), [float]410, $sf)

$g.Dispose()

$destPath = "c:\Users\Usuario\proyectopandastore20\src\assets\categorias y prom,o\steam_oficial.png"
$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "SUCCESS: Generated $destPath"
