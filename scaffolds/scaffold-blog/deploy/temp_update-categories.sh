#!/usr/bin/env bash
# Create blog-specific categories for each blog
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# Blog configurations with 4 relevant categories
# Format: domain|cat1|cat2|cat3|cat4
BLOGS=(
"survivalpatriots.com|Emergency Preparedness|Survival Skills|Self-Reliance|Tactical Gear"
"healthhubmedia.com|Nutrition|Fitness|Mental Wellness|Preventive Care"
"conservativetips.com|Traditional Values|Financial Wisdom|Family Life|Self-Sufficiency"
"conservativeremedies.com|Natural Remedies|Herbal Medicine|Home Treatments|Holistic Health"
"conservativehealthnews.com|Health Policy|Medical Research|Wellness Trends|Healthcare Analysis"
"conservativehealthhacks.com|Quick Health Tips|Life Hacks|Natural Solutions|Daily Wellness"
"holisticguardian.com|Mind-Body Balance|Energy Healing|Spiritual Wellness|Natural Therapies"
"easyhealthalliance.com|Beginner Fitness|Healthy Habits|Simple Nutrition|Stress Management"
"dailyhealthinformer.com|Breaking Health News|Medical Updates|Research Findings|Expert Insights"
"conservativehealthtoday.com|Health Freedom|Medical Ethics|Patient Rights|Healthcare Reform"
"alternativehomeremedies.com|Kitchen Remedies|Natural Cures|DIY Treatments|Traditional Medicine"
"conservativehacks.com|Money-Saving Tips|DIY Solutions|Practical Living|Smart Shortcuts"
"healin4all.com|Natural Healing|Recovery Methods|Pain Relief|Body Restoration"
"holisticreports.com|Integrative Medicine|Wellness Research|Alternative Therapies|Health Investigations"
"myalternativenews.com|Health Truth|Suppressed Research|Alternative Perspectives|Wellness Freedom"
"myonlinehealthguide.com|Health Basics|Getting Started|Family Wellness|Everyday Health"
"newhealthalliance.com|Biohacking|Longevity Science|Health Optimization|Cutting-Edge Wellness"
"patriotlibertyalliance.com|Medical Freedom|Health Rights|Informed Consent|Healthcare Autonomy"
"todayhealthhacks.com|Quick Fixes|Energy Boosters|Sleep Hacks|Focus Tips"
"todayhealingnews.com|Healing Stories|Treatment Breakthroughs|Recovery News|Wellness Discoveries"
"stonecoldsurvivor.com|Wilderness Survival|Urban Preparedness|Emergency Skills|Gear Reviews"
"smarthealin.com|Evidence-Based Health|Data-Driven Wellness|Smart Supplements|Biometrics"
"regularhealthtips.com|Daily Health|Consistent Habits|Routine Wellness|Sustainable Living"
"preppinglines.com|Food Storage|Emergency Power|Community Prep|Long-Term Planning"
"completehealin.com|Whole-Body Health|Mind-Body-Spirit|Complete Recovery|Integrated Wellness"
"preppingplans.com|Emergency Plans|Family Preparedness|Budget Prepping|Survival Strategies"
"preppingtacts.com|Tactical Skills|Security Basics|Defensive Living|Situational Awareness"
)

echo "================================================================="
echo "Creating blog-specific categories"
echo "Started at: $(date)"
echo "================================================================="

generate_id() {
  echo "cat-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)"
}

generate_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

for blog_config in "${BLOGS[@]}"; do
  IFS='|' read -ra parts <<< "$blog_config"
  domain="${parts[0]}"
  # Database name is domain without .com
  DB_NAME=$(echo "$domain" | sed 's/\.com$//')

  echo ""
  echo "Processing: $domain (DB: $DB_NAME)"
  echo "================================================================="

  # Delete existing categories
  echo "  Clearing existing categories..."
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    DELETE FROM post_categories;
    DELETE FROM categories;
  " 2>/dev/null || echo "    Warning: Could not clear categories"

  # Create 4 new categories
  for i in 1 2 3 4; do
    cat_name="${parts[$i]}"
    if [ -z "$cat_name" ]; then
      continue
    fi

    cat_id=$(generate_id)
    cat_slug=$(generate_slug "$cat_name")

    echo "  Creating: $cat_name"

    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO categories (id, name, slug, description, created_at)
      VALUES ('$cat_id', '$cat_name', '$cat_slug', 'Articles about $cat_name', NOW())
      ON CONFLICT (slug) DO NOTHING;
    " 2>/dev/null || echo "    Warning: Could not create category"
  done

  # Assign posts to random categories
  echo "  Assigning posts to categories..."
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    -- Assign each post to 1-2 random categories
    INSERT INTO post_categories (post_id, category_id)
    SELECT p.id, c.id
    FROM posts p
    CROSS JOIN LATERAL (
      SELECT id FROM categories ORDER BY RANDOM() LIMIT 1 + (RANDOM() < 0.5)::int
    ) c
    ON CONFLICT DO NOTHING;
  " 2>/dev/null || echo "    Warning: Could not assign categories"

  # Verify
  cat_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | tr -d ' ')
  echo "  Done: $cat_count categories created"
done

echo ""
echo "================================================================="
echo "Category creation complete at: $(date)"
echo "================================================================="
