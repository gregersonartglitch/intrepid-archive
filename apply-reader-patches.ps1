# Apply site-specific overlay onto reader/intrepid-dusk-volume-1/
# Called automatically by integrate-reader.ps1 after Codex package deploy.
# Can also run standalone to re-apply overlay without re-extracting the zip.
#
# Run from intrepid-map root:
#   .\apply-reader-patches.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Overlay = Join-Path $Root 'reader\overlay'
$Target  = Join-Path $Root 'reader\intrepid-dusk-volume-1'

if (-not (Test-Path $Overlay)) {
    Write-Error "Overlay directory not found: $Overlay"
}

if (-not (Test-Path (Join-Path $Target 'index.html'))) {
    Write-Error "Reader target not found: $Target`nRun integrate-reader.ps1 first."
}

# Files we own — copied over Codex package on every integrate
$patchFiles = @(
    'index.html',
    'styles.css',
    'spike.js',
    'audio.js'
)

$applied = @()
foreach ($file in $patchFiles) {
    $src = Join-Path $Overlay $file
    if (-not (Test-Path $src)) {
        Write-Warning "Overlay file missing (skipped): $file"
        continue
    }
    Copy-Item -Path $src -Destination (Join-Path $Target $file) -Force
    $applied += $file
}

# Audio assets — self-contained under reader (ambient + page-flip SFX)
$assetFiles = @(
    'assets\audio\ambient.mp3',
    'assets\page-flip.mp3'
)
foreach ($rel in $assetFiles) {
    $src = Join-Path $Overlay $rel
    if (-not (Test-Path $src)) {
        Write-Warning "Overlay asset missing (skipped): $rel"
        continue
    }
    $dest = Join-Path $Target $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $src -Destination $dest -Force
    $applied += $rel
}

Write-Host "Applied overlay ($($applied.Count) files) to $Target"
foreach ($f in $applied) { Write-Host "  + $f" }
