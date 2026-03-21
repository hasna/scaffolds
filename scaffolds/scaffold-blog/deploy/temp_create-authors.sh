#!/usr/bin/env bash
# Create 4 authors per blog and assign them to existing articles

set -e

CLI_PATH="/Users/beepmedia/Workspace/dev/engine/enginedev/engine-blog"
cd "$CLI_PATH"

ADMIN_EMAIL="admin@engine-blog.local"
ADMIN_PASSWORD="admin123"

# Health/wellness blog domains and themed author names
declare -A BLOG_AUTHORS
BLOG_AUTHORS["survivalpatriots.com"]="Jake Morrison|Sarah Blackwood|Mike Daniels|Emma Stone"
BLOG_AUTHORS["healthhubmedia.com"]="Dr. Emily Chen|Marcus Williams|Sofia Rodriguez|James Patterson"
BLOG_AUTHORS["conservativetips.com"]="Robert Johnson|Linda Mitchell|Charles Thompson|Nancy Davis"
BLOG_AUTHORS["conservativeremedies.com"]="Dr. Patricia Hill|William Anderson|Mary Campbell|Richard Taylor"
BLOG_AUTHORS["conservativehealthnews.com"]="Dr. Michael Clark|Jennifer White|David Harris|Susan Martinez"
BLOG_AUTHORS["conservativehealthhacks.com"]="Tom Richardson|Amy Sanders|Kevin O'Brien|Lisa Turner"
BLOG_AUTHORS["holisticguardian.com"]="Dr. Sage Willow|River Moon|Harmony Green|Phoenix Light"
BLOG_AUTHORS["easyhealthalliance.com"]="Coach Ryan Brooks|Nutritionist Mia Lee|Dr. Alex Cooper|Wellness Expert Jordan Hayes"
BLOG_AUTHORS["dailyhealthinformer.com"]="Dr. Sarah Mitchell|Health Reporter Mark Stevens|Dr. Rachel Kim|Medical Writer Tom Blake"
BLOG_AUTHORS["conservativehealthtoday.com"]="Dr. Paul Richards|Policy Analyst Karen White|Dr. Steven Burke|Health Editor Maria Garcia"
BLOG_AUTHORS["alternativehomeremedies.com"]="Herbalist Rose Thompson|Natural Healer John Meadows|Dr. Grace Chen|Home Remedy Expert Clara Woods"
BLOG_AUTHORS["conservativehacks.com"]="DIY Expert Mike Hansen|Homesteader Sarah Collins|Budget Guru Dave Wilson|Practical Living Coach Jen Adams"
BLOG_AUTHORS["healin4all.com"]="Dr. Nathan Harper|Holistic Coach Olivia Scott|Recovery Specialist Chris Morgan|Wellness Guide Maya Patel"
BLOG_AUTHORS["holisticreports.com"]="Dr. Amanda Foster|Research Writer Benjamin Cole|Integrative Health Expert Diana Ross|Naturopath Dr. Leo Kim"
BLOG_AUTHORS["myalternativenews.com"]="Investigative Reporter Jack Hunter|Truth Seeker Emma Wells|Independent Researcher Sam Turner|Health Freedom Advocate Kate Mason"
BLOG_AUTHORS["myonlinehealthguide.com"]="Health Coach Stephanie Brown|Fitness Expert Marcus Lee|Nutrition Advisor Dr. Kim Nguyen|Wellness Writer Alex Rivera"
BLOG_AUTHORS["newhealthalliance.com"]="Biohacker Dr. Ryan Cole|Longevity Expert Dr. Lisa Park|Performance Coach Jake Thomas|Innovation Writer Sophia Bell"
BLOG_AUTHORS["patriotlibertyalliance.com"]="Constitutional Scholar Dr. James Madison|Liberty Advocate Sarah Liberty|Health Rights Expert Mike Freedom|Policy Analyst Jennifer Justice"
BLOG_AUTHORS["todayhealthhacks.com"]="Quick Fix Expert Andy Quick|Life Hacker Melissa Speed|Efficiency Coach Tim Rapid|Shortcut Specialist Dana Swift"
BLOG_AUTHORS["todayhealingnews.com"]="Healing Reporter Lucy Bright|Recovery Stories Writer Sam Hope|Natural Cure Expert Dr. Faith Green|Wellness News Editor Joy Powell"
BLOG_AUTHORS["stonecoldsurvivor.com"]="Survival Expert Bear Walker|Wilderness Guide Storm Hunter|Tactical Trainer Jake Steel|Outdoor Writer River Stone"
BLOG_AUTHORS["smarthealin.com"]="Data Scientist Dr. Alex Data|Evidence-Based Expert Dr. Sarah Logic|Biometrics Specialist Tech Thompson|Precision Health Writer Max Analytics"
BLOG_AUTHORS["regularhealthtips.com"]="Family Doctor Dr. Jane Simple|Everyday Health Writer Bob Reliable|Consistent Care Coach Carol Steady|Routine Wellness Expert Dan Daily"
BLOG_AUTHORS["preppinglines.com"]="Prepper Expert Chuck Ready|Supply Chain Analyst Beth Stockwell|Community Prep Leader Mike Neighbor|Long-term Planner Sara Future"
BLOG_AUTHORS["completehealin.com"]="Holistic MD Dr. Whole Spirit|Mind-Body Coach Balance Bennett|Complete Care Expert Unity Jones|Integrative Healer Dr. Harmony Wells"
BLOG_AUTHORS["preppingplans.com"]="Emergency Planner Col. Frank Prepare|Family Safety Expert Mom McReady|Budget Prepper Penny Saver|Strategic Planner Steve Blueprint"
BLOG_AUTHORS["preppingtacts.com"]="Tactical Expert Sgt. Nick Shield|Security Consultant Victor Alert|Defense Trainer Max Guardian|Situational Awareness Coach Sam Aware"

