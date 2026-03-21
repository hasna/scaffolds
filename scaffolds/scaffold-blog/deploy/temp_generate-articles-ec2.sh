#!/usr/bin/env bash
# Generate articles for blogs with 0 articles - runs on EC2
# Copy to EC2 and run there

set -e

cd /home/ec2-user/engine-blog

ADMIN_EMAIL="admin@engine-blog.local"
ADMIN_PASSWORD="admin123"

# Blogs that need articles with their ports and topics
# Format: port|domain|topic1|topic2|...|topic12
BLOGS=(
"8033|holisticguardian.com|herbal remedies for common ailments|daily meditation practices|yoga poses for healing|essential oils guide|acupuncture benefits explained|chakra balancing techniques|crystal healing basics|aromatherapy for wellness|sound therapy healing|energy healing methods|mind-body connection|spiritual wellness practices"
"8034|easyhealthalliance.com|simple health habits for beginners|morning wellness routines|healthy meal prep ideas|desk exercises for office workers|walking benefits for health|hydration tips and tricks|screen time management|healthy snacking options|quick home workouts|sleep hygiene basics|stress relief techniques|weekend wellness activities"
"8035|dailyhealthinformer.com|health news updates|medical breakthroughs today|disease prevention strategies|health research findings|wellness industry trends|nutrition science explained|fitness innovations|mental health awareness|public health updates|lifestyle medicine basics|preventive care guide|health technology advances"
"8038|conservativehealthtoday.com|health policy analysis|medical freedom debate|healthcare economics explained|pharmaceutical industry insights|health regulations overview|patient rights guide|alternative treatment options|mainstream medicine critique|health education resources|informed consent importance|treatment choice freedom|healthcare reform ideas"
"8041|alternativehomeremedies.com|apple cider vinegar remedies|honey healing uses|garlic medicinal benefits|ginger healing properties|turmeric health benefits|coconut oil home uses|baking soda remedies|lemon natural cures|olive oil health treatments|salt therapy benefits|herbal combinations guide|natural first aid basics"
"8042|conservativehacks.com|money-saving health tips|DIY home solutions|practical life hacks|self-sufficient living guide|budget wellness ideas|homemade health products|resourceful living tips|common sense health solutions|traditional skills revival|practical wisdom for health|efficient living hacks|smart health shortcuts"
"8043|healin4all.com|natural healing methods|recovery techniques explained|chronic pain relief options|inflammation reduction strategies|detox strategies guide|healing foods list|body restoration methods|injury recovery tips|cellular health basics|autoimmune support guide|gut healing protocol|hormonal balance tips"
"8044|holisticreports.com|integrative medicine explained|functional health approach|wellness research findings|alternative therapy reviews|naturopathic solutions guide|whole-body health approach|preventive wellness strategies|healing protocols overview|health industry investigations|wellness trends analysis|treatment comparison guide|health practitioner insights"
"8046|myonlinehealthguide.com|beginner health tips|health basics explained simply|simple supplement guide|easy exercise plans|healthy cooking for beginners|wellness fundamentals|health tips for busy people|family health guide|teen health basics|mens health essentials|womens health guide|senior health tips"
"8047|newhealthalliance.com|cutting-edge wellness trends|health innovations review|biohacking basics guide|longevity science explained|personalized medicine future|health optimization tips|performance enhancement natural|metabolic health basics|cognitive enhancement methods|fitness technology review|nutrition science advances|regenerative health options"
"8048|patriotlibertyalliance.com|health freedom rights explained|medical liberty importance|informed consent guide|vaccine choice debate|treatment freedom rights|healthcare autonomy guide|patient rights protection|health sovereignty explained|constitutional health rights|medical privacy importance|parental health rights|bodily autonomy defense"
"8049|todayhealthhacks.com|quick health tips today|wellness life hacks|kitchen health hacks|workout shortcut tips|sleep hacks for better rest|energy booster techniques|focus improvement tips|mood enhancing methods|immune booster hacks|digestion improvement tips|skincare tips quick|hair health secrets"
"8050|todayhealingnews.com|healing breakthroughs news|recovery success stories|natural cure discoveries|wellness industry news|treatment advances today|healing testimonials|alternative medicine updates|recovery protocol news|healing community spotlight|practitioner profiles|healing resources guide|recovery support network"
"8051|stonecoldsurvivor.com|extreme weather survival|urban survival tactics|foraging wild edibles guide|shelter building techniques|fire starting methods|navigation without GPS|survival mindset training|survival gear reviews|winter survival tips|desert survival guide|mountain survival skills|coastal survival techniques"
"8052|smarthealin.com|science-based healing methods|evidence-based wellness|smart supplement guide|optimized recovery methods|data-driven health approach|measurable wellness goals|health tracking guide|biometric monitoring basics|personalized health protocols|precision nutrition guide|targeted therapy options|outcome-focused healing"
"8053|regularhealthtips.com|daily health advice simple|weekly wellness routines|monthly health checkups|seasonal health guide|everyday nutrition tips|routine exercise benefits|regular health checkups|consistent health habits|steady progress wellness|sustainable health tips|balanced living guide|practical wellness advice"
"8054|preppinglines.com|long-term food storage guide|emergency power solutions|communication networks prep|community preparedness tips|medical supply stockpile|security systems basics|evacuation route planning|survival gardening guide|livestock for preppers|bartering skills guide|SHTF scenario planning|gray man concept explained"
"8055|completehealin.com|comprehensive wellness approach|total body health guide|mind body spirit balance|whole person care approach|360 degree health view|integrated healing methods|complete recovery guide|full spectrum wellness|all-around health tips|unified healing approach|total transformation guide|holistic completeness path"
"8056|preppingplans.com|72-hour emergency kit guide|family emergency planning|budget prepping tips|apartment prepping ideas|vehicle emergency kit|pet emergency preparedness|child-friendly prepping|senior preparedness guide|prepper pantry basics|water storage solutions|home defense planning|financial collapse prep"
"8057|preppingtacts.com|tactical gear guide complete|night vision basics|radio communications prep|perimeter security tips|concealment techniques|threat assessment basics|situational awareness training|defensive driving skills|home fortification guide|cache building tips|intel gathering basics|escape and evasion tactics"
)

