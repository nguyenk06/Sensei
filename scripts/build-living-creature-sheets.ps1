param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

Add-Type -AssemblyName System.Drawing

$destination = Join-Path $Root 'public\assets\living-overworld\creatures'
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$assets = @{
  wolf = 'docs\assets\living-overworld-creature-proof\wolf-sheet.png'
  chicken = 'public\assets\overworld-v04\animals\chicken.png'
  pig = 'public\assets\overworld-v04\animals\pig.png'
  zombie = 'docs\assets\living-overworld-creature-proof\zombie-sheet-v2.png'
  skeleton = 'docs\assets\living-overworld-creature-proof\skeleton-sheet-v2.png'
  enderman = 'docs\assets\living-overworld-creature-proof\enderman-sheet.png'
}

foreach ($entry in $assets.GetEnumerator()) {
  $source = [System.Drawing.Bitmap]::new([string](Join-Path $Root $entry.Value))
  $minimumY = $source.Height
  $maximumY = 0
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      if ($source.GetPixel($x, $y).A -gt 12) {
        if ($y -lt $minimumY) { $minimumY = $y }
        if ($y -gt $maximumY) { $maximumY = $y }
      }
    }
  }
  $minimumY = [Math]::Max(0, $minimumY - 4)
  $maximumY = [Math]::Min($source.Height - 1, $maximumY + 4)
  $height = $maximumY - $minimumY + 1
  $output = [System.Drawing.Bitmap]::new($source.Width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $source.Width, $height), [System.Drawing.Rectangle]::new(0, $minimumY, $source.Width, $height), [System.Drawing.GraphicsUnit]::Pixel)
  $output.Save((Join-Path $destination "$($entry.Key).png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $output.Dispose(); $source.Dispose()
}

