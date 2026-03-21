#!/usr/bin/env bash
# Update blog descriptions - simple version
set -e

DB_USER="blog"

# Descriptions array - one line each, no special chars
declare -A DESCRIPTIONS
DESCRIPTIONS[survivalpatriots]="Survival Patriots is your trusted resource for emergency preparedness, self-reliance skills, and tactical knowledge. We provide practical guides on wilderness survival, urban preparedness, and essential gear reviews to help you protect your family and community. Our mission is to empower Americans with the knowledge and skills needed to face any crisis with confidence."

DESCRIPTIONS[healthhubmedia]="Health Hub Media delivers comprehensive health and wellness information backed by science and expert insights. We cover nutrition, fitness, mental wellness, and preventive care to help you make informed decisions about your health journey. Our team brings you the latest developments in medicine, lifestyle optimization, and holistic well-being."

DESCRIPTIONS[conservativetips]="Conservative Tips offers practical advice rooted in traditional values, financial wisdom, and self-sufficient living. We believe in the power of family, community, and individual responsibility to build a better life. Our content helps you navigate modern challenges while staying true to timeless principles."

DESCRIPTIONS[conservativeremedies]="Conservative Remedies celebrates the wisdom of natural and traditional healing methods passed down through generations. We explore herbal medicine, home treatments, and holistic approaches to health. Our articles provide detailed guides on preparing natural remedies and integrating traditional healing practices into modern life."

DESCRIPTIONS[conservativehealthnews]="Conservative Health News provides in-depth analysis of health policy, medical research, and wellness trends from a balanced perspective. Our team of journalists and health experts examines healthcare reform, pharmaceutical developments, and emerging research. Stay informed about the issues that affect your health and healthcare choices."

DESCRIPTIONS[conservativehealthhacks]="Conservative Health Hacks brings you practical, no-nonsense health tips that actually work. We focus on simple, natural solutions to everyday health challenges. From quick wellness routines to time-tested home remedies, our content helps busy people maintain their health without complicated regimens."

DESCRIPTIONS[holisticguardian]="Holistic Guardian is your guide to achieving balance in mind, body, and spirit through natural and integrative approaches. We explore energy healing, spiritual wellness, and holistic therapies. Our practitioners share ancient wisdom combined with modern understanding to help you on your healing journey."

DESCRIPTIONS[easyhealthalliance]="Easy Health Alliance makes wellness accessible to everyone, regardless of where you are in your health journey. We provide beginner-friendly guides to fitness, nutrition, and stress management. Our approach focuses on sustainable habits rather than quick fixes for lasting health transformation."

DESCRIPTIONS[dailyhealthinformer]="Daily Health Informer keeps you updated on the latest developments in health, medicine, and wellness. Our team of medical journalists brings you breaking news, research findings, and expert analysis. From clinical trials to public health updates, we cover the stories that matter to your health."

DESCRIPTIONS[conservativehealthtoday]="Conservative Health Today advocates for health freedom, patient rights, and informed consent in healthcare. We believe individuals should have autonomy over their medical decisions. Our coverage includes healthcare policy analysis, medical ethics discussions, and resources for navigating the healthcare system."

DESCRIPTIONS[alternativehomeremedies]="Alternative Home Remedies brings the healing power of nature into your home with proven remedies from your kitchen and garden. We share traditional cures, herbal preparations, and DIY treatments. Our guides help you prepare effective remedies using common natural ingredients."

DESCRIPTIONS[conservativehacks]="Conservative Hacks delivers practical life solutions rooted in common sense and self-reliance. From money-saving strategies to DIY home projects, we help you live better while spending less. Discover smart shortcuts and traditional skills that make everyday life easier."

DESCRIPTIONS[healin4all]="Healing For All is dedicated to helping everyone find their path to natural healing and recovery. We explore proven methods for pain relief, inflammation reduction, and whole-body restoration. Our comprehensive guides cover healing foods, detox strategies, and recovery techniques."

