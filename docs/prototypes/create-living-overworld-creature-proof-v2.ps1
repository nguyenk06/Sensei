param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)

Add-Type -AssemblyName System.Drawing

$out = Join-Path $Root 'docs\assets\living-overworld-creature-proof'

function Draw-FitImage($graphics, $image, $bounds) {
  $scale = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
  $width = [int]($image.Width * $scale)
  $height = [int]($image.Height * $scale)
  $x = [int]($bounds.X + (($bounds.Width - $width) / 2))
  $y = [int]($bounds.Y + (($bounds.Height - $height) / 2))
  $graphics.DrawImage($image, $x, $y, $width, $height)
}

function New-CharacterReview {
  $items = @(
    @('WOLF — new', 'docs\assets\living-overworld-creature-proof\wolf-sheet.png'),
    @('CHICKEN — retained', 'public\assets\overworld-v04\animals\chicken.png'),
    @('PIG — retained', 'public\assets\overworld-v04\animals\pig.png'),
    @('ZOMBIE V2 — spooky, damaged, hands forward', 'docs\assets\living-overworld-creature-proof\zombie-sheet-v2.png'),
    @('SKELETON V2 — readable skull, tattered cloth, loose bow', 'docs\assets\living-overworld-creature-proof\skeleton-sheet-v2.png'),
    @('ENDERMAN — teleport only', 'docs\assets\living-overworld-creature-proof\enderman-sheet.png')
  )

  $canvas = [System.Drawing.Bitmap]::new(1920, 1800, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 24, 31))
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $titleFont = [System.Drawing.Font]::new('Segoe UI', 30, [System.Drawing.FontStyle]::Bold)
  $labelFont = [System.Drawing.Font]::new('Segoe UI', 19, [System.Drawing.FontStyle]::Bold)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 184, 209, 204))
  $g.DrawString('Living Overworld creature proof — revised', $titleFont, $white, 34, 22)
  $g.DrawString('Equal skeleton/zombie standing height; original Sensei-specific voxel styling', [System.Drawing.Font]::new('Segoe UI', 16), $muted, 38, 70)

  for ($i = 0; $i -lt $items.Count; $i++) {
    $top = 112 + ($i * 276)
    $panel = [System.Drawing.Rectangle]::new(28, $top, 1864, 252)
    $g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 23, 43, 49)), $panel)
    $g.DrawString($items[$i][0], $labelFont, $white, 48, $top + 14)
    $img = [System.Drawing.Image]::FromFile((Join-Path $Root $items[$i][1]))
    Draw-FitImage $g $img ([System.Drawing.Rectangle]::new(48, $top + 48, 1824, 190))
    $img.Dispose()
  }

  $canvas.Save((Join-Path $out 'character-tileset-review-v2.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $titleFont.Dispose(); $labelFont.Dispose(); $white.Dispose(); $muted.Dispose(); $g.Dispose(); $canvas.Dispose()
}

function Draw-Cover($graphics, $image, $bounds, [double]$positionY) {
  $scale = [Math]::Max($bounds.Width / $image.Width, $bounds.Height / $image.Height)
  $width = $image.Width * $scale
  $height = $image.Height * $scale
  $x = $bounds.X + (($bounds.Width - $width) / 2)
  $y = $bounds.Y + (($bounds.Height - $height) * $positionY)
  $graphics.DrawImage($image, [single]$x, [single]$y, [single]$width, [single]$height)
}

function Draw-DepthRoute($graphics, [System.Drawing.PointF[]]$points, $color, [bool]$dashed) {
  $shadow = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(205, 7, 20, 27), 9)
  $shadow.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen = [System.Drawing.Pen]::new($color, 5)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  if ($dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash; $pen.DashPattern = @(3.0, 2.0) }
  $graphics.DrawLines($shadow, $points)
  $graphics.DrawLines($pen, $points)
  $minY = ($points | Measure-Object Y -Minimum).Minimum
  $maxY = ($points | Measure-Object Y -Maximum).Maximum
  foreach ($point in $points) {
    $t = if ($maxY -gt $minY) { ($point.Y - $minY) / ($maxY - $minY) } else { 0.5 }
    $radius = 3.5 + (4.5 * $t)
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new($color), $point.X - $radius, $point.Y - $radius, $radius * 2, $radius * 2)
  }
  $shadow.Dispose(); $pen.Dispose()
}

