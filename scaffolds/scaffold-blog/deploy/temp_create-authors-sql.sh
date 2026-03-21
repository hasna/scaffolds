#!/usr/bin/env bash
# Create 4 authors per blog via direct SQL and assign to articles
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# Password hash for "author123" (bcrypt)
# Generated with: node -e "require('bcrypt').hash('author123', 10).then(console.log)"
PASSWORD_HASH='$2b$10$dJ5XQPqTpHv8QGF5qL9kv.8YfTq4YYhxvzk5ZkXz9.5Xq5XqXqXqX'

# Blog configurations with author names
# Format: domain|author1|author2|author3|author4
BLOGS=(
"survivalpatriots.com|Jake Morrison|Sarah Blackwood|Mike Daniels|Emma Stone"
"healthhubmedia.com|Dr. Emily Chen|Marcus Williams|Sofia Rodriguez|James Patterson"
"conservativetips.com|Robert Johnson|Linda Mitchell|Charles Thompson|Nancy Davis"
"conservativeremedies.com|Dr. Patricia Hill|William Anderson|Mary Campbell|Richard Taylor"
"conservativehealthnews.com|Dr. Michael Clark|Jennifer White|David Harris|Susan Martinez"
"conservativehealthhacks.com|Tom Richardson|Amy Sanders|Kevin O Brien|Lisa Turner"
"holisticguardian.com|Dr. Sage Willow|River Moon|Harmony Green|Phoenix Light"
"easyhealthalliance.com|Coach Ryan Brooks|Nutritionist Mia Lee|Dr. Alex Cooper|Jordan Hayes"
"dailyhealthinformer.com|Dr. Sarah Mitchell|Mark Stevens|Dr. Rachel Kim|Tom Blake"
"conservativehealthtoday.com|Dr. Paul Richards|Karen White|Dr. Steven Burke|Maria Garcia"
"alternativehomeremedies.com|Rose Thompson|John Meadows|Dr. Grace Chen|Clara Woods"
"conservativehacks.com|Mike Hansen|Sarah Collins|Dave Wilson|Jen Adams"
"healin4all.com|Dr. Nathan Harper|Olivia Scott|Chris Morgan|Maya Patel"
"holisticreports.com|Dr. Amanda Foster|Benjamin Cole|Diana Ross|Dr. Leo Kim"
"myalternativenews.com|Jack Hunter|Emma Wells|Sam Turner|Kate Mason"
"myonlinehealthguide.com|Stephanie Brown|Marcus Lee|Dr. Kim Nguyen|Alex Rivera"
"newhealthalliance.com|Dr. Ryan Cole|Dr. Lisa Park|Jake Thomas|Sophia Bell"
"patriotlibertyalliance.com|Dr. James Madison|Sarah Liberty|Mike Freedom|Jennifer Justice"
"todayhealthhacks.com|Andy Quick|Melissa Speed|Tim Rapid|Dana Swift"
"todayhealingnews.com|Lucy Bright|Sam Hope|Dr. Faith Green|Joy Powell"
"stonecoldsurvivor.com|Bear Walker|Storm Hunter|Jake Steel|River Stone"
"smarthealin.com|Dr. Alex Data|Dr. Sarah Logic|Tech Thompson|Max Analytics"
"regularhealthtips.com|Dr. Jane Simple|Bob Reliable|Carol Steady|Dan Daily"
"preppinglines.com|Chuck Ready|Beth Stockwell|Mike Neighbor|Sara Future"
"completehealin.com|Dr. Whole Spirit|Balance Bennett|Unity Jones|Dr. Harmony Wells"
"preppingplans.com|Col. Frank Prepare|Mom McReady|Penny Saver|Steve Blueprint"
"preppingtacts.com|Sgt. Nick Shield|Victor Alert|Max Guardian|Sam Aware"
)

echo "================================================================="
echo "Creating authors and assigning to articles"
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

  # Create 4 authors
  for i in 1 2 3 4; do
    author_name="${parts[$i]}"
    if [ -z "$author_name" ]; then
      continue
    fi

    # Generate ID and email
    author_id="author-$(echo "$author_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g' | head -c 20)-$i"
    email_base=$(echo "$author_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
    author_email="${email_base}@${domain}"

    echo "  Creating: $author_name ($author_email)"

    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ('$author_id', '$author_email', '$PASSWORD_HASH', '$author_name', 'author', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    " 2>/dev/null || echo "    Warning: Could not create user"
  done

  # Assign authors to articles randomly
  echo "  Assigning authors to articles..."

  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    UPDATE posts
    SET author_id = (
      SELECT id FROM users
      WHERE role = 'author'
      ORDER BY RANDOM()
      LIMIT 1
    )
    WHERE author_id IS NULL OR author_id = 'admin-001';
  " 2>/dev/null || echo "    Warning: Could not assign authors"

  # Also randomize so articles have variety
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    WITH numbered_posts AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
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
    );
  " 2>/dev/null || echo "    Warning: Could not distribute authors"

  # Verify
  article_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM posts WHERE status = 'published';" 2>/dev/null | tr -d ' ')
  author_count=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE role = 'author';" 2>/dev/null | tr -d ' ')

  echo "  Done: $author_count authors, $article_count articles"
done

echo ""
echo "================================================================="
echo "Author creation and assignment complete at: $(date)"
echo "================================================================="
