# Integrate Intrepid Dusk Volume 1 reader package into intrepid-map/reader/
# Run from intrepid-map root after placing the upload package here.
#
# Expected source (either):
#   ./intrepid-dusk-volume-1-reader-upload.zip
#   ./intrepid-dusk-volume-1-reader-upload/
#
# Deploy target: reader/intrepid-dusk-volume-1/  (auth gate stays at reader/index.html)
#
# Workflow:
#   1. Codex ships intrepid-dusk-volume-1-reader-upload.zip (pages, vendor, base spike.js)
#   2. This script extracts/replaces reader/intrepid-dusk-volume-1/
#   3. apply-reader-patches.ps1 overlays site-specific files from reader/overlay/
#   See reader/README.md for what Codex owns vs what lives in overlay.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$ZipPath = Join-Path $Root 'intrepid-dusk-volume-1-reader-upload.zip'
$FolderPath = Join-Path $Root 'intrepid-dusk-volume-1-reader-upload'
$Target = Join-Path $Root 'reader\intrepid-dusk-volume-1'
$ExtractTemp = Join-Path $Root '.reader-extract-tmp'

function Test-ReaderPackage([string]$Dir) {
    $required = @(
        (Join-Path $Dir 'index.html'),
        (Join-Path $Dir 'styles.css'),
        (Join-Path $Dir 'spike.js'),
        (Join-Path $Dir 'vendor\page-flip.browser.js'),
        (Join-Path $Dir 'assets\manifest.json'),
        (Join-Path $Dir 'assets\pages\page-001.webp'),
        (Join-Path $Dir 'assets\pages\page-068.webp')
    )
    foreach ($f in $required) {
        if (-not (Test-Path $f)) {
            throw "Missing required file: $f"
        }
    }
}

function Get-PackageRoot([string]$Dir) {
    if (Test-Path (Join-Path $Dir 'index.html')) { return $Dir }
    $nested = Get-ChildItem -Path $Dir -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } |
        Select-Object -First 1
    if ($nested) { return $nested.FullName }
    throw "Could not find index.html in extracted package"
}

# Locate source
$Source = $null
if (Test-Path $FolderPath) {
    $Source = Get-PackageRoot $FolderPath
    Write-Host "Using folder: $Source"
} elseif (Test-Path $ZipPath) {
    if (Test-Path $ExtractTemp) { Remove-Item $ExtractTemp -Recurse -Force }
    New-Item -ItemType Directory -Path $ExtractTemp | Out-Null
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractTemp -Force
    $Source = Get-PackageRoot $ExtractTemp
    Write-Host "Extracted zip to: $Source"
} else {
    Write-Error @"
Reader package not found. Place one of these in $Root :
  intrepid-dusk-volume-1-reader-upload.zip
  intrepid-dusk-volume-1-reader-upload/
"@
}

Test-ReaderPackage $Source

# Deploy
if (Test-Path $Target) { Remove-Item $Target -Recurse -Force }
New-Item -ItemType Directory -Path $Target -Force | Out-Null
Copy-Item -Path (Join-Path $Source '*') -Destination $Target -Recurse -Force

# Verify page count
$pageCount = (Get-ChildItem (Join-Path $Target 'assets\pages\page-*.webp')).Count
Write-Host "Deployed $pageCount WebP pages to $Target"

if (Test-Path $ExtractTemp) { Remove-Item $ExtractTemp -Recurse -Force }

# Apply site-specific overlay (Archive link, viewport layout, merged spike.js)
$PatchScript = Join-Path $Root 'apply-reader-patches.ps1'
if (Test-Path $PatchScript) {
    Write-Host ''
    Write-Host 'Applying site overlay from reader/overlay/ ...'
    & $PatchScript
} else {
    Write-Warning "Patch script not found: $PatchScript - overlay not applied."
}

Write-Host ''
Write-Host 'Done. Auth gate: reader/index.html -> reader/intrepid-dusk-volume-1/'
Write-Host 'Test: npx http-server . -p 8080 --cors -c-1'
Write-Host '      http://localhost:8080/reader/ (requires localStorage auth)'
