# Sonova — full deploy script
# Usage: copy .env.example to .env, fill Supabase keys, then run:
#   .\scripts\complete-setup.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
  Write-Host "Missing .env — copy .env.example and add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
  Copy-Item ".env.example" ".env"
  exit 1
}

Write-Host "Building..." -ForegroundColor Cyan
npm run build

Write-Host "Deploying site to Cloudflare Workers..." -ForegroundColor Cyan
npx wrangler deploy

Write-Host "Creating R2 bucket (if missing)..." -ForegroundColor Cyan
npx wrangler r2 bucket create sonova-media 2>$null

Write-Host "Deploying upload worker..." -ForegroundColor Cyan
npx wrangler deploy -c wrangler.upload.jsonc

Write-Host "Done. Site: https://sonova.st-uodiy-036141120-81.workers.dev" -ForegroundColor Green