function New-PathProof($season, $size, $sourceName, [double]$positionY, $dayRoutes, $nightRoutes, $teleports) {
  $isMobile = $size.Width -lt 600
  $header = if ($isMobile) { 30 } else { 48 }
  $canvas = [System.Drawing.Bitmap]::new($size.Width, $size.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $scene = [System.Drawing.Rectangle]::new(0, $header, $size.Width, $size.Height - $header)
  $skyTop = if ($season -eq 'autumn') { [System.Drawing.Color]::FromArgb(255, 107, 185, 224) } else { [System.Drawing.Color]::FromArgb(255, 132, 197, 226) }
  $skyBottom = [System.Drawing.Color]::FromArgb(255, 204, 231, 235)
  $sky = [System.Drawing.Drawing2D.LinearGradientBrush]::new($scene, $skyTop, $skyBottom, 90)
  $g.FillRectangle($sky, $scene)
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root $sourceName))
  Draw-Cover $g $img $scene $positionY
  $img.Dispose(); $sky.Dispose()

  $g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 21, 63, 72)), 0, 0, $size.Width, $header)
  $titleFont = [System.Drawing.Font]::new('Segoe UI', $(if ($isMobile) { 10 } else { 22 }), [System.Drawing.FontStyle]::Bold)
  $legendFont = [System.Drawing.Font]::new('Segoe UI', $(if ($isMobile) { 7 } else { 14 }), [System.Drawing.FontStyle]::Bold)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $g.DrawString("$($season.Substring(0,1).ToUpper()+$season.Substring(1)) depth paths", $titleFont, $white, $(if ($isMobile) { 7 } else { 14 }), $(if ($isMobile) { 5 } else { 8 }))
  if (-not $isMobile) {
    $g.DrawString('dot size = depth scale (far → near)', $legendFont, $white, 430, 14)
    $g.DrawString('purple = randomized valid ground / house landing', $legendFont, $white, 910, 14)
  }

  foreach ($route in $nightRoutes) { Draw-DepthRoute $g $route ([System.Drawing.Color]::FromArgb(255,255,174,66)) $true }
  foreach ($route in $dayRoutes) { Draw-DepthRoute $g $route ([System.Drawing.Color]::FromArgb(255,80,236,153)) $false }
  foreach ($p in $teleports) {
    $r = if ($isMobile) { 5 } else { 10 }
    $g.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230,190,74,237)), $p.X-$r, $p.Y-$r, $r*2, $r*2)
    $g.DrawEllipse([System.Drawing.Pen]::new([System.Drawing.Color]::White, 2), $p.X-$r, $p.Y-$r, $r*2, $r*2)
  }

  $suffix = if ($isMobile) { 'mobile' } else { 'desktop' }
  $canvas.Save((Join-Path $out "$season-depth-paths-$suffix.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $titleFont.Dispose(); $legendFont.Dispose(); $white.Dispose(); $g.Dispose(); $canvas.Dispose()
}

New-CharacterReview

$ad = [System.Drawing.Size]::new(1920,380)
$am = [System.Drawing.Size]::new(390,170)

New-PathProof 'autumn' $ad 'public\assets\living-overworld\seasons\autumn\desktop.png' .88 `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(90,350),[System.Drawing.PointF]::new(330,325),[System.Drawing.PointF]::new(560,342),[System.Drawing.PointF]::new(790,312)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1110,344),[System.Drawing.PointF]::new(1330,310),[System.Drawing.PointF]::new(1560,338),[System.Drawing.PointF]::new(1810,300))) `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(145,314),[System.Drawing.PointF]::new(385,290),[System.Drawing.PointF]::new(625,310),[System.Drawing.PointF]::new(835,282)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1060,308),[System.Drawing.PointF]::new(1280,282),[System.Drawing.PointF]::new(1510,305),[System.Drawing.PointF]::new(1735,274))) `
  @([System.Drawing.PointF]::new(210,300),[System.Drawing.PointF]::new(520,325),[System.Drawing.PointF]::new(720,292),[System.Drawing.PointF]::new(1230,315),[System.Drawing.PointF]::new(1385,235),[System.Drawing.PointF]::new(1680,294))

New-PathProof 'winter' $ad 'public\assets\living-overworld\seasons\winter\desktop.png' .70 `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(80,354),[System.Drawing.PointF]::new(320,326),[System.Drawing.PointF]::new(560,346),[System.Drawing.PointF]::new(800,314)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1060,350),[System.Drawing.PointF]::new(1290,315),[System.Drawing.PointF]::new(1530,341),[System.Drawing.PointF]::new(1800,306))) `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(145,316),[System.Drawing.PointF]::new(390,290),[System.Drawing.PointF]::new(625,314),[System.Drawing.PointF]::new(840,284)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1030,315),[System.Drawing.PointF]::new(1260,286),[System.Drawing.PointF]::new(1495,311),[System.Drawing.PointF]::new(1740,278))) `
  @([System.Drawing.PointF]::new(220,303),[System.Drawing.PointF]::new(525,330),[System.Drawing.PointF]::new(735,294),[System.Drawing.PointF]::new(1210,323),[System.Drawing.PointF]::new(1320,246),[System.Drawing.PointF]::new(1680,295))

