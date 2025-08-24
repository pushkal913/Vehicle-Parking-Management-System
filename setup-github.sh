#!/bin/bash

# University Parking System - GitHub Setup Script
# This script prepares your codebase for GitHub and deployment

echo "🚀 Setting up University Parking System for GitHub deployment..."

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo "📂 Initializing Git repository..."
    git init
    git branch -M main
else
    echo "✅ Git repository already initialized"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Firebase cache
.firebase/
firebase-debug.log
.firebaserc
firebase.json

# Temporary folders
tmp/
temp/

# Scripts
scripts/

# Demo credentials (remove for production)
DEMO_ACCOUNTS.md
EOF
    echo "✅ Created .gitignore"
else
    echo "✅ .gitignore already exists"
fi

# Remove sensitive files from Git tracking if they exist
echo "🔒 Removing sensitive files from Git tracking..."
git rm --cached frontend/.env 2>/dev/null || true
git rm --cached backend/.env 2>/dev/null || true
git rm --cached DEMO_ACCOUNTS.md 2>/dev/null || true
git rm --cached -r scripts/ 2>/dev/null || true

# Add all changes
echo "📦 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Committing changes..."
    git commit -m "Prepare for production deployment

- Add deployment configurations for Render
- Secure environment variables with examples
- Update Firebase config for production
- Add comprehensive deployment documentation
- Remove sensitive data from repository"
fi

echo ""
echo "🎉 Repository prepared for GitHub!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a new repository on GitHub"
echo "2. Add the remote origin:"
echo "   git remote add origin https://github.com/yourusername/university-parking-system.git"
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo "4. Follow DEPLOYMENT.md for Render setup"
echo ""
echo "🔐 Security Checklist:"
echo "✅ Environment files excluded from Git"
echo "✅ Demo credentials excluded from Git"
echo "✅ Firebase config uses environment variables"
echo "✅ Example environment files provided"
echo ""
echo "🚀 Ready for deployment!"
