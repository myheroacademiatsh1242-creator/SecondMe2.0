Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

function InspectSubRect($x1, $y1, $x2, $y2, $name) {
    Write-Host "`nSub-Rect: $name (X=$x1..$x2, Y=$y1..$y2)"
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
            Write-Host "  Sub-Row: Y=$sy..$($y-1) (H=$($y - $sy))"
        }
    }
    if ($inR) {
        Write-Host "  Sub-Row: Y=$sy..$y2 (H=$($y2 - $sy + 1))"
    }
}

InspectSubRect 16 16 125 200 "Col 1 (X=16..125)"
InspectSubRect 130 16 295 200 "Col 2 (X=130..295)"
InspectSubRect 300 16 470 200 "Col 3 (X=300..470)"
InspectSubRect 16 200 500 275 "Fence Row (Y=200..275)"
