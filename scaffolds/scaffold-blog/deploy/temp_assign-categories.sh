#!/usr/bin/env bash
# Assign existing articles to categories via post_categories join table
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# All blog databases (domain without .com)
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
echo "Assigning articles to categories"
echo "Started at: $(date)"
echo "================================================================="

for DB_NAME in "${BLOGS[@]}"; do
  echo ""
  echo "Processing: $DB_NAME"
  echo "-----------------------------------------------------------------"

  # Check if blog has articles and categories
  article_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM posts WHERE status = 'published';" 2>/dev/null | tr -d ' ')
  category_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | tr -d ' ')

  if [ "$article_count" -eq 0 ] || [ "$category_count" -eq 0 ]; then
    echo "  Skipping: $article_count articles, $category_count categories"
    continue
  fi

  echo "  Found $article_count articles and $category_count categories"

  # Clear existing assignments first
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM post_categories;" 2>/dev/null || true

  # Distribute articles evenly across categories using post_categories join table
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO post_categories (post_id, category_id)
    SELECT p.id, c.id
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM posts
    ) p
    CROSS JOIN LATERAL (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) as cat_rn
        FROM categories
      ) cats
      WHERE cats.cat_rn = ((p.rn - 1) % (SELECT COUNT(*) FROM categories)) + 1
    ) c
    ON CONFLICT (post_id, category_id) DO NOTHING;
  " 2>/dev/null || echo "  Warning: Could not assign categories"

  # Verify assignment
  assigned=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT post_id) FROM post_categories;" 2>/dev/null | tr -d ' ')
  echo "  Done: $assigned articles now have categories"
done

echo ""
echo "================================================================="
echo "Category assignment complete at: $(date)"
echo "================================================================="
