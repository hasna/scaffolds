#!/bin/bash
# Redeploy all blog containers with AI API keys

set -e

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is required"
  exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY environment variable is required"
  exit 1
fi

# Base port for blogs
BASE_PORT=8031

# Database credentials
DB_USER="blog"
DB_PASS="blogpass123"
DB_HOST="172.17.0.1"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production-2024"

# Blog configurations: domain|database|site_name|site_description
BLOGS=(
  "survivalpatriots.com|survivalpatriots|Survival Patriots|Your trusted source for survival tips and patriotic living"
  "healthhubmedia.com|healthhubmedia|Health Hub Media|Your daily dose of health and wellness news"
  "holisticguardian.com|holisticguardian|Holistic Guardian|Natural health and holistic wellness guide"
  "easyhealthalliance.com|easyhealthalliance|Easy Health Alliance|Making health simple and accessible"
  "dailyhealthinformer.com|dailyhealthinformer|Daily Health Informer|Your daily health news and updates"
  "conservativetips.com|conservativetips|Conservative Tips|Practical tips for conservative living"
  "conservativeremedies.com|conservativeremedies|Conservative Remedies|Traditional remedies and natural health"
  "conservativehealthtoday.com|conservativehealthtoday|Conservative Health Today|Health news with conservative values"
  "conservativehealthnews.com|conservativehealthnews|Conservative Health News|Breaking health news for conservatives"
  "conservativehealthhacks.com|conservativehealthhacks|Conservative Health Hacks|Simple health hacks and tips"
  "alternativehomeremedies.com|alternativehomeremedies|Alternative Home Remedies|Natural remedies for everyday health"
  "conservativehacks.com|conservativehacks|Conservative Hacks|Life hacks with conservative values"
  "healin4all.com|healin4all|Healin4All|Healing solutions for everyone"
  "holisticreports.com|holisticreports|Holistic Reports|In-depth holistic health reporting"
  "myalternativenews.com|myalternativenews|My Alternative News|Alternative news and health updates"
  "myonlinehealthguide.com|myonlinehealthguide|My Online Health Guide|Your personal online health companion"
  "newhealthalliance.com|newhealthalliance|New Health Alliance|United for better health"
  "patriotlibertyalliance.com|patriotlibertyalliance|Patriot Liberty Alliance|Freedom and health for patriots"
  "todayhealthhacks.com|todayhealthhacks|Today Health Hacks|Daily health hacks and tips"
  "todayhealingnews.com|todayhealingnews|Today Healing News|Today's news on natural healing"
  "stonecoldsurvivor.com|stonecoldsurvivor|Stone Cold Survivor|Survival skills and preparedness"
  "smarthealin.com|smarthealin|Smart Healin|Intelligent health solutions"
  "regularhealthtips.com|regularhealthtips|Regular Health Tips|Daily health tips for everyone"
  "preppinglines.com|preppinglines|Prepping Lines|Your guide to emergency preparedness"
  "completehealin.com|completehealin|Complete Healin|Complete health and wellness solutions"
  "preppingplans.com|preppingplans|Prepping Plans|Strategic preparedness planning"
  "preppingtacts.com|preppingtacts|Prepping Tacts|Tactical prepping strategies"
)

echo "Redeploying all blog containers with AI API keys..."
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:10}..."

# Stop and remove all existing blog containers
echo "Stopping existing blog containers..."
for i in $(seq 1 27); do
  docker stop blog-$i 2>/dev/null || true
  docker rm blog-$i 2>/dev/null || true
done

# Start all blog containers
echo "Starting blog containers with AI keys..."
PORT=$BASE_PORT
BLOG_NUM=1

for config in "${BLOGS[@]}"; do
  IFS='|' read -r DOMAIN DB_NAME SITE_NAME SITE_DESC <<< "$config"

  CONTAINER_NAME="blog-$BLOG_NUM"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}"

  echo "Starting $CONTAINER_NAME for $DOMAIN on port $PORT..."

  docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -e NODE_ENV=production \
    -e PORT=$PORT \
    -e DATABASE_URL="$DATABASE_URL" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e SITE_NAME="$SITE_NAME" \
    -e SITE_DESCRIPTION="$SITE_DESC" \
    -e SITE_URL="https://$DOMAIN" \
    -e CORS_ORIGINS="https://$DOMAIN,https://www.$DOMAIN" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    -p $PORT:$PORT \
    -v /opt/blogs/uploads-$BLOG_NUM:/app/uploads \
    engine-blog:latest

  ((PORT++))
  ((BLOG_NUM++))
done

echo ""
echo "All blog containers restarted with AI API keys!"
docker ps | grep blog-
