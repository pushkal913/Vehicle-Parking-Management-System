# Quick deploy script to fix email verification

Write-Host "🚀 Deploying email verification fix..." -ForegroundColor Cyan

# Navigate to project root
Set-Location "c:\Users\pushk\OneDrive\Documents\University Parking System"

# Git add and commit
git add .
git commit -m "Fix: Email verification with standalone HTML page and proper redirects"

# Push to GitHub
git push origin main

Write-Host ""
Write-Host "✅ Deployed! Changes will be live on Render in a few minutes." -ForegroundColor Green
Write-Host "🔗 Your site: https://vehicle-parking-management-system-fo6x.onrender.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "📧 Email verification will now work with:" -ForegroundColor Cyan
Write-Host "   - Standalone verification page (no React Router dependency)" -ForegroundColor White
Write-Host "   - Proper Firebase integration with all parameters" -ForegroundColor White
Write-Host "   - Clear success/error messages" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Wait 3-5 minutes for Render to rebuild, then test with your verification email!" -ForegroundColor Yellow
