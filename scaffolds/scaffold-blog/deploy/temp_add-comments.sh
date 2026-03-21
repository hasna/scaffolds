#!/usr/bin/env bash
# TEMP SCRIPT - One-time use
# Add realistic human comments and likes to all articles
# Run this on EC2: beepmedia-prod-blog

set -e

DB_USER="blog"

# Realistic first names
FIRST_NAMES=(
  "James" "Mary" "John" "Patricia" "Robert" "Jennifer" "Michael" "Linda" "William" "Elizabeth"
  "David" "Barbara" "Richard" "Susan" "Joseph" "Jessica" "Thomas" "Sarah" "Charles" "Karen"
  "Christopher" "Nancy" "Daniel" "Lisa" "Matthew" "Betty" "Anthony" "Margaret" "Mark" "Sandra"
  "Donald" "Ashley" "Steven" "Kimberly" "Paul" "Emily" "Andrew" "Donna" "Joshua" "Michelle"
  "Kenneth" "Dorothy" "Kevin" "Carol" "Brian" "Amanda" "George" "Melissa" "Timothy" "Deborah"
  "Ronald" "Stephanie" "Edward" "Rebecca" "Jason" "Sharon" "Jeffrey" "Laura" "Ryan" "Cynthia"
  "Jacob" "Kathleen" "Gary" "Amy" "Nicholas" "Angela" "Eric" "Shirley" "Jonathan" "Anna"
  "Stephen" "Brenda" "Larry" "Pamela" "Justin" "Emma" "Scott" "Nicole" "Brandon" "Helen"
  "Benjamin" "Samantha" "Samuel" "Katherine" "Raymond" "Christine" "Gregory" "Debra" "Frank" "Rachel"
  "Alexander" "Carolyn" "Patrick" "Janet" "Jack" "Catherine" "Dennis" "Maria" "Jerry" "Heather"
  "Tyler" "Diane" "Aaron" "Ruth" "Jose" "Julie" "Adam" "Olivia" "Nathan" "Joyce"
  "Henry" "Virginia" "Douglas" "Victoria" "Zachary" "Kelly" "Peter" "Lauren" "Kyle" "Christina"
  "Noah" "Joan" "Ethan" "Evelyn" "Jeremy" "Judith" "Walter" "Megan" "Christian" "Andrea"
  "Keith" "Cheryl" "Roger" "Hannah" "Terry" "Jacqueline" "Austin" "Martha" "Sean" "Gloria"
  "Gerald" "Teresa" "Carl" "Ann" "Dylan" "Sara" "Harold" "Madison" "Jordan" "Frances"
)

# Realistic last names
LAST_NAMES=(
  "Smith" "Johnson" "Williams" "Brown" "Jones" "Garcia" "Miller" "Davis" "Rodriguez" "Martinez"
  "Hernandez" "Lopez" "Gonzalez" "Wilson" "Anderson" "Thomas" "Taylor" "Moore" "Jackson" "Martin"
  "Lee" "Perez" "Thompson" "White" "Harris" "Sanchez" "Clark" "Ramirez" "Lewis" "Robinson"
  "Walker" "Young" "Allen" "King" "Wright" "Scott" "Torres" "Nguyen" "Hill" "Flores"
  "Green" "Adams" "Nelson" "Baker" "Hall" "Rivera" "Campbell" "Mitchell" "Carter" "Roberts"
  "Turner" "Phillips" "Evans" "Parker" "Edwards" "Collins" "Stewart" "Morris" "Murphy" "Cook"
  "Rogers" "Morgan" "Peterson" "Cooper" "Reed" "Bailey" "Bell" "Gomez" "Kelly" "Howard"
  "Ward" "Cox" "Diaz" "Richardson" "Wood" "Watson" "Brooks" "Bennett" "Gray" "James"
  "Reyes" "Cruz" "Hughes" "Price" "Myers" "Long" "Foster" "Sanders" "Ross" "Morales"
  "Powell" "Sullivan" "Russell" "Ortiz" "Jenkins" "Gutierrez" "Perry" "Butler" "Barnes" "Fisher"
)

# Comment templates - will be varied with different intros/outros
# Categories: supportive, questioning, personal_experience, helpful_addition, grateful, skeptical, enthusiastic