echo "================================================================="
echo "Creating authors for all blogs"
echo "Started at: $(date)"
echo "================================================================="

# Get all domains
ALL_DOMAINS=(
  "survivalpatriots.com"
  "healthhubmedia.com"
  "conservativetips.com"
  "conservativeremedies.com"
  "conservativehealthnews.com"
  "conservativehealthhacks.com"
  "holisticguardian.com"
  "easyhealthalliance.com"
  "dailyhealthinformer.com"
  "conservativehealthtoday.com"
  "alternativehomeremedies.com"
  "conservativehacks.com"
  "healin4all.com"
  "holisticreports.com"
  "myalternativenews.com"
  "myonlinehealthguide.com"
  "newhealthalliance.com"
  "patriotlibertyalliance.com"
  "todayhealthhacks.com"
  "todayhealingnews.com"
  "stonecoldsurvivor.com"
  "smarthealin.com"
  "regularhealthtips.com"
  "preppinglines.com"
  "completehealin.com"
  "preppingplans.com"
  "preppingtacts.com"
)

for domain in "${ALL_DOMAINS[@]}"; do
  profile_name="${domain//./-}"
  authors_str="${BLOG_AUTHORS[$domain]}"

  echo ""
  echo "================================================================="
  echo "Processing: $domain"
  echo "================================================================="

  # Add profile
  bun run cli/index.ts config profile add "$profile_name" --url "https://$domain" 2>/dev/null || true

  # Login with retry
  echo "Logging in to $domain..."
  login_success=false
  for attempt in 1 2 3; do
    if bun run cli/index.ts --profile "$profile_name" config login "$ADMIN_EMAIL" "$ADMIN_PASSWORD" 2>&1 | grep -q "Logged in"; then
      login_success=true
      break
    fi
    echo "  Login attempt $attempt failed, retrying in 5s..."
    sleep 5
  done

  if [ "$login_success" = false ]; then
    echo "  ERROR: Could not login to $domain after 3 attempts, skipping..."
    continue
  fi

  # Parse authors
  IFS='|' read -ra author_names <<< "$authors_str"

  echo "Creating ${#author_names[@]} authors..."

  # Create each author via API
  author_num=1
  for author_name in "${author_names[@]}"; do
    # Generate email from name
    email_base=$(echo "$author_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
    author_email="${email_base}@${domain}"

    echo "  Creating author $author_num: $author_name ($author_email)"

    # Use curl to create user directly
    TOKEN=$(bun run cli/index.ts --profile "$profile_name" config show 2>/dev/null | grep "Token:" | awk '{print $2}')

    if [ -n "$TOKEN" ]; then
      curl -s -X POST "https://$domain/api/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
          \"name\": \"$author_name\",
          \"email\": \"$author_email\",
          \"password\": \"author123\",
          \"role\": \"author\"
        }" > /dev/null 2>&1 && echo "    OK" || echo "    FAILED or already exists"
    else
      echo "    FAILED: No token"
    fi

    ((author_num++))
  done

  echo "Completed: $domain"
done

echo ""
echo "================================================================="
echo "Author creation complete at: $(date)"
echo "================================================================="