New-PathProof 'autumn' $am 'public\assets\living-overworld\seasons\autumn\mobile.png' .58 `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(12,157),[System.Drawing.PointF]::new(73,139),[System.Drawing.PointF]::new(138,153),[System.Drawing.PointF]::new(190,132)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(220,156),[System.Drawing.PointF]::new(270,136),[System.Drawing.PointF]::new(326,151),[System.Drawing.PointF]::new(380,130))) `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(18,135),[System.Drawing.PointF]::new(78,120),[System.Drawing.PointF]::new(142,134),[System.Drawing.PointF]::new(194,116)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(216,136),[System.Drawing.PointF]::new(270,117),[System.Drawing.PointF]::new(328,133),[System.Drawing.PointF]::new(378,113))) `
  @([System.Drawing.PointF]::new(44,122),[System.Drawing.PointF]::new(145,132),[System.Drawing.PointF]::new(250,128),[System.Drawing.PointF]::new(302,91),[System.Drawing.PointF]::new(360,118))

New-PathProof 'winter' $am 'public\assets\living-overworld\seasons\winter\mobile.png' .58 `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(12,158),[System.Drawing.PointF]::new(74,140),[System.Drawing.PointF]::new(138,154),[System.Drawing.PointF]::new(191,133)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(220,158),[System.Drawing.PointF]::new(270,138),[System.Drawing.PointF]::new(327,153),[System.Drawing.PointF]::new(380,132))) `
  @([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(18,136),[System.Drawing.PointF]::new(78,121),[System.Drawing.PointF]::new(142,135),[System.Drawing.PointF]::new(195,117)),[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(216,137),[System.Drawing.PointF]::new(270,119),[System.Drawing.PointF]::new(328,134),[System.Drawing.PointF]::new(378,115))) `
  @([System.Drawing.PointF]::new(48,124),[System.Drawing.PointF]::new(148,134),[System.Drawing.PointF]::new(250,130),[System.Drawing.PointF]::new(303,92),[System.Drawing.PointF]::new(360,120))

