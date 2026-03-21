#!/usr/bin/env bash
# Set headerCategorySlugs for all blogs to show categories in header
# Reads actual category slugs from database
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

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
echo "Setting headerCategorySlugs for all blogs"
echo "Started at: $(date)"
echo "================================================================="

for DB_NAME in "${BLOGS[@]}"; do
  echo "Processing: $DB_NAME"

  # Get all category slugs from this database
  slugs=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT slug FROM categories ORDER BY id LIMIT 4;" 2>/dev/null | tr -d ' ' | grep -v '^$' | head -4)

  if [ -z "$slugs" ]; then
    echo "  No categories found, skipping..."
    continue
  fi

  # Build JSON array from slugs
  slugs_json="["
  first=true
  while IFS= read -r slug; do
    if [ -n "$slug" ]; then
      if [ "$first" = true ]; then
        first=false
      else
        slugs_json="$slugs_json, "
      fi
      slugs_json="$slugs_json\"$slug\""
    fi
  done <<< "$slugs"
  slugs_json="$slugs_json]"

  echo "  Categories: $slugs_json"

  # Set headerCategorySlugs
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO settings (key, value, updated_at)
    VALUES ('headerCategorySlugs', '$slugs_json', NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  " 2>/dev/null && echo "  Done" || echo "  Warning: Failed"
done

echo ""
echo "================================================================="
echo "Header categories setup complete at: $(date)"
echo "================================================================="
