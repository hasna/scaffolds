#!/usr/bin/env bash
# Update blog descriptions with 2-paragraph descriptions
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

echo "================================================================="
echo "Updating blog descriptions"
echo "Started at: $(date)"
echo "================================================================="

update_description() {
  local db_name="$1"
  local description="$2"

  # Escape single quotes for SQL
  local escaped_desc="${description//\'/\'\'}"

  docker exec postgres psql -U "$DB_USER" -d "$db_name" -c "
    UPDATE settings SET value = '\"$escaped_desc\"', updated_at = NOW() WHERE key = 'siteDescription';
  " 2>/dev/null
}

# Survival Patriots
echo "Updating: survivalpatriots"
update_description "survivalpatriots" "Survival Patriots is your trusted resource for emergency preparedness, self-reliance skills, and tactical knowledge. We provide practical guides on wilderness survival, urban preparedness, and essential gear reviews to help you protect your family and community.

Our mission is to empower Americans with the knowledge and skills needed to face any crisis with confidence. From food storage and water purification to defensive strategies and communication systems, we cover everything you need to become truly self-sufficient."

# Health Hub Media
echo "Updating: healthhubmedia"
update_description "healthhubmedia" "Health Hub Media delivers comprehensive health and wellness information backed by science and expert insights. We cover nutrition, fitness, mental wellness, and preventive care to help you make informed decisions about your health journey.

Our team of health professionals and researchers brings you the latest developments in medicine, lifestyle optimization, and holistic well-being. Whether you are starting your wellness journey or looking to optimize your health, we provide actionable guidance for every stage of life."

# Conservative Tips
echo "Updating: conservativetips"
update_description "conservativetips" "Conservative Tips offers practical advice rooted in traditional values, financial wisdom, and self-sufficient living. We believe in the power of family, community, and individual responsibility to build a better life.

From money management and homesteading to raising children with strong values, our content helps you navigate modern challenges while staying true to timeless principles. Join our community of like-minded individuals committed to living purposefully."

# Conservative Remedies
echo "Updating: conservativeremedies"
update_description "conservativeremedies" "Conservative Remedies celebrates the wisdom of natural and traditional healing methods passed down through generations. We explore herbal medicine, home treatments, and holistic approaches to health that have stood the test of time.

Our articles provide detailed guides on preparing natural remedies, understanding medicinal plants, and integrating traditional healing practices into modern life. We believe in empowering individuals to take charge of their health naturally."

# Conservative Health News
echo "Updating: conservativehealthnews"
update_description "conservativehealthnews" "Conservative Health News provides in-depth analysis of health policy, medical research, and wellness trends from a balanced perspective. We cut through the noise to deliver factual, well-researched health information you can trust.

Our team of journalists and health experts examines healthcare reform, pharmaceutical developments, and emerging research with a critical eye. Stay informed about the issues that affect your health and healthcare choices."

# Conservative Health Hacks
echo "Updating: conservativehealthhacks"
update_description "conservativehealthhacks" "Conservative Health Hacks brings you practical, no-nonsense health tips that actually work. We focus on simple, natural solutions to everyday health challenges that you can implement immediately.

From quick wellness routines to time-tested home remedies, our content helps busy people maintain their health without complicated regimens or expensive products. Get real results with straightforward advice."

# Holistic Guardian
echo "Updating: holisticguardian"
update_description "holisticguardian" "Holistic Guardian is your guide to achieving balance in mind, body, and spirit through natural and integrative approaches. We explore energy healing, spiritual wellness, and holistic therapies that nurture your whole being.

Our practitioners and wellness experts share ancient wisdom combined with modern understanding to help you on your healing journey. Discover meditation techniques, energy work, and natural therapies that restore harmony and vitality."

# Easy Health Alliance
echo "Updating: easyhealthalliance"
update_description "easyhealthalliance" "Easy Health Alliance makes wellness accessible to everyone, regardless of where you are in your health journey. We provide beginner-friendly guides to fitness, nutrition, and stress management that fit into busy lifestyles.

