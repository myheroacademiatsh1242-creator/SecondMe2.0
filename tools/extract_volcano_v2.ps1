Add-Type -AssemblyName System.Drawing

$srcPath = "C:/Users/ROG STRIX/.gemini/antigravity/brain/529b819d-bd48-42f7-aa4c-0e3aa165e081/.user_uploaded/media_1794540682495_0c0c148b.jpg"
$bmp = [System.Drawing.Bitmap]::new($srcPath)

$outBase = "D:/Download/taogame/SecondMe2.0/public/assets/volcano/v2"

$dirs = @("walls", "gates", "plates", "portals", "grates", "props", "tiles")
foreach ($d in $dirs) {
    [System.IO.Directory]::CreateDirectory("$outBase/$d") | Out-Null
}

function SaveCropped($x, $y, $w, $h, $subDir, $name, $isTile=$false) {
    # Clamp bounds
    if ($x + $w -gt $bmp.Width) { $w = $bmp.Width - $x }
    if ($y + $h -gt $bmp.Height) { $h = $bmp.Height - $y }

    $targetBmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($py = 0; $py -lt $h; $py++) {
        for ($px = 0; $px -lt $w; $px++) {
            $c = $bmp.GetPixel($x + $px, $y + $py)
            if ($isTile) {
                # Ground tiles are solid, no transparency needed
                $targetBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
            } else {
                # Transparent background
                if ($c.R -ge 245 -and $c.G -ge 245 -and $c.B -ge 245) {
                    $targetBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                } elseif ($c.R -ge 235 -and $c.G -ge 235 -and $c.B -ge 235) {
                    # Slight antialias fade
                    $alpha = [int](255 * (1.0 - (($c.R + $c.G + $c.B) / 3.0 - 235) / 10.0))
                    if ($alpha -lt 0) { $alpha = 0 }
                    if ($alpha -gt 255) { $alpha = 255 }
                    $targetBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B))
                } else {
                    $targetBmp.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
                }
            }
        }
    }

    $outPath = "$outBase/$subDir/$name.png"
    $targetBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    Write-Host "Saved $subDir/$name.png ($w x $h)"
}

# 1. Ground Tiles (Solid 60x60 tiles)
SaveCropped 16 505 57 59 "tiles" "floor_basalt_plain" $true
SaveCropped 77 505 59 60 "tiles" "floor_basalt_smooth" $true
SaveCropped 140 505 58 62 "tiles" "floor_basalt_cracked" $true
SaveCropped 204 504 60 62 "tiles" "floor_lava_fissure" $true
SaveCropped 265 503 62 63 "tiles" "floor_lava_shore_corner" $true
SaveCropped 327 503 62 63 "tiles" "floor_lava_shore_straight" $true
SaveCropped 389 503 62 63 "tiles" "floor_lava_shore_variant" $true
SaveCropped 451 503 62 63 "tiles" "floor_lava_shore_inner" $true
SaveCropped 518 503 60 63 "tiles" "floor_lava_pool" $true

# 2. Props
SaveCropped 17 415 53 59 "props" "rock_boulder_dark"
SaveCropped 85 410 66 62 "props" "rock_coal_pile"
SaveCropped 166 411 78 69 "props" "shrub_burnt_bramble"
SaveCropped 265 417 83 55 "props" "log_ember_burnt"
SaveCropped 371 410 57 66 "props" "crystal_lava_cluster"
SaveCropped 441 423 63 49 "props" "coal_burning_mound"

# 3. Plates
SaveCropped 16 313 66 65 "plates" "plate_flame_dormant"
SaveCropped 90 313 66 65 "plates" "plate_flame_active"
SaveCropped 165 308 72 72 "plates" "plate_flame_ornate"

# 4. Portals & Wells
SaveCropped 252 288 112 113 "portals" "portal_lava_vortex"
SaveCropped 386 288 113 113 "portals" "portal_void_vortex"

# 5. Grates & Stepping Stones
SaveCropped 549 304 83 80 "grates" "grate_bars_plain"
SaveCropped 653 304 99 96 "grates" "grate_bars_lava"
SaveCropped 773 306 79 82 "grates" "grate_mesh_iron"
SaveCropped 884 297 51 87 "grates" "pedestal_stepping_dormant"
SaveCropped 952 298 54 85 "grates" "pedestal_stepping_glowing"

# 6. Gates (Stone archways & portcullis)
SaveCropped 544 18 103 108 "gates" "gate_arch_open"
SaveCropped 651 18 95 108 "gates" "gate_arch_chain"
SaveCropped 753 18 84 108 "gates" "gate_arch_broken_bars"
SaveCropped 544 150 106 106 "gates" "gate_bars_closed"
SaveCropped 654 150 106 106 "gates" "gate_bars_broken_glow"

# 7. Pillars
SaveCropped 847 18 44 109 "props" "pillar_tall_intact"
SaveCropped 904 18 43 109 "props" "pillar_tall_cracked"
SaveCropped 960 78 44 49 "props" "pillar_base_small"
SaveCropped 784 146 44 110 "props" "pillar_round_plain"
SaveCropped 841 146 47 110 "props" "pillar_round_cracked"
SaveCropped 896 160 54 96 "props" "pillar_broken_top"
SaveCropped 956 178 51 78 "props" "pillar_pedestal"

# 8. Walls & Fences
SaveCropped 16 16 106 66 "walls" "wall_basalt_plain_h"
SaveCropped 133 16 160 66 "walls" "wall_basalt_vein_h"
SaveCropped 304 16 60 112 "walls" "wall_basalt_slab_v"
SaveCropped 388 16 76 66 "walls" "wall_basalt_cap_sq"
SaveCropped 16 104 106 92 "walls" "wall_basalt_corner_tl"
SaveCropped 133 104 160 92 "walls" "wall_basalt_t_junction"
SaveCropped 245 104 48 92 "walls" "wall_basalt_corner_curve"
SaveCropped 304 150 126 50 "walls" "wall_basalt_horizontal"
SaveCropped 17 206 108 65 "walls" "fence_iron_short_1"
SaveCropped 128 206 108 65 "walls" "fence_iron_short_2"
SaveCropped 240 206 207 65 "walls" "fence_iron_long"
SaveCropped 459 206 42 65 "walls" "wall_post_end"

Write-Host "Extraction complete!"
