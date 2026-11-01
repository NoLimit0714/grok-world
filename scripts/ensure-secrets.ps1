# Rotate / create local secrets for Grok World (does not touch XAI or webhook keys).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env"
$Example = Join-Path $Root ".env.example"

if (-not (Test-Path $EnvFile)) {
  Copy-Item $Example $EnvFile
  Write-Host "Created .env from .env.example"
}

$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

$raw = Get-Content $EnvFile -Raw
if ($raw -match '(?m)^GROK_WORLD_TOKEN=') {
  $raw = $raw -replace '(?m)^GROK_WORLD_TOKEN=.*$', "GROK_WORLD_TOKEN=$token"
} else {
  $raw = $raw.TrimEnd() + "`r`nGROK_WORLD_TOKEN=$token`r`n"
}
Set-Content -Path $EnvFile -Value $raw -NoNewline

Write-Host "Wrote strong GROK_WORLD_TOKEN to .env"
Write-Host "Copy the same value into the web if needed:"
Write-Host "  VITE_GROK_WORLD_TOKEN=<same token>"
Write-Host "Or open http://127.0.0.1:5178/?token=<token> once (stored in localStorage)."
Write-Host ""
Write-Host "Still add yourself (never in chat):"
Write-Host "  XAI_API_KEY=...          from https://console.x.ai/"
Write-Host "  GROK_WEBHOOK_URL=...     from Grok routine panel"
Write-Host "  GROK_WEBHOOK_KEY=...     sender key from routine panel"
