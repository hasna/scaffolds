#!/usr/bin/env bash
# TEMP SCRIPT - One-time use
# Add realistic human comments and likes to all articles (optimized version)
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
echo "Adding comments and likes to all articles"
echo "Started at: $(date)"
echo "================================================================="

for DB_NAME in "${BLOGS[@]}"; do
  echo ""
  echo "Processing: $DB_NAME"
  echo "-----------------------------------------------------------------"

  # Get all published posts
  posts=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM posts WHERE status = 'published' ORDER BY created_at;" 2>/dev/null | tr -d ' ' | grep -v '^$')

  if [ -z "$posts" ]; then
    echo "  No posts found, skipping..."
    continue
  fi

  post_count=$(echo "$posts" | wc -l | tr -d ' ')
  echo "  Found $post_count posts"

  # Clear all existing comments for this blog
  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM comments;" 2>/dev/null

  # Process each post
  while IFS= read -r post_id; do
    if [ -z "$post_id" ]; then
      continue
    fi

    # Random number of comments between 12 and 49
    num_comments=$((RANDOM % 38 + 12))
    # Random number of likes between 200 and 2200
    num_likes=$((RANDOM % 2001 + 200))

    echo "  Post $post_id: $num_comments comments, $num_likes likes"

    # Generate and insert comments using SQL directly (much faster)
    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      -- Generate $num_comments comments for this post
      INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at)
      SELECT
        'cmt-' || substr(md5(random()::text), 1, 12),
        '$post_id',
        NULL,
        (ARRAY['James Smith','Mary Johnson','John Williams','Patricia Brown','Robert Jones','Jennifer Garcia','Michael Miller','Linda Davis','William Rodriguez','Elizabeth Martinez','David Hernandez','Barbara Lopez','Richard Gonzalez','Susan Wilson','Joseph Anderson','Jessica Thomas','Thomas Taylor','Sarah Moore','Charles Jackson','Karen Martin','Christopher Lee','Nancy Perez','Daniel Thompson','Lisa White','Matthew Harris','Betty Sanchez','Anthony Clark','Margaret Ramirez','Mark Lewis','Sandra Robinson','Donald Walker','Ashley Young','Steven Allen','Kimberly King','Paul Wright','Emily Scott','Andrew Torres','Donna Nguyen','Joshua Hill','Michelle Flores','Kenneth Green','Dorothy Adams','Kevin Nelson','Carol Baker','Brian Hall','Amanda Rivera','George Campbell','Melissa Mitchell','Timothy Carter','Deborah Roberts'])[floor(random() * 50 + 1)::int],
        lower(replace((ARRAY['james.smith','mary.johnson','john.williams','patricia.brown','robert.jones','jennifer.garcia','michael.miller','linda.davis','william.rodriguez','elizabeth.martinez','david.hernandez','barbara.lopez','richard.gonzalez','susan.wilson','joseph.anderson','jessica.thomas','thomas.taylor','sarah.moore','charles.jackson','karen.martin','christopher.lee','nancy.perez','daniel.thompson','lisa.white','matthew.harris','betty.sanchez','anthony.clark','margaret.ramirez','mark.lewis','sandra.robinson','donald.walker','ashley.young','steven.allen','kimberly.king','paul.wright','emily.scott','andrew.torres','donna.nguyen','joshua.hill','michelle.flores','kenneth.green','dorothy.adams','kevin.nelson','carol.baker','brian.hall','amanda.rivera','george.campbell','melissa.mitchell','timothy.carter','deborah.roberts'])[floor(random() * 50 + 1)::int], ' ', '.')) || '@' || (ARRAY['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com'])[floor(random() * 7 + 1)::int],
        (ARRAY[
          'This is exactly what I needed to read today. Thanks for putting this together!',
          'Great article! I have been looking for information like this for a while now.',
          'Really well written. You explained everything so clearly.',
          'Finally someone who gets it! This is spot on.',
          'Bookmarking this for future reference. So helpful!',
          'This deserves more attention. Sharing with my friends.',
          'Solid advice here. Appreciate you taking the time to write this.',
          'Wow, this is comprehensive. Thank you for all the detail!',
          'Been following this site for a while now. Never disappoints.',
          'One of the better articles I have read on this topic. Well done.',
          'Interesting perspective. Have you considered the other side of this argument?',
          'Quick question - does this apply to beginners as well or is it more advanced?',
          'How long did it take you to see results with this approach?',
          'Would this work for someone in their 50s or is it mainly for younger people?',
          'Any tips for staying consistent with this? I always struggle with that part.',
          'I tried something similar last year and it completely changed my life.',
          'My grandmother used to swear by this. Nice to see it getting recognition again.',
          'Started doing this about 3 months ago and feeling great!',
          'I was skeptical at first but decided to give it a try. Best decision I made.',
          'We implemented this in our household and even the kids are on board now.',
          'My doctor actually recommended something very similar. Good to see it confirmed.',
          'Great points! I would also add that staying hydrated makes a huge difference.',
          'Pro tip: start small and build up gradually. That is how most people succeed.',
          'For anyone struggling with this, there are some great apps to help stay on track.',
          'Another thing worth mentioning is the importance of sleep.',
          'Thank you so much for this! Exactly what I was searching for.',
          'This article came at the perfect time. Really grateful for this information.',
          'You have no idea how much this helps. Been feeling lost lately.',
          'Finally some practical advice I can actually use! Thank you!',
          'This is the kind of content the internet needs more of. Genuinely helpful.',
          'Absolutely love this article! Going to try everything mentioned starting today!',
          'Mind blown. Never thought about it this way before. Game changer!',
          'This is gold! Saving this and coming back to it every week for motivation.',
          'Best thing I have read all month! You guys never miss!',
          'needed this today thx',
          'good stuff',
          'sharing this rn',
          'yep can confirm this works',
          'finally some real info',
          'great read',
          'exactly what I was looking for',
          'so true',
          'Could not agree more! Same experience here.',
          'Exactly what I was thinking while reading.',
          'Great point. Wish I could upvote this twice.',
          'Came here to say the same thing!',
          'Yes! Someone finally said it.',
          'I have spent the last hour reading through this and taking notes. What strikes me most is how practical the advice is.',
          'As someone who has been researching this topic for over a year, I can say this article covers the fundamentals really well.',
          'This really resonates with me. I went through a health scare last year that made me completely rethink my approach.'
        ])[floor(random() * 50 + 1)::int],
        'approved',
        NOW() - (random() * interval '90 days')
      FROM generate_series(1, $num_comments);

      -- Update likes count
      UPDATE posts SET likes_count = $num_likes WHERE id = '$post_id';
    " 2>/dev/null

  done <<< "$posts"

  # Count totals
  total_comments=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM comments WHERE status = 'approved';" 2>/dev/null | tr -d ' ')
  total_likes=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT SUM(likes_count) FROM posts;" 2>/dev/null | tr -d ' ')
  echo "  Done: $total_comments comments, $total_likes likes"
done

echo ""
echo "================================================================="
echo "Comment and like generation complete at: $(date)"
echo "================================================================="