generate_comment() {
  local category=$1
  local rand=$((RANDOM % 10))

  case $category in
    supportive)
      case $rand in
        0) echo "This is exactly what I needed to read today. Thanks for putting this together!" ;;
        1) echo "Great article! Ive been looking for information like this for a while now." ;;
        2) echo "Really well written. You explained everything so clearly." ;;
        3) echo "Finally someone who gets it! This is spot on." ;;
        4) echo "Bookmarking this for future reference. So helpful!" ;;
        5) echo "This deserves more attention. Sharing with my friends." ;;
        6) echo "Solid advice here. Appreciate you taking the time to write this." ;;
        7) echo "Wow, this is comprehensive. Thank you for all the detail!" ;;
        8) echo "Been following this site for a while now. Never disappoints." ;;
        9) echo "One of the better articles Ive read on this topic. Well done." ;;
      esac
      ;;
    questioning)
      case $rand in
        0) echo "Interesting perspective. Have you considered the other side of this argument?" ;;
        1) echo "Quick question - does this apply to beginners as well or is it more advanced?" ;;
        2) echo "Im curious about the sources for some of these claims. Can you share more?" ;;
        3) echo "How long did it take you to see results with this approach?" ;;
        4) echo "Would this work for someone in their 50s or is it mainly for younger people?" ;;
        5) echo "What about people with pre-existing conditions? Any modifications needed?" ;;
        6) echo "Is there a specific order we should follow or can we start anywhere?" ;;
        7) echo "How does this compare to other methods youve tried?" ;;
        8) echo "Any tips for staying consistent with this? I always struggle with that part." ;;
        9) echo "Whats your take on combining this with other approaches?" ;;
      esac
      ;;
    personal_experience)
      case $rand in
        0) echo "I tried something similar last year and it completely changed my life. Highly recommend giving it a shot." ;;
        1) echo "My grandmother used to swear by this. Nice to see it getting recognition again." ;;
        2) echo "Started doing this about 3 months ago. Down 15 pounds and feeling great!" ;;
        3) echo "I was skeptical at first but decided to give it a try. Best decision I made this year." ;;
        4) echo "We implemented this in our household and even the kids are on board now." ;;
        5) echo "After my diagnosis last year I started researching this stuff seriously. Wish Id known sooner." ;;
        6) echo "My doctor actually recommended something very similar. Good to see it confirmed here." ;;
        7) echo "Ive been doing a version of this for years. Nice to see others catching on!" ;;
        8) echo "Tried this after reading your last article. Already seeing improvements!" ;;
        9) echo "This reminds me of what my coach used to tell us back in high school. Timeless advice." ;;
      esac
      ;;
    helpful_addition)
      case $rand in
        0) echo "Great points! Id also add that staying hydrated makes a huge difference with this." ;;
        1) echo "One thing that helped me was keeping a journal to track progress. Might help others too." ;;
        2) echo "Pro tip: start small and build up gradually. Trying to do too much at once is how most people fail." ;;
        3) echo "For anyone struggling with this, there are some great apps that can help you stay on track." ;;
        4) echo "Another thing worth mentioning is the importance of sleep. Cant stress that enough." ;;
        5) echo "I found that doing this first thing in the morning works best. Your mileage may vary tho." ;;
        6) echo "If youre on a budget, you can substitute some of these with cheaper alternatives. Works just as well." ;;
        7) echo "Dont forget about the mental aspect too. Mindset is half the battle." ;;
        8) echo "Something that really helped me was finding an accountability partner. Makes it so much easier." ;;
        9) echo "Worth noting that results can vary a lot depending on your starting point. Be patient with yourself." ;;
      esac
      ;;
    grateful)
      case $rand in
        0) echo "Thank you so much for this! Exactly what I was searching for." ;;
        1) echo "This article came at the perfect time. Really grateful for this information." ;;
        2) echo "Ive been struggling with this for months. Thank you for the clear guidance!" ;;
        3) echo "Shared this with my whole family. We all needed to hear this. Thanks!" ;;
        4) echo "You have no idea how much this helps. Been feeling lost lately and this gives me direction." ;;
        5) echo "Finally some practical advice I can actually use! Thank you!" ;;
        6) echo "This is going to help so many people. Thanks for putting it out there." ;;
        7) echo "Printed this out and put it on my fridge. Thank you for the reminder!" ;;
        8) echo "My wife and I just read this together. Were both grateful for the info." ;;
        9) echo "This is the kind of content the internet needs more of. Genuinely helpful. Thank you." ;;
      esac
      ;;
    skeptical)
      case $rand in
        0) echo "Im not entirely convinced. Some of this seems a bit overstated to me." ;;
        1) echo "Interesting but Id like to see more evidence before fully committing to this." ;;
        2) echo "I respect the effort but this hasnt been my experience at all." ;;
        3) echo "Some valid points here but I think the reality is more nuanced than presented." ;;
        4) echo "Tried this before and didnt see the results promised. Maybe Im doing something wrong?" ;;
        5) echo "Not trying to be negative but this seems to oversimplify a complex issue." ;;
        6) echo "I appreciate the perspective but this contradicts what my doctor told me." ;;
        7) echo "Has anyone actually verified these claims? Seems too good to be true." ;;
        8) echo "I want to believe this but Ive been burned by similar advice before." ;;
        9) echo "Interesting theory but I think more research is needed before drawing conclusions." ;;
      esac
      ;;
    enthusiastic)
      case $rand in
        0) echo "THIS!! Ive been saying this for years and nobody listened. So glad to see it here!" ;;
        1) echo "Absolutely love this article! Going to try everything mentioned starting today!" ;;
        2) echo "YES! This is the content I subscribe for! More of this please!" ;;
        3) echo "Mind = blown. Never thought about it this way before. Game changer!" ;;
        4) echo "Ok I need to share this with literally everyone I know. This is too good!" ;;
        5) echo "This is gold! Saving this and coming back to it every week for motivation." ;;
        6) echo "Cant believe this is free content. This is better than paid courses Ive taken!" ;;
        7) echo "Dropped everything Im doing to read this twice. So good!" ;;
        8) echo "The excitement is real right now! Starting this journey TODAY!" ;;
        9) echo "Best thing Ive read all month! You guys never miss!" ;;
      esac
      ;;
    long_thoughtful)
      case $rand in
        0) echo "Ive spent the last hour reading through this and taking notes. What strikes me most is how practical the advice is. So many articles in this space are either too vague or too technical, but this hits the sweet spot. I especially appreciated the section about getting started - thats always the hardest part for me. Going to implement a few of these ideas this week and report back. Thanks for putting this together." ;;
        1) echo "As someone whos been researching this topic for over a year now, I can say this article covers the fundamentals really well. There are a few advanced concepts that could be explored further, but for most people starting out, this is exactly what they need. My only suggestion would be to add a section about common mistakes to avoid. That was something I had to learn the hard way!" ;;
        2) echo "This really resonates with me. I went through a health scare last year that made me completely rethink my approach to wellness. Articles like this one helped me educate myself and take control of my own health journey. Its not always easy and there are definitely setbacks, but having access to quality information makes all the difference. Keep up the great work!" ;;
        3) echo "I shared this with my book club (we read health and wellness books together) and it sparked an amazing 2-hour discussion. Everyone had something to add from their own experience. What I love about this article is that its not preachy or judgmental - it just presents the information and lets readers make their own decisions. Thats so refreshing these days." ;;
        4) echo "Reading this brought back memories of my grandmother who always emphasized natural approaches to health. She lived to 94 and was sharp as a tack until the end. Modern medicine has its place obviously but theres wisdom in traditional approaches that we shouldnt forget. This article does a nice job of bridging that gap between old and new." ;;
        5) echo "Ive been following this blog for about 6 months now and the quality has been consistently excellent. This article in particular stands out because it addresses some of the nuances that other sources gloss over. The point about individual variation is so important - what works for one person might not work for another. We need more content that acknowledges this complexity." ;;
        6) echo "Just finished reading this for the second time and picking up things I missed before. My husband and I are both trying to make healthier choices this year and articles like this give us a framework to work with. We dont always agree on everything but having shared information helps us have productive conversations about our goals. Thanks for the detailed breakdown!" ;;
        7) echo "I work in healthcare and I wish more of my patients would read content like this. Theres so much misinformation out there that its refreshing to see balanced, well-researched articles. Im going to bookmark this to share with patients who are interested in learning more. The section on getting started is particularly useful for people who feel overwhelmed." ;;
        8) echo "This is my third time commenting on this site and I keep coming back because the content is genuinely helpful. Unlike a lot of clickbait health content, this actually provides actionable information without trying to sell me something. I appreciate the transparency about what works and what doesnt. Its clear that the author has real experience with this topic." ;;
        9) echo "What I appreciate most about this article is that it acknowledges the challenges involved. So many wellness articles make everything sound easy and then people feel like failures when they struggle. The reality is that change is hard and takes time. Having realistic expectations from the start sets people up for long-term success rather than quick burnout. Great perspective here." ;;
      esac
      ;;
    casual_short)
      case $rand in
        0) echo "needed this today thx" ;;
        1) echo "good stuff" ;;
        2) echo "sharing this rn" ;;
        3) echo "yep can confirm this works" ;;
        4) echo "finally some real info" ;;
        5) echo "this is it right here" ;;
        6) echo "saving for later" ;;
        7) echo "great read" ;;
        8) echo "exactly what I was looking for" ;;
        9) echo "so true!!" ;;
      esac
      ;;
    reply_agreement)
      case $rand in
        0) echo "Couldnt agree more! Same experience here." ;;
        1) echo "This! 100% this." ;;
        2) echo "Exactly what I was thinking while reading." ;;
        3) echo "You nailed it. Totally agree." ;;
        4) echo "Same! Thought I was the only one." ;;
        5) echo "Great point. Wish I could upvote this twice." ;;
        6) echo "Youre absolutely right about this." ;;
        7) echo "This should be the top comment honestly." ;;
        8) echo "Came here to say the same thing!" ;;
        9) echo "Yes! Someone finally said it." ;;
      esac
      ;;
  esac
}

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

