Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

function FindBoxesInBand($minY, $maxY, $bandName) {
    Write-Host "`n=== $bandName (Y=$minY..$maxY) ==="
    $colHas = New-Object 'bool[]' $bmp.Width
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = $minY; $y -le $maxY; $y++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
                $colHas[$x] = $true
                break
            }
        }
    }

    $cols = [System.Collections.Generic.List[PSObject]]::new()
    $inCol = $false
    $startX = 0
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        if ($colHas[$x] -and -not $inCol) {
            $inCol = $true
            $startX = $x
        } elseif (-not $colHas[$x] -and $inCol) {
            $inCol = $false
            $cols.Add([PSCustomObject]@{ StartX = $startX; EndX = $x - 1; Width = $x - $startX })
        }
    }
    if ($inCol) {
        $cols.Add([PSCustomObject]@{ StartX = $startX; EndX = $bmp.Width - 1; Width = $bmp.Width - $startX })
    }

    foreach ($col in $cols) {
        # Inside this column, find exact Y bounds
        $realMinY = $maxY
        $realMaxY = $minY
        for ($y = $minY; $y -le $maxY; $y++) {
            for ($x = $col.StartX; $x -le $col.EndX; $x++) {
                $c = $bmp.GetPixel($x, $y)
                if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
                    if ($y -lt $realMinY) { $realMinY = $y }
                    if ($y -gt $realMaxY) { $realMaxY = $y }
                }
            }
        }
        $h = $realMaxY - $realMinY + 1
        Write-Host "Item: X=$($col.StartX)..$($col.EndX) (W=$($col.Width)), Y=$realMinY..$realMaxY (H=$h)"
    }
}

FindBoxesInBand 502 567 "Ground Tiles"
FindBoxesInBand 410 479 "Props"
FindBoxesInBand 288 400 "Plates, Portals, Grates"
