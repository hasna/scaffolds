#!/usr/bin/env bash
# Remove old seed categories from all blogs
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# Old seed category slugs to remove
OLD_SLUGS="('design', 'lifestyle', 'marketing', 'business', 'ai-automation', 'technology', 'product')"

# All blog databases
BLOGS=(
  "survivalpatriots"
  "healthhubmedia"
  "conservativetips"
  "conservativeremedies"
  "conservativehealthnews"
  "conservativehealthhacks"
  "holisticguardian"
  "easyhealthalliance"
  "dailyhealthinformer"
  "conservativehealthtoday"
  "alternativehomeremedies"
  "conservativehacks"
  "healin4all"
  "holisticreports"
  "myalternativenews"
  "myonlinehealthguide"
  "newhealthalliance"
  "patriotlibertyalliance"
  "todayhealthhacks"
  "todayhealingnews"
  "stonecoldsurvivor"
  "smarthealin"
  "regularhealthtips"
  "preppinglines"
  "completehealin"
  "preppingplans"
  "preppingtacts"
)

echo "================================================================="
echo "Removing old seed categories from all blogs"
echo "Started at: $(date)"
echo "================================================================="

for DB_NAME in "${BLOGS[@]}"; do
  echo "Cleaning: $DB_NAME"

  # First clear category_id from posts that reference old categories
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    UPDATE posts SET category_id = NULL
    WHERE category_id IN (SELECT id FROM categories WHERE slug IN $OLD_SLUGS);
  " 2>/dev/null || true

  # Delete old categories
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    DELETE FROM categories WHERE slug IN $OLD_SLUGS;
  " 2>/dev/null || true

  # Show remaining categories
  remaining=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | tr -d ' ')
  echo "  Done: $remaining categories remaining"
done

echo ""
echo "================================================================="
echo "Cleanup complete at: $(date)"
echo "================================================================="
