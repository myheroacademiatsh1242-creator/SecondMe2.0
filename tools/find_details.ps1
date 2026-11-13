Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

# Fence inspection
$colHas = New-Object 'bool[]' 440
for ($x = 17; $x -le 450; $x++) {
    for ($y = 206; $y -le 271; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
            $colHas[$x - 17] = $true
            break
        }
    }
}
$inC = $false; $sx = 17
for ($x = 17; $x -le 450; $x++) {
    $has = $colHas[$x - 17]
    if ($has -and -not $inC) { $inC = $true; $sx = $x }
    elseif (-not $has -and $inC) {
        $inC = $false
        Write-Host "Fence Col: X=$sx..$($x-1) (W=$($x - $sx))"
    }
}
if ($inC) {
    Write-Host "Fence Col: X=$sx..450 (W=$(451 - $sx))"
}

# Also let's inspect the pressure plates in Y=288..400
# Notice X=16..81, X=90..236
# Let's inspect sub-columns inside X=90..236
$colHas2 = New-Object 'bool[]' 160
for ($x = 90; $x -le 240; $x++) {
    for ($y = 295; $y -le 395; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
            $colHas2[$x - 90] = $true
            break
        }
    }
}
$inC2 = $false; $sx2 = 90
for ($x = 90; $x -le 240; $x++) {
    $has = $colHas2[$x - 90]
    if ($has -and -not $inC2) { $inC2 = $true; $sx2 = $x }
    elseif (-not $has -and $inC2) {
        $inC2 = $false
        Write-Host "Plates Col: X=$sx2..$($x-1) (W=$($x - $sx2))"
    }
}
if ($inC2) {
    Write-Host "Plates Col: X=$sx2..240 (W=$(241 - $sx2))"
}

# Also inspect Ground Tiles inside X=265..513, Y=502..567
$colHas3 = New-Object 'bool[]' 260
for ($x = 265; $x -le 515; $x++) {
    # Check if there's vertical dividing white line or grid lines
    $allWhite = $true
    for ($y = 502; $y -le 567; $y++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
            $allWhite = $false
            break
        }
    }
    if ($allWhite) {
        Write-Host "Ground tile gutter at X=$x"
    }
}
