#!/usr/bin/env pwsh
# Deploy Pork Price Scraper Cloud Function

Write-Host "========================================"
Write-Host "  Deploying Pork Price Scraper"
Write-Host "  Firebase Cloud Function"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check Firebase CLI
Write-Host "[1/3] Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "ERROR: Firebase CLI not found" -ForegroundColor Red
    Write-Host "Install: npm install -g firebase-tools"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Firebase CLI found" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "[2/3] Checking function dependencies..." -ForegroundColor Yellow
Set-Location functions
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}
Set-Location ..

# Deploy
Write-Host ""
Write-Host "[3/3] Deploying Cloud Function..." -ForegroundColor Yellow
Write-Host "This may take 1-2 minutes..." -ForegroundColor Gray
Write-Host ""

firebase deploy --only functions:scrapePorkPrices

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Function deployed" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Function URL:"
    Write-Host "https://asia-southeast1-pinthip-checkin.cloudfunctions.net/scrapePorkPrices" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open your web app"
    Write-Host "2. Go to 'ราคาหมูเป็น' > 'นำเข้าจำนวนมาก'"
    Write-Host "3. Click 'เริ่มดึงข้อมูล'"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if you're logged in: firebase login"
    Write-Host "2. Check project: firebase use pinthip-checkin"
    Write-Host "3. Check logs above for errors"
    Write-Host ""
}

Read-Host "Press Enter to exit"
