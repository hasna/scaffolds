#!/usr/bin/env bash
# Full deployment script for engine-blog v0.1.0
# Run this on EC2: beepmedia-prod-blog

set -e

PROJECT_DIR="/home/ubuntu/engine-blog"
cd "$PROJECT_DIR"

echo "================================================================="
echo "Engine Blog v0.1.0 Full Deployment"
echo "Started at: $(date)"
echo "================================================================="

# Step 1: Pull latest code
echo ""
echo "Step 1: Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Step 2: Build Docker image
echo ""
echo "Step 2: Building Docker image..."
docker build -t engine-blog:v0.1.0 -t engine-blog:latest .

# Step 3: Stop and update all containers
echo ""
echo "Step 3: Updating all blog containers..."

DOMAINS=(
  "survivalpatriots.com"
  "healthhubmedia.com"
  "conservativetips.com"
  "conservativeremedies.com"
  "conservativehealthnews.com"
  "conservativehealthhacks.com"
  "holisticguardian.com"
  "easyhealthalliance.com"
  "dailyhealthinformer.com"
  "conservativehealthtoday.com"
  "alternativehomeremedies.com"
  "conservativehacks.com"
  "healin4all.com"
  "holisticreports.com"
  "myalternativenews.com"
  "myonlinehealthguide.com"
  "newhealthalliance.com"
  "patriotlibertyalliance.com"
  "todayhealthhacks.com"
  "todayhealingnews.com"
  "stonecoldsurvivor.com"
  "smarthealin.com"
  "regularhealthtips.com"
  "preppinglines.com"
  "completehealin.com"
  "preppingplans.com"
  "preppingtacts.com"
)

DB_USER="engine"
DB_PASSWORD="engine_secure_password_2024"

for domain in "${DOMAINS[@]}"; do
  container_name="${domain//./-}"
  db_name="${domain//./_}"

  echo "  Updating: $domain"

  # Stop existing container
  docker stop "$container_name" 2>/dev/null || true
  docker rm "$container_name" 2>/dev/null || true

  # Start new container with v0.1.0
  docker run -d \
    --name "$container_name" \
    --network engine-network \
    -e DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${db_name}" \
    -e JWT_SECRET="jwt_secret_$(echo $domain | md5sum | cut -c1-16)" \
    -e NODE_ENV=production \
    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
    --restart unless-stopped \
    engine-blog:v0.1.0

  sleep 1
done

echo ""
echo "All containers updated to v0.1.0"

# Step 4: Create authors
echo ""
echo "Step 4: Creating authors for each blog..."
chmod +x deploy/create-authors-sql.sh
./deploy/create-authors-sql.sh

# Step 5: Randomize dates
echo ""
echo "Step 5: Randomizing article dates to 2025..."
chmod +x deploy/randomize-dates.sh
./deploy/randomize-dates.sh

echo ""
echo "================================================================="
echo "Deployment complete at: $(date)"
echo "================================================================="
echo ""
echo "Next steps:"
echo "1. Run generate-missing.sh to create articles for blogs with 0 articles"
echo "2. Run randomize-dates.sh again after articles are generated"
echo "3. Run create-authors-sql.sh again to assign authors to new articles"
