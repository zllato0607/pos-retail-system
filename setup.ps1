Write-Host "🔄 Setting up POS System Database..." -ForegroundColor Cyan

# Initialize database
Write-Host "📋 Initializing database..." -ForegroundColor Yellow
node init-database.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database initialized successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now start the server with: npm run dev" -ForegroundColor Green
    Write-Host "🔑 Login credentials: admin / admin123" -ForegroundColor Yellow
} else {
    Write-Host "❌ Database initialization failed!" -ForegroundColor Red
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
