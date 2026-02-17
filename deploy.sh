#!/bin/bash
# Deployment script for ops.workflow-engine.org
# Run this from /home/node/clawd/projects/ops-workflow-engine/

set -e

echo "🚀 Deploying ops.workflow-engine.org..."

# Step 1: Push to GitHub
echo "📦 Step 1: Pushing to GitHub..."
git init
git config user.email "neo@openclaw.ai"
git config user.name "Neo"
git remote add origin https://github.com/Cybern3rd/ops-workflow-engine.git 2>/dev/null || git remote set-url origin https://github.com/Cybern3rd/ops-workflow-engine.git
git add .
git commit -m "Deploy ops.workflow-engine.org dashboard" || echo "Nothing to commit"
git branch -M main
git push -u origin main --force

echo "✅ Code pushed to GitHub!"

# Step 2: Create D1 Database
echo "📊 Step 2: Creating D1 database..."
wrangler d1 create ops-db

echo ""
echo "⚠️  IMPORTANT: Copy the database_id from above and update wrangler.toml line 8"
echo "Press Enter after updating wrangler.toml..."
read

# Step 3: Run migrations
echo "🔧 Step 3: Running database migrations..."
wrangler d1 execute ops-db --file=database/schema.sql --local
wrangler d1 execute ops-db --file=database/seed.sql --local

# Step 4: Deploy Workers
echo "☁️  Step 4: Deploying Workers API..."
wrangler deploy

# Step 5: Deploy to Cloudflare Pages
echo "🌐 Step 5: Building and deploying frontend..."
npm install
npm run build
wrangler pages deploy dist --project-name=ops-workflow-engine

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to Cloudflare DNS for workflow-engine.org"
echo "2. Add CNAME: ops → ops-workflow-engine.pages.dev"
echo "3. Visit https://ops.workflow-engine.org"
echo ""
echo "📚 Full docs: README.md and DEPLOYMENT.md"
