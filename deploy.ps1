#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy completo do encurtador de URLs.
    Backend: Google Cloud Run | Frontend: Firebase Hosting

.PARAMETER SkipBackend
    Pula o deploy do backend (Cloud Run).

.PARAMETER SkipFrontend
    Pula o deploy do frontend (Firebase Hosting).

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -SkipFrontend
    .\deploy.ps1 -SkipBackend
#>

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
$PROJECT_ID  = 'fotoclick'
$REGION      = 'us-central1'
$SERVICE_API = 'encurtador-api'
$ROOT        = Split-Path -Parent $MyInvocation.MyCommand.Definition
$API_DIR     = Join-Path $ROOT 'encurtador-api'
$WEB_DIR     = Join-Path $ROOT 'encurtador-web'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Step([string]$msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-Ok([string]$msg) {
    Write-Host "    OK: $msg" -ForegroundColor Green
}

function Write-Fail([string]$msg) {
    Write-Host "`n    ERRO: $msg" -ForegroundColor Red
    exit 1
}

function Assert-Command([string]$name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Fail "'$name' não encontrado no PATH. Instale antes de continuar."
    }
}

# ---------------------------------------------------------------------------
# Verificações iniciais
# ---------------------------------------------------------------------------
Write-Step 'Verificando pré-requisitos'
Assert-Command 'gcloud'
Assert-Command 'firebase'
Assert-Command 'npm'

$activeProject = (gcloud config get-value project 2>$null).Trim()
if ($activeProject -ne $PROJECT_ID) {
    Write-Step "Definindo projeto gcloud para '$PROJECT_ID'"
    gcloud config set project $PROJECT_ID --quiet
}
Write-Ok "Projeto gcloud: $PROJECT_ID"

# ---------------------------------------------------------------------------
# 1. BACKEND — Google Cloud Run
# ---------------------------------------------------------------------------
if (-not $SkipBackend) {
    Write-Step "Publicando backend no Cloud Run ($SERVICE_API @ $REGION)"

    Push-Location $ROOT
    try {
        gcloud run deploy $SERVICE_API `
            --source $API_DIR `
            --region $REGION `
            --allow-unauthenticated `
            --quiet

        if ($LASTEXITCODE -ne 0) { Write-Fail 'gcloud run deploy falhou.' }
    } finally {
        Pop-Location
    }

    Write-Ok 'Backend publicado.'

    # URL do serviço
    $backendUrl = (gcloud run services describe $SERVICE_API `
        --region $REGION `
        --format 'value(status.url)' 2>$null).Trim()

    Write-Ok "URL do backend: $backendUrl"
} else {
    Write-Host "`n    [SkipBackend] Deploy do backend ignorado." -ForegroundColor DarkGray

    $backendUrl = (gcloud run services describe $SERVICE_API `
        --region $REGION `
        --format 'value(status.url)' 2>$null).Trim()
}

# ---------------------------------------------------------------------------
# Versão do build: AAAAMMDD.X
# ---------------------------------------------------------------------------
$versionFile = Join-Path $ROOT 'build-version.txt'
$today       = (Get-Date).ToString('yyyyMMdd')

if (Test-Path $versionFile) {
    $lastVersion = (Get-Content $versionFile -Raw).Trim()
    if ($lastVersion -match '^(\d{8})\.(\d+)$') {
        if ($Matches[1] -eq $today) {
            $buildCounter = [int]$Matches[2] + 1
        } else {
            $buildCounter = 1
        }
    } else {
        $buildCounter = 1
    }
} else {
    $buildCounter = 1
}

$buildVersion = "$today.$buildCounter"
Set-Content -Path $versionFile -Value $buildVersion -NoNewline
Write-Ok "Versão do build: $buildVersion"

# Injeta a versão em environment.prod.ts antes de compilar
$envProdPath = Join-Path $WEB_DIR 'src\environments\environment.prod.ts'
$envProdContent = Get-Content $envProdPath -Raw
$envProdContent = $envProdContent -replace "version:\s*'[^']*'", "version: '$buildVersion'"
Set-Content -Path $envProdPath -Value $envProdContent -NoNewline

# ---------------------------------------------------------------------------
# 2. FRONTEND — Build Angular + Firebase Hosting
# ---------------------------------------------------------------------------
if (-not $SkipFrontend) {
    # 2a. Build
    Write-Step 'Build Angular (produção)'
    Push-Location $WEB_DIR
    try {
        npm run build -- --configuration production
        if ($LASTEXITCODE -ne 0) { Write-Fail 'npm run build falhou.' }
    } finally {
        Pop-Location
    }
    Write-Ok 'Build concluído.'

    # 2b. Deploy Firebase Hosting
    Write-Step "Publicando frontend no Firebase Hosting (projeto: $PROJECT_ID)"
    Push-Location $WEB_DIR
    try {
        firebase deploy --only hosting --project $PROJECT_ID
        if ($LASTEXITCODE -ne 0) { Write-Fail 'firebase deploy falhou.' }
    } finally {
        Pop-Location
    }
    Write-Ok 'Frontend publicado.'
} else {
    Write-Host "`n    [SkipFrontend] Deploy do frontend ignorado." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. Smoke test
# ---------------------------------------------------------------------------
Write-Step 'Smoke test das URLs públicas'

if ($backendUrl) {
    try {
        $health = (Invoke-RestMethod -Uri "$backendUrl/health" -Method Get -TimeoutSec 15)
        Write-Ok "Backend /health: $($health | ConvertTo-Json -Compress)"
    } catch {
        Write-Host "    AVISO: Smoke test do backend falhou: $_" -ForegroundColor Yellow
    }
}

if (-not $SkipFrontend) {
    try {
        $code = (Invoke-WebRequest -Uri "https://fotoclick.web.app" -UseBasicParsing -TimeoutSec 15).StatusCode
        Write-Ok "Frontend https://fotoclick.web.app: HTTP $code"
    } catch {
        Write-Host "    AVISO: Smoke test do frontend falhou: $_" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host '  Deploy concluido com sucesso!' -ForegroundColor Green
Write-Host "  Versão  : $buildVersion" -ForegroundColor White
if ($backendUrl) {
    Write-Host "  Backend : $backendUrl" -ForegroundColor White
}
if (-not $SkipFrontend) {
    Write-Host '  Frontend: https://fotoclick.web.app' -ForegroundColor White
}
Write-Host '======================================================' -ForegroundColor Cyan
