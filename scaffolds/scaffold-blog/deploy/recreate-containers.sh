#!/bin/bash
# Recreate all blog containers with new image

set -e

# Blog configurations
BLOGS=(
  "1|survivalpatriots.com|8031|Survival Patriots|Your trusted source for survival tips and patriotic living"
  "2|healthhubmedia.com|8032|Health Hub Media|Your comprehensive guide to health and wellness"
  "3|holisticguardian.com|8033|Holistic Guardian|Natural health and holistic wellness"
  "4|easyhealthalliance.com|8034|Easy Health Alliance|Simple steps to better health"
  "5|dailyhealthinformer.com|8035|Daily Health Informer|Your daily dose of health information"
  "6|conservativetips.com|8036|Conservative Tips|Practical conservative lifestyle advice"
  "7|conservativeremedies.com|8037|Conservative Remedies|Traditional health remedies"
  "8|conservativehealthtoday.com|8038|Conservative Health Today|Conservative approach to modern health"
  "9|conservativehealthnews.com|8039|Conservative Health News|Health news from a conservative perspective"
  "10|conservativehealthhacks.com|8040|Conservative Health Hacks|Simple health hacks that work"
  "11|alternativehomeremedies.com|8041|Alternative Home Remedies|Natural remedies for your home"
  "12|conservativehacks.com|8042|Conservative Hacks|Life hacks for conservatives"
  "13|healin4all.com|8043|Healing For All|Healing solutions for everyone"
  "14|holisticreports.com|8044|Holistic Reports|In-depth holistic health reporting"
  "15|myalternativenews.com|8045|My Alternative News|Alternative health news and information"
  "16|myonlinehealthguide.com|8046|My Online Health Guide|Your online guide to better health"
  "17|newhealthalliance.com|8047|New Health Alliance|Building a healthier future together"
  "18|patriotlibertyalliance.com|8048|Patriot Liberty Alliance|Health freedom for patriots"
  "19|todayhealthhacks.com|8049|Today Health Hacks|Quick health tips for today"
  "20|todayhealingnews.com|8050|Today Healing News|Breaking healing and wellness news"
  "21|stonecoldsurvivor.com|8051|Stone Cold Survivor|Survival skills and preparedness"
  "22|smarthealin.com|8052|Smart Healing|Intelligent approaches to healing"
  "23|regularhealthtips.com|8053|Regular Health Tips|Daily health tips for everyone"
  "24|preppinglines.com|8054|Prepping Lines|Preparedness and survival strategies"
  "25|completehealin.com|8055|Complete Healing|Complete healing solutions"
  "26|preppingplans.com|8056|Prepping Plans|Your prepping and preparedness guide"
  "27|preppingtacts.com|8057|Prepping Tactics|Tactical preparedness strategies"
)

DB_USER="blog"
DB_PASS="blogpass123"
DB_HOST="172.17.0.1"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-2024"
GOOGLE_API_KEY="${GOOGLE_API_KEY:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
AWS_REGION="us-east-1"

echo "Recreating all blog containers..."

for config in "${BLOGS[@]}"; do
  IFS='|' read -r num domain port name desc <<< "$config"
  container="blog-$num"
  # Database name is domain without .com
  db_name=$(echo "$domain" | sed 's/\.com$//')

  echo "Creating $container ($domain)..."

  # Remove if exists
  docker rm -f "$container" 2>/dev/null || true

  # S3 bucket for this blog's images
  s3_bucket="beepmedia-prod-blog-${db_name}"

  # Create new container with port mapping
  docker run -d \
    --name "$container" \
    --restart unless-stopped \
    -p "$port:$port" \
    -e "PORT=$port" \
    -e "SITE_URL=https://$domain" \
    -e "SITE_NAME=$name" \
    -e "SITE_DESCRIPTION=$desc" \
    -e "CORS_ORIGINS=https://$domain,https://www.$domain" \
    -e "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${db_name}" \
    -e "JWT_SECRET=$JWT_SECRET" \
    -e "NODE_ENV=production" \
    -e "GOOGLE_API_KEY=$GOOGLE_API_KEY" \
    -e "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
    -e "S3_BUCKET=$s3_bucket" \
    -e "AWS_REGION=$AWS_REGION" \
    engine-blog:v0.1.0

  echo "  OK"
  sleep 1
done

echo ""
echo "All containers recreated!"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
