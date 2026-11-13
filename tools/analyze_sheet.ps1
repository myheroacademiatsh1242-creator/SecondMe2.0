Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)
Write-Host "Image loaded: $($bmp.Width) x $($bmp.Height)"

# Sample background color
$c0 = $bmp.GetPixel(0, 0)
Write-Host "Corner 0,0: R=$($c0.R) G=$($c0.G) B=$($c0.B)"

# Find all connected components / non-white regions
$visited = New-Object 'bool[,]' $bmp.Width, $bmp.Height
$boxes = [System.Collections.Generic.List[PSObject]]::new()

function IsBg($c) {
    return ($c.R -ge 248 -and $c.G -ge 248 -and $c.B -ge 248)
}

# Scan grid or find non-bg components
for ($y = 0; $y -lt $bmp.Height; $y += 4) {
    for ($x = 0; $x -lt $bmp.Width; $x += 4) {
        if ($visited[$x, $y]) { continue }
        $c = $bmp.GetPixel($x, $y)
        if (-not (IsBg $c)) {
            # BFS flood fill to find bounding box
            $minX = $x; $maxX = $x; $minY = $y; $maxY = $y
            $q = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
            $q.Enqueue([System.Drawing.Point]::new($x, $y))
            $visited[$x, $y] = $true
            
            while ($q.Count -gt 0) {
                $p = $q.Dequeue()
                if ($p.X -lt $minX) { $minX = $p.X }
                if ($p.X -gt $maxX) { $maxX = $p.X }
                if ($p.Y -lt $minY) { $minY = $p.Y }
                if ($p.Y -gt $maxY) { $maxY = $p.Y }

                # check 4 neighbors step by 2 or 3 for speed
                $dx = @( -3, 3, 0, 0 )
                $dy = @( 0, 0, -3, 3 )
                for ($k = 0; $k -lt 4; $k++) {
                    $nx = $p.X + $dx[$k]
                    $ny = $p.Y + $dy[$k]
                    if ($nx -ge 0 -and $nx -lt $bmp.Width -and $ny -ge 0 -and $ny -lt $bmp.Height) {
                        if (-not $visited[$nx, $ny]) {
                            $visited[$nx, $ny] = $true
                            $nc = $bmp.GetPixel($nx, $ny)
                            if (-not (IsBg $nc)) {
                                $q.Enqueue([System.Drawing.Point]::new($nx, $ny))
                            }
                        }
                    }
                }
            }

            $w = $maxX - $minX + 1
            $h = $maxY - $minY + 1
            if ($w -ge 12 -and $h -ge 12) {
                $boxes.Add([PSCustomObject]@{
                    X = $minX; Y = $minY; W = $w; H = $h; Area = $w * $h
                })
            }
        }
    }
}

Write-Host "Found $($boxes.Count) bounding boxes:"
$boxes | Sort-Object Y, X | ForEach-Object {
    Write-Host "Box: X=$($_.X), Y=$($_.Y), W=$($_.W), H=$($_.H)"
}
