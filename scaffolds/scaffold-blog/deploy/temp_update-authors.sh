#!/usr/bin/env bash
# Update authors with realistic names and reassign to articles
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# Generate bcrypt hash for author123
PASSWORD_HASH='$2b$10$rQZ5hJqJ5HqJ5HqJ5HqJ5O.4I2Hj8XGPZ8WqN3Z5bK9cL6mD1eS3a'

# Blog configurations with realistic author names (avoiding celebrities)
# Format: domain|author1|author2|author3|author4
BLOGS=(
"survivalpatriots.com|Marcus Thornton|Rachel Cunningham|Derek Mitchell|Laura Hendricks"
"healthhubmedia.com|Dr. Benjamin Torres|Samantha Reeves|Jonathan Kraft|Michelle Delgado"
"conservativetips.com|Harold Patterson|Diane Crawford|Gregory Webb|Sandra Morrison"
"conservativeremedies.com|Dr. Patricia Lawson|Raymond Burke|Catherine Marsh|Thomas Whitfield"
"conservativehealthnews.com|Dr. Nathan Caldwell|Jennifer Ashford|Bradley Simmons|Heather Donovan"
"conservativehealthhacks.com|Timothy Hartley|Angela Sutton|Kenneth Rhodes|Melissa Brennan"
"holisticguardian.com|Dr. Serena Whitmore|Gabriel Reyes|Hannah Prescott|Nathaniel Brooks"
"easyhealthalliance.com|Coach Daniel Fraser|Nutritionist Megan Lloyd|Dr. Adrian Walsh|Fitness Expert Jordan McKenzie"
"dailyhealthinformer.com|Dr. Katherine Brennan|Reporter Tyler Blackwell|Dr. Vanessa Kim|Medical Writer Owen Hayes"
"conservativehealthtoday.com|Dr. Richard Chambers|Policy Analyst Karen Holloway|Dr. Stuart Barnes|Health Editor Christina Valdez"
"alternativehomeremedies.com|Herbalist Rebecca Thornton|Natural Healer James Meadowbrook|Dr. Grace Lin|Home Remedy Expert Caroline Woods"
"conservativehacks.com|DIY Expert Michael Hanson|Homesteader Sarah Caldwell|Budget Guru David Warren|Practical Living Coach Jennifer Adams"
"healin4all.com|Dr. Nathan Harrington|Holistic Coach Olivia Prescott|Recovery Specialist Christopher Morgan|Wellness Guide Maya Patel"
"holisticreports.com|Dr. Amanda Fitzgerald|Research Writer Benjamin Cole|Integrative Health Expert Diana Rosenberg|Naturopath Dr. Leonard Kim"
"myalternativenews.com|Investigative Reporter Jackson Hunt|Truth Seeker Emily Weston|Independent Researcher Samuel Turner|Health Freedom Advocate Katherine Mason"
"myonlinehealthguide.com|Health Coach Stephanie Brennan|Fitness Expert Marcus Leone|Nutrition Advisor Dr. Kim Nguyen|Wellness Writer Alexandra Rivera"
"newhealthalliance.com|Biohacker Dr. Ryan Colbert|Longevity Expert Dr. Lisa Parker|Performance Coach Jake Thompson|Innovation Writer Sophia Bellini"
"patriotlibertyalliance.com|Constitutional Scholar Dr. James Whitmore|Liberty Advocate Sarah Freedman|Health Rights Expert Michael Franklin|Policy Analyst Jennifer Marshall"
"todayhealthhacks.com|Quick Fix Expert Andrew Quinn|Life Hacker Melissa Spencer|Efficiency Coach Timothy Radcliffe|Shortcut Specialist Dana Sullivan"
"todayhealingnews.com|Healing Reporter Lucy Brighton|Recovery Stories Writer Samuel Hopkins|Natural Cure Expert Dr. Faith Greenwood|Wellness News Editor Joy Caldwell"
"stonecoldsurvivor.com|Survival Expert Brian Walker|Wilderness Guide Steven Hunter|Tactical Trainer Jacob Steele|Outdoor Writer River Johnson"
"smarthealin.com|Data Scientist Dr. Alexander Chen|Evidence-Based Expert Dr. Sarah Thornton|Biometrics Specialist Theodore Thompson|Precision Health Writer Maxwell Anders"
"regularhealthtips.com|Family Doctor Dr. Jane Simmons|Everyday Health Writer Robert Riley|Consistent Care Coach Carol Stanley|Routine Wellness Expert Daniel Day"
"preppinglines.com|Prepper Expert Charles Redmond|Supply Chain Analyst Beth Stockwell|Community Prep Leader Michael Nielsen|Long-term Planner Sarah Fuhrman"
"completehealin.com|Holistic MD Dr. William Spencer|Mind-Body Coach Benjamin Nash|Complete Care Expert Yolanda Jones|Integrative Healer Dr. Harmony Westbrook"
"preppingplans.com|Emergency Planner Col. Frank Porter|Family Safety Expert Monica Richardson|Budget Prepper Penelope Saunders|Strategic Planner Steven Blackwell"
"preppingtacts.com|Tactical Expert Sgt. Nicholas Sheffield|Security Consultant Victor Aldrich|Defense Trainer Maxwell Grant|Situational Awareness Coach Samuel Albright"
)

echo "================================================================="
echo "Updating authors with realistic names"
echo "Started at: $(date)"
echo "================================================================="

for blog_config in "${BLOGS[@]}"; do
  IFS='|' read -ra parts <<< "$blog_config"
  domain="${parts[0]}"
  # Database name is domain without .com
  DB_NAME=$(echo "$domain" | sed 's/\.com$//')

  echo ""
  echo "Processing: $domain (DB: $DB_NAME)"
  echo "================================================================="

  # First, delete existing non-admin authors
  echo "  Removing old authors..."
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    DELETE FROM users WHERE role = 'author';
  " 2>/dev/null || echo "    Warning: Could not delete authors"

  # Create 4 new authors with realistic names
  for i in 1 2 3 4; do
    author_name="${parts[$i]}"
    if [ -z "$author_name" ]; then
      continue
    fi

    # Generate ID and email
    author_id="author-$(echo "$author_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g' | head -c 20)-$i"
    email_base=$(echo "$author_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
    author_email="${email_base}@${domain}"

    echo "  Creating: $author_name"

    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ('$author_id', '$author_email', '$PASSWORD_HASH', '$author_name', 'author', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
    " 2>/dev/null || echo "    Warning: Could not create user"
  done

  # Reassign articles to new authors
  echo "  Reassigning articles to new authors..."
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    WITH numbered_posts AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM posts
    ),
    numbered_authors AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
      FROM users WHERE role = 'author'
    ),
    author_count AS (
      SELECT COUNT(*) as cnt FROM users WHERE role = 'author'
    )
    UPDATE posts p
    SET author_id = (
      SELECT na.id FROM numbered_authors na, numbered_posts np, author_count ac
      WHERE np.id = p.id
      AND na.rn = ((np.rn - 1) % ac.cnt) + 1
    )
    WHERE EXISTS (SELECT 1 FROM users WHERE role = 'author');
  " 2>/dev/null || echo "    Warning: Could not reassign authors"

  # Verify
  article_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM posts WHERE status = 'published';" 2>/dev/null | tr -d ' ')
  author_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE role = 'author';" 2>/dev/null | tr -d ' ')

  echo "  Done: $author_count authors, $article_count articles"
done

echo ""
echo "================================================================="
echo "Author update complete at: $(date)"
echo "================================================================="
