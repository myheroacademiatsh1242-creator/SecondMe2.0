Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

# In top band (Y=16..271), let's see how Left (walls/fence, X < 520) and Right (gates/pillars, X >= 520) are structured.
function AnalyzeRegion($x1, $y1, $x2, $y2, $name) {
    Write-Host "`n=== $name (X=$x1..$x2, Y=$y1..$y2) ==="
    $rowHas = New-Object 'bool[]' ($y2 - $y1 + 1)
    for ($y = $y1; $y -le $y2; $y++) {
        for ($x = $x1; $x -le $x2; $x++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
                $rowHas[$y - $y1] = $true
                break
            }
        }
    }
    $inR = $false; $sy = 0
    for ($y = $y1; $y -le $y2; $y++) {
        $has = $rowHas[$y - $y1]
        if ($has -and -not $inR) { $inR = $true; $sy = $y }
        elseif (-not $has -and $inR) {
            $inR = $false
            Write-Host "Row: Y=$sy..$($y-1) (H=$($y - $sy))"
            FindCols $x1 $sy $x2 ($y-1)
        }
    }
    if ($inR) {
        Write-Host "Row: Y=$sy..$y2 (H=$($y2 - $sy + 1))"
        FindCols $x1 $sy $x2 $y2
    }
}

function FindCols($x1, $y1, $x2, $y2) {
    $colHas = New-Object 'bool[]' ($x2 - $x1 + 1)
    for ($x = $x1; $x -le $x2; $x++) {
        for ($y = $y1; $y -le $y2; $y++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
                $colHas[$x - $x1] = $true
                break
            }
        }
    }
    $inC = $false; $sx = 0
    for ($x = $x1; $x -le $x2; $x++) {
        $has = $colHas[$x - $x1]
        if ($has -and -not $inC) { $inC = $true; $sx = $x }
        elseif (-not $has -and $inC) {
            $inC = $false
            if (($x - $sx) -gt 5) {
                Write-Host "  Col: X=$sx..$($x-1) (W=$($x - $sx))"
            }
        }
    }
    if ($inC -and ($x2 - $sx + 1) -gt 5) {
        Write-Host "  Col: X=$sx..$x2 (W=$($x2 - $sx + 1))"
    }
}

AnalyzeRegion 10 16 520 271 "Top-Left: Walls & Fences"
AnalyzeRegion 520 16 1020 271 "Top-Right: Gates & Pillars"
