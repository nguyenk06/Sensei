param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)

Add-Type -AssemblyName System.Drawing
$out = Join-Path $Root 'docs\assets\living-overworld-creature-proof'

function Get-FirstFrame([string]$relativePath) {
  $source = [System.Drawing.Bitmap]::new((Join-Path $Root $relativePath))
  $cellWidth = [int][Math]::Floor($source.Width / 8)
  $left = $cellWidth; $top = $source.Height; $right = 0; $bottom = 0
  for ($y = 0; $y -lt $source.Height; $y += 2) {
    for ($x = 0; $x -lt $cellWidth; $x += 2) {
      if ($source.GetPixel($x, $y).A -gt 16) {
        if ($x -lt $left) { $left = $x }; if ($x -gt $right) { $right = $x }
        if ($y -lt $top) { $top = $y }; if ($y -gt $bottom) { $bottom = $y }
      }
    }
  }
  $left = [Math]::Max(0, $left - 3); $top = [Math]::Max(0, $top - 3)
  $right = [Math]::Min($cellWidth - 1, $right + 3); $bottom = [Math]::Min($source.Height - 1, $bottom + 3)
  $crop = [System.Drawing.Bitmap]::new($right - $left + 1, $bottom - $top + 1, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($source, [System.Drawing.Rectangle]::new(0,0,$crop.Width,$crop.Height), [System.Drawing.Rectangle]::new($left,$top,$crop.Width,$crop.Height), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $source.Dispose(); return $crop
}

$sprites = @{
  wolf = Get-FirstFrame 'docs\assets\living-overworld-creature-proof\wolf-sheet.png'
  chicken = Get-FirstFrame 'public\assets\overworld-v04\animals\chicken.png'
  pig = Get-FirstFrame 'public\assets\overworld-v04\animals\pig.png'
  zombie = Get-FirstFrame 'docs\assets\living-overworld-creature-proof\zombie-sheet-v2.png'
  skeleton = Get-FirstFrame 'docs\assets\living-overworld-creature-proof\skeleton-sheet-v2.png'
  enderman = Get-FirstFrame 'docs\assets\living-overworld-creature-proof\enderman-sheet.png'
}

function Draw-Cover($graphics, $image, $bounds, [double]$positionY) {
  $scale = [Math]::Max($bounds.Width / $image.Width, $bounds.Height / $image.Height)
  $width = $image.Width * $scale; $height = $image.Height * $scale
  $x = $bounds.X + (($bounds.Width - $width) / 2); $y = $bounds.Y + (($bounds.Height - $height) * $positionY)
  $graphics.DrawImage($image, [single]$x, [single]$y, [single]$width, [single]$height)
}

function Draw-Character($graphics, [string]$name, [float]$x, [float]$baseline, [float]$height, [bool]$label) {
  $sprite = $sprites[$name]
  $width = $sprite.Width * ($height / $sprite.Height)
  $graphics.DrawImage($sprite, $x - ($width / 2), $baseline - $height, $width, $height)
  if ($label) {
    $font = [System.Drawing.Font]::new('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $text = "$name · $([int]$height)px"
    $measure = $graphics.MeasureString($text, $font)
    $box = [System.Drawing.RectangleF]::new($x - ($measure.Width / 2) - 4, $baseline - $height - 23, $measure.Width + 8, 20)
    $graphics.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205,7,24,31)), $box)
    $graphics.DrawString($text, $font, [System.Drawing.Brushes]::White, $box.X + 4, $box.Y + 1)
    $font.Dispose()
  }
}

function Draw-RouteAndHop($graphics, [bool]$mobile) {
  if ($mobile) {
    [System.Drawing.PointF[]]$points = @([System.Drawing.PointF]::new(8,156),[System.Drawing.PointF]::new(72,137),[System.Drawing.PointF]::new(145,151),[System.Drawing.PointF]::new(184,134))
    [System.Drawing.PointF[]]$right = @([System.Drawing.PointF]::new(218,136),[System.Drawing.PointF]::new(270,151),[System.Drawing.PointF]::new(330,138),[System.Drawing.PointF]::new(382,154))
  } else {
    [System.Drawing.PointF[]]$points = @([System.Drawing.PointF]::new(70,350),[System.Drawing.PointF]::new(360,320),[System.Drawing.PointF]::new(690,342),[System.Drawing.PointF]::new(875,312))
    [System.Drawing.PointF[]]$right = @([System.Drawing.PointF]::new(1045,314),[System.Drawing.PointF]::new(1260,342),[System.Drawing.PointF]::new(1540,320),[System.Drawing.PointF]::new(1845,348))
  }
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(178,90,238,173), $(if ($mobile){2}else{4}))
  $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLines($pen, $points); $graphics.DrawLines($pen, $right)
  $hopPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(235,255,196,70), $(if ($mobile){2}else{4}))
  $hopPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  if ($mobile) { $graphics.DrawBezier($hopPen, 184,134,194,112,208,112,218,136) }
  else { $graphics.DrawBezier($hopPen, 875,312,918,250,1002,250,1045,314) }
  $pen.Dispose(); $hopPen.Dispose()
}

