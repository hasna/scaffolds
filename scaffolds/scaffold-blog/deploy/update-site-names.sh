#!/bin/bash
# Update site names in all blog databases

set -e

DB_USER="blog"

# Blog configurations: database|site_name|site_url
BLOGS=(
  "survivalpatriots|Survival Patriots|https://survivalpatriots.com"
  "healthhubmedia|Health Hub Media|https://healthhubmedia.com"
  "holisticguardian|Holistic Guardian|https://holisticguardian.com"
  "easyhealthalliance|Easy Health Alliance|https://easyhealthalliance.com"
  "dailyhealthinformer|Daily Health Informer|https://dailyhealthinformer.com"
  "conservativetips|Conservative Tips|https://conservativetips.com"
  "conservativeremedies|Conservative Remedies|https://conservativeremedies.com"
  "conservativehealthtoday|Conservative Health Today|https://conservativehealthtoday.com"
  "conservativehealthnews|Conservative Health News|https://conservativehealthnews.com"
  "conservativehealthhacks|Conservative Health Hacks|https://conservativehealthhacks.com"
  "alternativehomeremedies|Alternative Home Remedies|https://alternativehomeremedies.com"
  "conservativehacks|Conservative Hacks|https://conservativehacks.com"
  "healin4all|Healin4All|https://healin4all.com"
  "holisticreports|Holistic Reports|https://holisticreports.com"
  "myalternativenews|My Alternative News|https://myalternativenews.com"
  "myonlinehealthguide|My Online Health Guide|https://myonlinehealthguide.com"
  "newhealthalliance|New Health Alliance|https://newhealthalliance.com"
  "patriotlibertyalliance|Patriot Liberty Alliance|https://patriotlibertyalliance.com"
  "todayhealthhacks|Today Health Hacks|https://todayhealthhacks.com"
  "todayhealingnews|Today Healing News|https://todayhealingnews.com"
  "stonecoldsurvivor|Stone Cold Survivor|https://stonecoldsurvivor.com"
  "smarthealin|Smart Healin|https://smarthealin.com"
  "regularhealthtips|Regular Health Tips|https://regularhealthtips.com"
  "preppinglines|Prepping Lines|https://preppinglines.com"
  "completehealin|Complete Healin|https://completehealin.com"
  "preppingplans|Prepping Plans|https://preppingplans.com"
  "preppingtacts|Prepping Tacts|https://preppingtacts.com"
)

echo "Updating site names in all blog databases..."

for config in "${BLOGS[@]}"; do
  IFS='|' read -r DB_NAME SITE_NAME SITE_URL <<< "$config"

  echo "Updating $DB_NAME -> $SITE_NAME"

  docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
    UPDATE settings SET value = '\"$SITE_NAME\"', updated_at = NOW() WHERE key = 'siteName';
    UPDATE settings SET value = '\"$SITE_URL\"', updated_at = NOW() WHERE key = 'siteUrl';
  " 2>&1 || echo "  Warning: Could not update $DB_NAME"
done

echo "Done updating site names!"
