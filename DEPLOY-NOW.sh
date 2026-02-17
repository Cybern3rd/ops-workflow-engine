#!/bin/bash
# Complete Cloudflare Deployment for ops.workflow-engine.org
# Run this from /home/node/clawd/projects/ops-workflow-engine/

set -e

echo "🚀 Deploying ops.workflow-engine.org to Cloudflare..."
echo ""

# Database already created: eff31bc9-ceb6-4a96-9d82-4b78287882f0
# wrangler.toml already updated

# Step 3: Run database migrations
echo "📊 Step 3: Running database migrations..."
wrangler d1 execute ops-db --file=database/schema.sql
wrangler d1 execute ops-db --file=database/seed.sql
echo "✅ Database schema and seed data loaded"
echo ""

# Step 4: Deploy Workers API
echo "☁️  Step 4: Deploying Workers API + Durable Objects..."
wrangler deploy
echo "✅ Workers API deployed"
echo ""

# Step 5: Install dependencies and build frontend
echo "🔨 Step 5: Building frontend..."
npm install
npm run build
echo "✅ Frontend built"
echo ""

# Step 6: Deploy to Cloudflare Pages
echo "🌐 Step 6: Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name=ops-workflow-engine
echo "✅ Frontend deployed to Pages"
echo ""

# Step 7: Configure DNS
echo "🔧 Step 7: DNS Configuration needed..."
echo ""
echo "Go to Cloudflare Dashboard → workflow-engine.org → DNS:"
echo "1. Add CNAME record:"
echo "   Name: ops"
echo "   Target: ops-workflow-engine.pages.dev"
echo "   Proxy: ON (orange cloud)"
echo ""
echo "2. Workers route (should auto-configure):"
echo "   api.workflow-engine.org → Workers API"
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Visit: https://ops.workflow-engine.org"
echo "📊 API: https://api.workflow-engine.org/api/agents"
