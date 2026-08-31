@echo off
echo ========================================
echo   Deploying Pork Price Scraper
echo   Firebase Cloud Function
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Firebase CLI...
where firebase >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found
    echo Install: npm install -g firebase-tools
    pause
    exit /b 1
)

echo [2/3] Installing function dependencies...
cd functions
if not exist node_modules (
    echo Installing npm packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)
cd ..

echo.
echo [3/3] Deploying Cloud Function...
echo This may take 1-2 minutes...
echo.

firebase deploy --only functions:scrapePorkPrices

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! Function deployed
    echo ========================================
    echo.
    echo Function URL:
    echo https://asia-southeast1-pinthip-checkin.cloudfunctions.net/scrapePorkPrices
    echo.
    echo Next steps:
    echo 1. Open your web app
    echo 2. Go to "ราคาหมูเป็น" ^> "นำเข้าจำนวนมาก"
    echo 3. Click "เริ่มดึงข้อมูล"
    echo.
) else (
    echo.
    echo ========================================
    echo   DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Troubleshooting:
    echo 1. Check if you're logged in: firebase login
    echo 2. Check project: firebase use pinthip-checkin
    echo 3. Check logs above for errors
    echo.
)

pause