CATEGORIES=("supportive" "questioning" "personal_experience" "helpful_addition" "grateful" "skeptical" "enthusiastic" "long_thoughtful" "casual_short")

echo "================================================================="
echo "Adding comments to all articles"
echo "Started at: $(date)"
echo "================================================================="

for DB_NAME in "${BLOGS[@]}"; do
  echo ""
  echo "Processing: $DB_NAME"
  echo "-----------------------------------------------------------------"

  # Get all published posts
  posts=$(docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id, created_at FROM posts WHERE status = 'published' ORDER BY created_at;" 2>/dev/null)

  if [ -z "$posts" ]; then
    echo "  No posts found, skipping..."
    continue
  fi

  post_count=$(echo "$posts" | grep -c '|' || echo "0")
  echo "  Found $post_count posts"

  # Process each post
  while IFS='|' read -r post_id post_created_at; do
    post_id=$(echo "$post_id" | tr -d ' ')
    post_created_at=$(echo "$post_created_at" | tr -d ' ')

    if [ -z "$post_id" ]; then
      continue
    fi

    # Random number of comments between 12 and 49
    num_comments=$((RANDOM % 38 + 12))

    # Random number of likes between 200 and 2200
    num_likes=$((RANDOM % 2001 + 200))

    echo "  Adding $num_comments comments and $num_likes likes to post $post_id"

    # Clear existing comments for this post
    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM comments WHERE post_id = '$post_id';" 2>/dev/null

    # Store comment IDs for potential replies
    declare -a comment_ids=()

    for ((i=1; i<=num_comments; i++)); do
      # Generate unique comment ID
      comment_id="cmt-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 12 | head -n 1)"

      # Random name
      first_name="${FIRST_NAMES[$((RANDOM % ${#FIRST_NAMES[@]}))]}"
      last_name="${LAST_NAMES[$((RANDOM % ${#LAST_NAMES[@]}))]}"
      author_name="$first_name $last_name"

      # Generate email from name
      email_user=$(echo "${first_name,,}.${last_name,,}" | tr -d "'")
      domains=("gmail.com" "yahoo.com" "hotmail.com" "outlook.com" "aol.com" "icloud.com" "protonmail.com")
      domain="${domains[$((RANDOM % ${#domains[@]}))]}"
      author_email="${email_user}@${domain}"

      # Random category with weighted distribution
      weight=$((RANDOM % 100))
      if [ $weight -lt 25 ]; then
        category="supportive"
      elif [ $weight -lt 40 ]; then
        category="personal_experience"
      elif [ $weight -lt 55 ]; then
        category="grateful"
      elif [ $weight -lt 65 ]; then
        category="helpful_addition"
      elif [ $weight -lt 75 ]; then
        category="enthusiastic"
      elif [ $weight -lt 82 ]; then
        category="questioning"
      elif [ $weight -lt 88 ]; then
        category="long_thoughtful"
      elif [ $weight -lt 94 ]; then
        category="casual_short"
      else
        category="skeptical"
      fi

      # Generate comment content
      content=$(generate_comment "$category")

      # Escape single quotes for SQL
      content=$(echo "$content" | sed "s/'/''/g")
      author_name=$(echo "$author_name" | sed "s/'/''/g")

      # Determine if this is a reply (20% chance after first 3 comments)
      parent_id="NULL"
      if [ $i -gt 3 ] && [ ${#comment_ids[@]} -gt 0 ] && [ $((RANDOM % 100)) -lt 20 ]; then
        # Pick a random existing comment to reply to
        parent_idx=$((RANDOM % ${#comment_ids[@]}))
        parent_id="'${comment_ids[$parent_idx]}'"
        # Use reply-style comment
        content=$(generate_comment "reply_agreement")
        content=$(echo "$content" | sed "s/'/''/g")
      fi

      # Random timestamp between post creation and now (spread over time)
      # Add random hours (1 to 2000 hours after post)
      hours_after=$((RANDOM % 2000 + 1))

      # Insert comment
      docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO comments (id, post_id, parent_id, author_name, author_email, content, status, created_at)
        VALUES (
          '$comment_id',
          '$post_id',
          $parent_id,
          '$author_name',
          '$author_email',
          '$content',
          'approved',
          '$post_created_at'::timestamp + interval '$hours_after hours'
        );
      " 2>/dev/null

      # Store comment ID for potential replies
      comment_ids+=("$comment_id")
    done

    # Set likes count directly (much faster than inserting individual records)
    # The likes_count is what's displayed to users
    docker exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
      UPDATE posts SET likes_count = $num_likes WHERE id = '$post_id';
    " 2>/dev/null

    # Clear array for next post
    unset comment_ids
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
