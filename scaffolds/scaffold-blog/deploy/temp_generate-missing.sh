#!/usr/bin/env bash
# Generate 12 articles for blogs that are missing content

set -e

CLI_PATH="/Users/beepmedia/Workspace/dev/engine/enginedev/engine-blog"
cd "$CLI_PATH"

ADMIN_EMAIL="admin@engine-blog.local"
ADMIN_PASSWORD="admin123"

# Only blogs that need articles (0 articles currently)
BLOGS=(
"holisticguardian.com|herbal remedies|meditation practices|yoga for healing|essential oils|acupuncture benefits|chakra balancing|crystal healing|aromatherapy|sound therapy|energy healing|mind-body connection|spiritual wellness"
"easyhealthalliance.com|simple health habits|morning routines|healthy meal prep|desk exercises|walking benefits|hydration tips|screen time management|healthy snacking|quick workouts|sleep hygiene|stress relief techniques|weekend wellness"
"dailyhealthinformer.com|health news today|medical breakthroughs|disease prevention|health research|wellness trends|nutrition science|fitness innovations|mental health awareness|public health updates|lifestyle medicine|preventive care|health technology"
"conservativehealthtoday.com|health policy analysis|medical freedom|healthcare economics|pharmaceutical industry|health regulations|patient rights|alternative treatments|mainstream medicine critique|health education|informed consent|treatment choices|healthcare reform"
"alternativehomeremedies.com|apple cider vinegar uses|honey remedies|garlic medicine|ginger healing|turmeric benefits|coconut oil uses|baking soda remedies|lemon cures|olive oil treatments|salt therapy|herb combinations|natural first aid"
"conservativehacks.com|money-saving health tips|DIY home solutions|practical life hacks|self-sufficient living|budget wellness|homemade products|resourceful living|common sense solutions|traditional skills|practical wisdom|efficient living|smart shortcuts"
"healin4all.com|natural healing methods|recovery techniques|chronic pain relief|inflammation reduction|detox strategies|healing foods|body restoration|injury recovery|cellular health|autoimmune support|gut healing|hormonal balance"
"holisticreports.com|integrative medicine|functional health|wellness research|alternative therapies|naturopathic solutions|whole-body health|preventive wellness|healing protocols|health investigations|wellness industry news|treatment comparisons|health practitioner insights"
"myonlinehealthguide.com|beginner health tips|health basics explained|simple supplements|easy exercise plans|healthy cooking basics|wellness fundamentals|health for busy people|family health guide|teen health tips|mens health basics|womens health essentials|senior health guide"
"newhealthalliance.com|cutting-edge wellness|health innovations|biohacking basics|longevity science|personalized medicine|health optimization|performance enhancement|metabolic health|cognitive enhancement|fitness technology|nutrition science advances|regenerative health"
"patriotlibertyalliance.com|health freedom rights|medical liberty|informed consent|vaccine choice|treatment freedom|healthcare autonomy|patient rights|health sovereignty|constitutional health rights|medical privacy|parental rights|bodily autonomy"
"todayhealthhacks.com|quick health tips|life hacks for wellness|kitchen health hacks|workout shortcuts|sleep hacks|energy boosters|focus techniques|mood enhancers|immune boosters|digestion hacks|skin care tips|hair health secrets"
"todayhealingnews.com|healing breakthroughs|recovery stories|natural cure news|wellness discoveries|treatment advances|healing testimonials|alternative medicine news|recovery protocols|healing communities|practitioner spotlights|healing resources|recovery support"
"stonecoldsurvivor.com|extreme weather survival|urban survival tactics|foraging wild edibles|shelter building|fire starting techniques|navigation without GPS|survival mindset|gear reviews|winter survival|desert survival|mountain survival|coastal survival"
"smarthealin.com|science-based healing|evidence-based wellness|smart supplements|optimized recovery|data-driven health|measurable wellness|health tracking|biometric monitoring|personalized protocols|precision nutrition|targeted therapies|outcome-focused healing"
"regularhealthtips.com|daily health advice|weekly wellness tips|monthly health checks|seasonal health guide|everyday nutrition|routine exercise|regular checkups|consistent habits|steady progress|sustainable health|balanced living|practical wellness"
"preppinglines.com|long-term food storage|emergency power|communication networks|community preparedness|medical supply stockpile|security systems|evacuation routes|survival gardening|livestock for preppers|bartering skills|SHTF scenarios|gray man concept"
"completehealin.com|comprehensive wellness|total body health|mind body spirit|whole person care|360 degree health|integrated healing|complete recovery|full spectrum wellness|all-around health|unified approach|total transformation|holistic completeness"
"preppingplans.com|72-hour kit guide|family emergency plan|budget prepping|apartment prepping|vehicle emergency kit|pet emergency prep|child-friendly prepping|senior preparedness|prepper pantry|water storage solutions|home defense plan|financial collapse prep"
"preppingtacts.com|tactical gear guide|night vision basics|radio communications|perimeter security|concealment techniques|threat assessment|situational awareness|defensive driving|home fortification|cache building|intel gathering|escape and evasion"
)

echo "================================================================="
echo "Generating articles for blogs with missing content"
echo "Started at: $(date)"
echo "================================================================="

# Process each blog
for blog_config in "${BLOGS[@]}"; do
  IFS='|' read -ra parts <<< "$blog_config"
  domain="${parts[0]}"
  profile_name="${domain//./-}"

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

  # Generate 12 articles
  for i in {1..12}; do
    topic="${parts[$i]}"
    if [ -z "$topic" ]; then
      continue
    fi

    echo "  [$i/12] Generating: $topic"

    if bun run cli/index.ts --profile "$profile_name" ai generate \
      --topic="$topic" \
      --tone="professional" \
      --length="long" \
      --publish 2>&1 | grep -q "Article generated"; then
      echo "    OK"
    else
      echo "    FAILED"
    fi

    sleep 3
  done

  echo "Completed: $domain"
done

echo ""
echo "================================================================="
echo "Generation complete at: $(date)"
echo "================================================================="
