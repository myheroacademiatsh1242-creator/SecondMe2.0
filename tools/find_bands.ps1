Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

# Let's project rows and columns to find horizontal and vertical dividing gutters
$rowHasContent = New-Object 'bool[]' $bmp.Height
$colHasContent = New-Object 'bool[]' $bmp.Width

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
            $rowHasContent[$y] = $true
            $colHasContent[$x] = $true
        }
    }
}

# Find row bands
$bands = [System.Collections.Generic.List[PSObject]]::new()
$inBand = $false
$startY = 0
for ($y = 0; $y -lt $bmp.Height; $y++) {
    if ($rowHasContent[$y] -and -not $inBand) {
        $inBand = $true
        $startY = $y
    } elseif (-not $rowHasContent[$y] -and $inBand) {
        $inBand = $false
        $bands.Add([PSCustomObject]@{ StartY = $startY; EndY = $y - 1; Height = $y - $startY })
    }
}
if ($inBand) {
    $bands.Add([PSCustomObject]@{ StartY = $startY; EndY = $bmp.Height - 1; Height = $bmp.Height - $startY })
}

Write-Host "Found $($bands.Count) horizontal bands:"
$bands | ForEach-Object {
    Write-Host "Band: Y=$($_.StartY) to $($_.EndY), Height=$($_.Height)"
}