Our approach focuses on sustainable habits rather than quick fixes. Learn how small, consistent changes can transform your health over time. Start your wellness journey today with practical advice you can actually follow."

# Daily Health Informer
echo "Updating: dailyhealthinformer"
update_description "dailyhealthinformer" "Daily Health Informer keeps you updated on the latest developments in health, medicine, and wellness. Our team of medical journalists brings you breaking news, research findings, and expert analysis every day.

From clinical trials and treatment advances to public health updates, we cover the stories that matter to your health. Trust us to deliver accurate, timely information that helps you stay ahead of health trends."

# Conservative Health Today
echo "Updating: conservativehealthtoday"
update_description "conservativehealthtoday" "Conservative Health Today advocates for health freedom, patient rights, and informed consent in healthcare. We believe individuals should have autonomy over their medical decisions without government overreach.

Our coverage includes healthcare policy analysis, medical ethics discussions, and resources for navigating the healthcare system on your own terms. Join us in the movement for healthcare freedom and patient empowerment."

# Alternative Home Remedies
echo "Updating: alternativehomeremedies"
update_description "alternativehomeremedies" "Alternative Home Remedies brings the healing power of nature into your home with proven remedies from your kitchen and garden. We share traditional cures, herbal preparations, and DIY treatments that generations have relied upon.

Our detailed guides help you prepare effective remedies using common ingredients like apple cider vinegar, honey, garlic, and essential oils. Take control of your family's health with natural solutions that work."

# Conservative Hacks
echo "Updating: conservativehacks"
update_description "conservativehacks" "Conservative Hacks delivers practical life solutions rooted in common sense and self-reliance. From money-saving strategies to DIY home projects, we help you live better while spending less.

Our content empowers you to solve problems yourself, reduce waste, and build a more sustainable lifestyle. Discover smart shortcuts and traditional skills that make everyday life easier and more efficient."

# Healing For All
echo "Updating: healin4all"
update_description "healin4all" "Healing For All is dedicated to helping everyone find their path to natural healing and recovery. We explore proven methods for pain relief, inflammation reduction, and whole-body restoration.

Our comprehensive guides cover everything from healing foods and detox strategies to recovery techniques for chronic conditions. Whatever your healing journey looks like, we provide resources and support to help you thrive."

# Holistic Reports
echo "Updating: holisticreports"
update_description "holisticreports" "Holistic Reports provides in-depth investigations and analysis of integrative medicine, alternative therapies, and wellness industry developments. We examine the evidence behind healing modalities to help you make informed choices.

Our research team compares treatment options, reviews practitioners, and explores emerging therapies in naturopathic and functional medicine. Get the comprehensive information you need to navigate holistic healthcare."

# My Alternative News
echo "Updating: myalternativenews"
update_description "myalternativenews" "My Alternative News uncovers health stories and research findings that mainstream media overlooks. We provide independent analysis of suppressed treatments, alternative perspectives, and the health truth movement.

Our investigative journalists explore the intersection of healthcare, policy, and individual freedom. Stay informed about developments that could affect your health choices and access to alternative treatments."

# My Online Health Guide
echo "Updating: myonlinehealthguide"
update_description "myonlinehealthguide" "My Online Health Guide is your friendly companion for understanding health basics and building wellness habits. We break down complex health topics into easy-to-understand guides for individuals and families.

Whether you are learning about nutrition, starting an exercise routine, or managing a health condition, our content meets you where you are. Build your health knowledge with practical advice that works in real life."

# New Health Alliance
echo "Updating: newhealthalliance"
update_description "newhealthalliance" "New Health Alliance explores the cutting edge of health optimization, longevity science, and biohacking. We cover the latest innovations in personalized medicine, performance enhancement, and preventive health technology.

Our experts break down complex research and emerging therapies to help forward-thinking individuals optimize their health span. Discover science-backed strategies for peak performance and healthy aging."