echo "================================================================="
echo "Generating articles for blogs with missing content"
echo "Started at: $(date)"
echo "================================================================="

for blog_config in "${BLOGS[@]}"; do
  IFS='|' read -ra parts <<< "$blog_config"
  port="${parts[0]}"
  domain="${parts[1]}"

  echo ""
  echo "================================================================="
  echo "Processing: $domain (port $port)"
  echo "================================================================="

  # Login to get token
  echo "Logging in..."
  TOKEN=$(curl -s -X POST "http://localhost:$port/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.data.token // empty')

  if [ -z "$TOKEN" ]; then
    echo "  ERROR: Login failed, skipping..."
    continue
  fi
  echo "  Login successful"

  # Generate 12 articles
  for i in {2..13}; do
    topic="${parts[$i]}"
    if [ -z "$topic" ]; then
      continue
    fi

    article_num=$((i - 1))
    echo "  [$article_num/12] Generating: $topic"

    # Call AI generate endpoint
    result=$(curl -s -X POST "http://localhost:$port/api/ai/generate" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"topic\":\"$topic\",\"tone\":\"professional\",\"length\":\"long\",\"publish\":true}" \
      --max-time 120)

    if echo "$result" | jq -e '.success' > /dev/null 2>&1; then
      echo "    OK"
    else
      echo "    FAILED: $(echo $result | jq -r '.error // "Unknown error"')"
    fi

    sleep 2
  done

  echo "Completed: $domain"
done

echo ""
echo "================================================================="
echo "Generation complete at: $(date)"
echo "================================================================="
