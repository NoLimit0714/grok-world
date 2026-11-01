# Start Grok World (bridge + web) from AI_Lab
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Corporate / local SSL interceptors need the system CA store on Node 24+
if (-not $env:NODE_OPTIONS) { $env:NODE_OPTIONS = "--use-system-ca" }
elseif ($env:NODE_OPTIONS -notmatch "use-system-ca") { $env:NODE_OPTIONS = "$env:NODE_OPTIONS --use-system-ca" }

if (-not (Test-Path (Join-Path $Root ".env"))) {
  Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env")
  Write-Host "Created .env from .env.example"
  & (Join-Path $PSScriptRoot "ensure-secrets.ps1")
}

Write-Host "Add secrets in .env (not chat): XAI_API_KEY, GROK_WEBHOOK_URL, GROK_WEBHOOK_KEY"

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Host "Installing dependencies…"
  npm install
}

Write-Host "Bridge: http://127.0.0.1:8787"
Write-Host "World UI: http://127.0.0.1:5178"
npm run dev