function New-ScenePanel([string]$season, [string]$light, [int]$width, [int]$height, $placements) {
  $mobile = $width -lt 600
  $canvas = [System.Drawing.Bitmap]::new($width,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas); $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $sky = if ($light -eq 'night') { [System.Drawing.Color]::FromArgb(255,5,18,45) } else { [System.Drawing.Color]::FromArgb(255,112,190,226) }
  $g.Clear($sky)
  $variant = if ($light -eq 'night') { 'night-' } else { '' }
  $device = if ($mobile) { 'mobile' } else { 'desktop' }
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root "public\assets\living-overworld\seasons\$season\$variant$device.png"))
  $positionY = if ($mobile) { .58 } elseif ($season -eq 'autumn') { .88 } else { .70 }
  Draw-Cover $g $img ([System.Drawing.Rectangle]::new(0,0,$width,$height)) $positionY; $img.Dispose()
  Draw-RouteAndHop $g $mobile
  foreach ($p in $placements) { Draw-Character $g $p.name $p.x $p.y $p.height $true }
  $font = [System.Drawing.Font]::new('Segoe UI', $(if($mobile){9}else{15}), [System.Drawing.FontStyle]::Bold)
  $caption = "$($season.Substring(0,1).ToUpper()+$season.Substring(1)) · $light · shared route · bank hop"
  $g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205,7,24,31)), 6, 6, $(if($mobile){230}else{430}), $(if($mobile){20}else{30}))
  $g.DrawString($caption,$font,[System.Drawing.Brushes]::White,10,$(if($mobile){8}else{9}))
  $font.Dispose(); $g.Dispose(); return $canvas
}

function Save-Review([string]$season, [bool]$mobile, $dayPlacements, $nightPlacements) {
  $w = if ($mobile) { 390 } else { 1920 }; $panelH = if ($mobile) { 170 } else { 380 }; $gap = if($mobile){8}else{14}
  $day = New-ScenePanel $season 'day' $w $panelH $dayPlacements
  $night = New-ScenePanel $season 'night' $w $panelH $nightPlacements
  $review = [System.Drawing.Bitmap]::new($w,($panelH*2)+$gap,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($review); $g.Clear([System.Drawing.Color]::FromArgb(255,12,24,31)); $g.DrawImageUnscaled($day,0,0); $g.DrawImageUnscaled($night,0,$panelH+$gap)
  $suffix = if($mobile){'mobile'}else{'desktop'}
  $review.Save((Join-Path $out "$season-creature-placement-$suffix.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $day.Dispose(); $night.Dispose(); $review.Dispose()
}

Save-Review 'autumn' $false `
  @(@{name='wolf';x=260;y=342;height=48},@{name='chicken';x=600;y=312;height=26},@{name='pig';x=1600;y=329;height=44}) `
  @(@{name='skeleton';x=1120;y=338;height=56},@{name='zombie';x=1300;y=338;height=56},@{name='enderman';x=1480;y=304;height=66})
Save-Review 'winter' $false `
  @(@{name='wolf';x=300;y=342;height=48},@{name='chicken';x=640;y=312;height=26},@{name='pig';x=1580;y=330;height=44}) `
  @(@{name='skeleton';x=1110;y=339;height=56},@{name='zombie';x=1290;y=339;height=56},@{name='enderman';x=1510;y=306;height=66})
Save-Review 'autumn' $true @(@{name='wolf';x=84;y=151;height=29}) @(@{name='zombie';x=292;y=151;height=34})
Save-Review 'winter' $true @(@{name='wolf';x=85;y=152;height=29}) @(@{name='skeleton';x=292;y=152;height=34})

foreach ($sprite in $sprites.Values) { $sprite.Dispose() }

