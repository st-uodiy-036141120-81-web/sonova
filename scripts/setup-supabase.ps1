# Sonova — automated Supabase setup
# Prerequisites: create a token at https://supabase.com/dashboard/account/tokens
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\setup-supabase.ps1

$ErrorActionPreference = "Stop"
$SiteUrl = "https://sonova.st-uodiy-036141120-81.workers.dev"
$RedirectUrls = "$SiteUrl/**,http://localhost:5173/**"
$ProjectName = "sonova"
$DbPassword = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Set SUPABASE_ACCESS_TOKEN first (https://supabase.com/dashboard/account/tokens)" -ForegroundColor Red
  exit 1
}

$headers = @{
  Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

function Invoke-Supa($Method, $Uri, $Body = $null) {
  $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
  return Invoke-RestMethod @params
}

Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Listing organizations..." -ForegroundColor Cyan
$orgs = Invoke-Supa GET "https://api.supabase.com/v1/organizations"
if (-not $orgs -or $orgs.Count -eq 0) { throw "No Supabase organization found" }
$orgId = $orgs[0].id
Write-Host "Using org: $($orgs[0].name) ($orgId)"

Write-Host "Listing projects..." -ForegroundColor Cyan
$projects = Invoke-Supa GET "https://api.supabase.com/v1/projects"
$project = $projects | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1

if (-not $project) {
  Write-Host "Creating project '$ProjectName' (may take 2-3 min)..." -ForegroundColor Cyan
  $project = Invoke-Supa POST "https://api.supabase.com/v1/projects" @{
    organization_id = $orgId
    name            = $ProjectName
    db_pass         = $DbPassword
    region          = "eu-central-1"
  }
  $ref = $project.id
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    $project = Invoke-Supa GET "https://api.supabase.com/v1/projects/$ref"
    if ($project.status -eq "ACTIVE_HEALTHY") { break }
    Write-Host "  status: $($project.status)..."
  }
} else {
  Write-Host "Project exists: $($project.name) ($($project.id))"
}

$ref = $project.id
$apiUrl = "https://$ref.supabase.co"

Write-Host "Fetching API keys..." -ForegroundColor Cyan
$keys = Invoke-Supa GET "https://api.supabase.com/v1/projects/$ref/api-keys"
$anon = ($keys | Where-Object { $_.name -eq "anon" -or $_.name -eq "anon key" -or $_.type -eq "anon" } | Select-Object -First 1).api_key
if (-not $anon) { $anon = $keys[0].api_key }

Write-Host "Configuring Auth URLs..." -ForegroundColor Cyan
Invoke-Supa PATCH "https://api.supabase.com/v1/projects/$ref/config/auth" @{
  site_url       = $SiteUrl
  uri_allow_list = $RedirectUrls
} | Out-Null

Write-Host "Linking Supabase CLI..." -ForegroundColor Cyan
$env:SUPABASE_ACCESS_TOKEN = $env:SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref $ref --password $DbPassword 2>$null
if ($LASTEXITCODE -ne 0 -and $project.status -eq "ACTIVE_HEALTHY") {
  Write-Host "Link skipped (existing project or password unknown). Run SQL manually in dashboard." -ForegroundColor Yellow
}

if (Test-Path "supabase\.temp\project-ref") {
  Write-Host "Running full_setup.sql..." -ForegroundColor Cyan
  npx supabase db execute --file supabase/full_setup.sql --linked
  Write-Host "Running storage_setup.sql..." -ForegroundColor Cyan
  npx supabase db execute --file supabase/storage_setup.sql --linked
}

Write-Host "Setting GitHub secrets..." -ForegroundColor Cyan
gh secret set VITE_SUPABASE_URL -R st-uodiy-036141120-81-web/sonova -b $apiUrl
gh secret set VITE_SUPABASE_ANON_KEY -R st-uodiy-036141120-81-web/sonova -b $anon

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "  URL:  $apiUrl"
Write-Host "  Ref:  $ref"
Write-Host "  Site: $SiteUrl"
Write-Host ""
Write-Host "Trigger redeploy: gh workflow run 'Deploy to Cloudflare' -R st-uodiy-036141120-81-web/sonova"