DESCRIPTIONS[holisticreports]="Holistic Reports provides in-depth investigations and analysis of integrative medicine and alternative therapies. We examine the evidence behind healing modalities to help you make informed choices. Our research team compares treatment options and explores emerging therapies."

DESCRIPTIONS[myalternativenews]="My Alternative News uncovers health stories and research findings that mainstream media overlooks. We provide independent analysis of suppressed treatments and alternative perspectives. Our investigative journalists explore the intersection of healthcare, policy, and individual freedom."

DESCRIPTIONS[myonlinehealthguide]="My Online Health Guide is your friendly companion for understanding health basics and building wellness habits. We break down complex health topics into easy-to-understand guides. Whether starting your wellness journey or managing a condition, our content meets you where you are."

DESCRIPTIONS[newhealthalliance]="New Health Alliance explores the cutting edge of health optimization, longevity science, and biohacking. We cover the latest innovations in personalized medicine and preventive health technology. Discover science-backed strategies for peak performance and healthy aging."

DESCRIPTIONS[patriotlibertyalliance]="Patriot Liberty Alliance defends medical freedom and constitutional health rights for all Americans. We provide resources on informed consent, treatment choices, and healthcare autonomy. Join our community committed to preserving individual rights in healthcare decisions."

DESCRIPTIONS[todayhealthhacks]="Today Health Hacks delivers quick, actionable tips to improve your health starting right now. From energy boosters and sleep hacks to focus techniques, we help you feel better today. Stop waiting and start making small changes that add up to big results."

DESCRIPTIONS[todayhealingnews]="Today Healing News brings you the latest breakthroughs and discoveries in natural and alternative healing. We spotlight innovative treatments, recovery journeys, and practitioners making a difference. Find hope and inspiration alongside practical information for your recovery."

DESCRIPTIONS[stonecoldsurvivor]="Stone Cold Survivor prepares you for survival in any environment or situation. From extreme weather and wilderness challenges to urban emergencies, we teach life-saving skills. Our expert guides cover shelter building, fire starting, foraging, navigation, and tactical preparedness."

DESCRIPTIONS[smarthealin]="Smart Healing applies science and data to achieve optimal health outcomes. We cover evidence-based wellness, smart supplementation, and biometric monitoring. Track your progress, optimize your protocols, and achieve measurable results with precision health strategies."

DESCRIPTIONS[regularhealthtips]="Regular Health Tips helps you build sustainable wellness through consistent, everyday practices. We believe steady habits beat quick fixes. Our content covers routine exercise, balanced nutrition, and practical wellness advice for real people with busy lives."

DESCRIPTIONS[preppinglines]="Prepping Lines guides you through building comprehensive emergency preparedness systems. We cover food storage, emergency power, communication networks, and community resilience planning. Create robust support systems for any situation with our detailed guides."

DESCRIPTIONS[completehealin]="Complete Healing addresses your whole person - mind, body, and spirit - for true transformation. We explore integrated approaches combining physical wellness with emotional and spiritual health. Experience complete recovery through unified healing approaches."

DESCRIPTIONS[preppingplans]="Prepping Plans provides practical blueprints for emergency preparedness at every budget and living situation. Our guides cover 72-hour kits, family emergency protocols, and financial resilience. Start prepping today with realistic, actionable plans."

DESCRIPTIONS[preppingtacts]="Prepping Tactics delivers advanced preparedness training focusing on security, tactical skills, and situational awareness. Our expert instructors share professional-grade knowledge for civilian preparedness. Develop the tactical mindset and skills to handle any challenge."

echo "Updating all blog descriptions..."

for db in "${!DESCRIPTIONS[@]}"; do
  desc="${DESCRIPTIONS[$db]}"
  echo "Updating: $db"
  docker exec postgres psql -U "$DB_USER" -d "$db" -c "UPDATE settings SET value = '\"$desc\"', updated_at = NOW() WHERE key = 'siteDescription';" 2>/dev/null || echo "  Failed"
done

echo "Done!"
