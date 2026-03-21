#!/bin/bash
# Randomize article dates to be within the last year for all blogs

set -e

DB_USER="blog"

# All blog databases (domain without .com)
DATABASES=(
  "survivalpatriots"
  "healthhubmedia"
  "holisticguardian"
  "easyhealthalliance"
  "dailyhealthinformer"
  "conservativetips"
  "conservativeremedies"
  "conservativehealthtoday"
  "conservativehealthnews"
  "conservativehealthhacks"
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

echo "Randomizing article dates across all blogs..."
echo "Dates will be spread across 2025 (Jan 1 - Dec 15)"
echo ""

for db in "${DATABASES[@]}"; do
  echo "Processing: $db"

  docker exec postgres psql -U "$DB_USER" -d "$db" -c "
    -- Update each post with a random date within 2025 (Jan 1 to Dec 15)
    -- ~349 days from Jan 1 2025 to Dec 15 2025
    UPDATE posts
    SET
      published_at = '2025-01-01'::timestamp + (random() * interval '349 days'),
      created_at = '2025-01-01'::timestamp + (random() * interval '349 days'),
      updated_at = '2025-01-01'::timestamp + (random() * interval '349 days')
    WHERE status = 'published';

    -- Ensure updated_at is always >= published_at
    UPDATE posts
    SET updated_at = published_at + (random() * interval '14 days')
    WHERE updated_at < published_at;

    -- Ensure created_at <= published_at
    UPDATE posts
    SET created_at = published_at - (random() * interval '7 days')
    WHERE created_at > published_at;
  " 2>&1 | grep -E "UPDATE|ERROR" || echo "  Done"
done

echo ""
echo "Date randomization complete!"