# Patriot Liberty Alliance
echo "Updating: patriotlibertyalliance"
update_description "patriotlibertyalliance" "Patriot Liberty Alliance defends medical freedom and constitutional health rights for all Americans. We provide resources on informed consent, treatment choices, and healthcare autonomy in an increasingly regulated environment.

Our coverage includes legal analysis, policy updates, and practical guides for protecting your health freedom. Join our community of patriots committed to preserving individual rights in healthcare decisions."

# Today Health Hacks
echo "Updating: todayhealthhacks"
update_description "todayhealthhacks" "Today Health Hacks delivers quick, actionable tips to improve your health starting right now. From energy boosters and sleep hacks to focus techniques and immune support, we help you feel better today.

Our bite-sized content fits into your busy schedule, giving you practical solutions you can implement immediately. Stop waiting to feel better and start making small changes that add up to big results."

# Today Healing News
echo "Updating: todayhealingnews"
update_description "todayhealingnews" "Today Healing News brings you the latest breakthroughs, success stories, and discoveries in natural and alternative healing. We spotlight innovative treatments, recovery journeys, and practitioners making a difference.

Our coverage includes healing testimonials, treatment advances, and community resources for those on their healing journey. Find hope and inspiration alongside practical information for your recovery."

# Stone Cold Survivor
echo "Updating: stonecoldsurvivor"
update_description "stonecoldsurvivor" "Stone Cold Survivor prepares you for survival in any environment or situation. From extreme weather and wilderness challenges to urban emergencies, we teach the skills that could save your life.

Our expert guides cover shelter building, fire starting, foraging, navigation, and tactical preparedness. Build the mindset and skills of a true survivor with training from experienced outdoorsmen and survival instructors."

# Smart Healing
echo "Updating: smarthealin"
update_description "smarthealin" "Smart Healing applies science and data to achieve optimal health outcomes. We cover evidence-based wellness, smart supplementation, and biometric monitoring to help you make informed health decisions.

Our approach combines rigorous research analysis with practical application. Track your progress, optimize your protocols, and achieve measurable results with precision health strategies backed by science."

# Regular Health Tips
echo "Updating: regularhealthtips"
update_description "regularhealthtips" "Regular Health Tips helps you build sustainable wellness through consistent, everyday practices. We believe that steady habits beat quick fixes, and small daily choices create lasting health.

Our content covers routine exercise, balanced nutrition, regular checkups, and practical wellness advice for real people. Build a healthier life one day at a time with guidance that fits your actual lifestyle."

# Prepping Lines
echo "Updating: preppinglines"
update_description "preppinglines" "Prepping Lines guides you through building comprehensive emergency preparedness systems for long-term security. We cover food storage, emergency power, communication networks, and community resilience planning.

Our detailed guides help you prepare for various scenarios while building valuable skills and connections. From survival gardening to bartering networks, we help you create robust support systems for any situation."

# Complete Healing
echo "Updating: completehealin"
update_description "completehealin" "Complete Healing addresses your whole person - mind, body, and spirit - for true transformation. We explore integrated approaches that combine physical wellness with emotional and spiritual health.

Our practitioners share wisdom from multiple healing traditions to help you achieve balance and wholeness. Experience complete recovery and optimal well-being through unified healing approaches that honor your entire being."

# Prepping Plans
echo "Updating: preppingplans"
update_description "preppingplans" "Prepping Plans provides practical blueprints for emergency preparedness at every budget and living situation. Whether you live in an apartment or on acreage, we help you create effective emergency plans.

Our guides cover 72-hour kits, family emergency protocols, pet preparedness, and financial resilience. Start prepping today with realistic, actionable plans that protect your loved ones."

# Prepping Tactics
echo "Updating: preppingtacts"
update_description "preppingtacts" "Prepping Tactics delivers advanced preparedness training focusing on security, tactical skills, and situational awareness. We cover defensive strategies, communication systems, and threat assessment.

Our expert instructors share professional-grade knowledge adapted for civilian preparedness. From perimeter security to escape planning, develop the tactical mindset and skills to handle any challenge."

echo ""
echo "================================================================="
echo "Description update complete at: $(date)"
echo "================================================================="
