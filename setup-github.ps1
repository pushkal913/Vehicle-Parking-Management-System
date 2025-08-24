# University Parking System - GitHub Setup Script (PowerShell)
# This script prepares your codebase for GitHub and deployment

Write-Host "Setting up University Parking System for GitHub deployment..." -ForegroundColor Green

# Check if Git is initialized
if (!(Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

# Remove sensitive files from Git tracking if they exist
Write-Host "Removing sensitive files from Git tracking..." -ForegroundColor Yellow
try {
    git rm --cached frontend/.env 2>$null
    git rm --cached backend/.env 2>$null
    git rm --cached DEMO_ACCOUNTS.md 2>$null
    git rm --cached -r scripts/ 2>$null
} catch {
    # Ignore errors if files don't exist in git
}

# Add all changes
Write-Host "Adding files to Git..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$changes = git diff --staged --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m "Prepare for production deployment

- Add deployment configurations for Render
- Secure environment variables with examples
- Update Firebase config for production
- Add comprehensive deployment documentation
- Remove sensitive data from repository"
} else {
    Write-Host "No changes to commit" -ForegroundColor Blue
}

Write-Host ""
Write-Host "Repository prepared for GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Create a new repository on GitHub"
Write-Host "2. Add the remote origin:"
Write-Host "   git remote add origin https://github.com/yourusername/university-parking-system.git"
Write-Host "3. Push to GitHub:"
Write-Host "   git push -u origin main"
Write-Host "4. Follow DEPLOYMENT.md for Render setup"
Write-Host ""
Write-Host "Security Checklist:" -ForegroundColor Cyan
Write-Host "- Environment files excluded from Git"
Write-Host "- Demo credentials excluded from Git"
Write-Host "- Firebase config uses environment variables"
Write-Host "- Example environment files provided"
Write-Host ""
Write-Host "Ready for deployment!" -ForegroundColor Green
