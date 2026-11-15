$source = (Get-Location).Path
$output = Join-Path (Split-Path $source -Parent) "Aha-Debug-Safe.zip"
$temp = Join-Path $env:TEMP ("AhaSafe-" + [guid]::NewGuid())

$excludedFolders = @(
    ".git", "node_modules", "dist", "build",
    ".vercel", ".next", "coverage", ".cache"
)

New-Item -ItemType Directory -Path $temp | Out-Null

try {
    Get-ChildItem -LiteralPath $source -Recurse -File -Force |
        Where-Object {
            $relative = $_.FullName.Substring($source.Length).TrimStart('\','/')
            $parts = $relative -split '[\\/]'
            $name = $_.Name

            -not ($parts | Where-Object { $_ -in $excludedFolders }) -and
            $name -notlike ".env*" -and
            $name -notin @(".npmrc", ".netrc", "id_rsa", "id_ed25519", "pack-aha.ps1") -and
            $name -notmatch '\.(pem|key|p12|pfx|zip|log)$' -and
            $name -notmatch '(?i)(secret|credential|service.account)'
        } |
        ForEach-Object {
            $relative = $_.FullName.Substring($source.Length).TrimStart('\','/')
            $destination = Join-Path $temp $relative

            New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $destination
        }

    Compress-Archive -Path "$temp\*" -DestinationPath $output -Force
    Write-Host "ZIP created: $output"
}
finally {
    Remove-Item -LiteralPath $temp -Recurse -Force
}
