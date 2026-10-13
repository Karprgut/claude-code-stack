#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Flint v1.0.0 — Interactive Init Script
# Full-stack setup: MongoDB, AWS, API keys, user profile, features
# ============================================================================

# -- Colors ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# -- State -------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/dashboard/.env.local"

# Collected config
MONGODB_URI=""
USER_NAME=""
USER_TIMEZONE=""
USER_COLORBLIND="false"
USER_DATE_FORMAT="YYYY-MM-DD"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
AWS_PROFILE=""
AWS_REGION="us-east-1"
DOMAIN=""
ECR_URI=""
EC2_INSTANCE_ID=""
ALLOWED_EMAILS=""
FLINT_TIMEZONE=""

declare -a PROJECTS=()        # "CODE|Label|#hex" entries
declare -a FEATURES=()        # enabled feature keys
declare -a MANAGED_PEOPLE=()  # "slug|name|project" entries
MIGRATE_V002=""

# -- Helpers -----------------------------------------------------------------

print_banner() {
  echo ""
  echo -e "${BOLD}${CYAN}"
  echo "  ╔═══════════════════════════════════════════╗"
  echo "  ║           Flint v1.0.0 — Init             ║"
  echo "  ║   Personal Knowledge Base & Life Manager   ║"
  echo "  ╚═══════════════════════════════════════════╝"
  echo -e "${RESET}"
  echo -e "  ${DIM}MongoDB + Next.js + Swift iOS + AWS${RESET}"
  echo ""
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━ $1 ━━━${RESET}"
  echo ""
}

success() {
  echo -e "  ${GREEN}✓${RESET} $1"
}

warn() {
  echo -e "  ${YELLOW}!${RESET} $1"
}

error() {
  echo -e "  ${RED}x${RESET} $1"
}

info() {
  echo -e "  ${DIM}$1${RESET}"
}

prompt() {
  local var_name="$1"
  local message="$2"
  local default="${3:-}"
  local value=""

  if [[ -n "$default" ]]; then
    echo -ne "  ${CYAN}?${RESET} ${message} ${DIM}[${default}]${RESET}: "
    read -r value
    value="${value:-$default}"
  else
    echo -ne "  ${CYAN}?${RESET} ${message}: "
    read -r value
  fi

  eval "$var_name=\"\$value\""
}

prompt_secret() {
  local var_name="$1"
  local message="$2"
  local value=""

  echo -ne "  ${CYAN}?${RESET} ${message}: "
  read -rs value
  echo ""

  eval "$var_name=\"\$value\""
}

prompt_yn() {
  local message="$1"
  local default="${2:-y}"
  local hint="Y/n"
  [[ "$default" == "n" ]] && hint="y/N"

  echo -ne "  ${CYAN}?${RESET} ${message} ${DIM}[${hint}]${RESET}: "
  read -r answer
  answer="${answer:-$default}"

  [[ "${answer,,}" == "y" || "${answer,,}" == "yes" ]]
}

# -- Section 1: Prerequisites ------------------------------------------------

check_prerequisites() {
  section "1/12  Prerequisites"

  local ok=true

  # Node.js
  if command -v node &>/dev/null; then
    local node_version
    node_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ "$node_version" -ge 22 ]]; then
      success "Node.js $(node -v)"
    else
      error "Node.js $(node -v) — version 22+ required"
      ok=false
    fi
  else
    error "Node.js not found — install v22+ from https://nodejs.org"
    ok=false
  fi

  # pnpm
  if command -v pnpm &>/dev/null; then
    success "pnpm $(pnpm -v)"
  else
    warn "pnpm not found — installing globally..."
    npm install -g pnpm 2>/dev/null && success "pnpm installed" || { error "Failed to install pnpm"; ok=false; }
  fi

  # git
  if command -v git &>/dev/null; then
    success "git $(git --version | awk '{print $3}')"
  else
    warn "git not found — optional but recommended"
  fi

  if [[ "$ok" == false ]]; then
    echo ""
    error "Fix the above issues and re-run this script."
    exit 1
  fi
}

# -- Section 2: MongoDB ------------------------------------------------------

setup_mongodb() {
  section "2/12  MongoDB"

  info "Flint stores all data in MongoDB Atlas (or any MongoDB 6+ instance)."
  info "Get a free cluster at https://cloud.mongodb.com"
  echo ""

  prompt MONGODB_URI "MongoDB connection URI" ""

  if [[ -z "$MONGODB_URI" ]]; then
    error "MongoDB URI is required. Cannot continue without a database."
    exit 1
  fi

  # Test connection
  echo -ne "  ${DIM}Testing connection...${RESET}"
  local test_result
  test_result=$(MONGODB_URI="$MONGODB_URI" node -e "
    const { MongoClient } = require('mongodb');
    const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    c.connect().then(() => c.db('flint').command({ ping: 1 }))
      .then(() => { console.log('ok'); c.close(); })
      .catch(e => { console.log('fail:' + e.message); c.close(); });
  " 2>/dev/null || echo "fail:node error")

  echo -ne "\r                              \r"
  if [[ "$test_result" == "ok" ]]; then
    success "Connected to MongoDB"
  else
    local err_msg="${test_result#fail:}"
    warn "Connection test failed: ${err_msg}"
    if prompt_yn "Continue anyway?"; then
      warn "Proceeding — fix the connection before starting Flint"
    else
      exit 1
    fi
  fi
}

# -- Section 3: User Profile -------------------------------------------------

setup_user_profile() {
  section "3/12  User Profile"

  prompt USER_NAME "Your name" ""

  if [[ -z "$USER_NAME" ]]; then
    error "Name is required."
    exit 1
  fi

  # Auto-detect timezone
  local detected_tz=""
  if command -v timedatectl &>/dev/null; then
    detected_tz=$(timedatectl show --property=Timezone --value 2>/dev/null || echo "")
  fi
  if [[ -z "$detected_tz" ]] && [[ -f /etc/timezone ]]; then
    detected_tz=$(cat /etc/timezone 2>/dev/null || echo "")
  fi
  if [[ -z "$detected_tz" ]] && command -v readlink &>/dev/null; then
    detected_tz=$(readlink /etc/localtime 2>/dev/null | sed 's|.*/zoneinfo/||' || echo "")
  fi
  if [[ -z "$detected_tz" ]]; then
    detected_tz="America/New_York"
  fi

  prompt USER_TIMEZONE "Timezone" "$detected_tz"
  FLINT_TIMEZONE="$USER_TIMEZONE"

  prompt USER_DATE_FORMAT "Date format" "YYYY-MM-DD"

  if prompt_yn "Are you colorblind? (Flint uses patterns/labels instead of color-only)" "n"; then
    USER_COLORBLIND="true"
  fi

  success "Profile: $USER_NAME ($USER_TIMEZONE)"
}

# -- Section 4: Projects -----------------------------------------------------

setup_projects() {
  section "4/12  Projects"

  info "Define the projects you work on. Each gets a short code, label, and color."
  info "Examples: WORK/Work, STARTUP/My Startup, PER/Personal"
  echo ""

  # Color palette
  local -a PALETTE=(
    "#2563eb|Blue"
    "#16a34a|Green"
    "#9333ea|Purple"
    "#dc2626|Red"
    "#ea580c|Orange"
    "#0891b2|Teal"
    "#c026d3|Magenta"
    "#65a30d|Lime"
    "#6b7280|Gray"
    "#eab308|Yellow"
  )
  local color_idx=0

  # Always add Personal
  PROJECTS+=("PER|Personal|#6b7280")
  success "Added: PER — Personal (gray)"

  while true; do
    echo ""
    local code=""
    prompt code "Project code (2-5 uppercase letters, or 'done' to finish)" ""

    if [[ "${code,,}" == "done" || -z "$code" ]]; then
      break
    fi

    # Validate code
    code="${code^^}"  # uppercase
    if [[ ! "$code" =~ ^[A-Z]{2,5}$ ]]; then
      error "Code must be 2-5 uppercase letters (e.g., WORK, FC, STARTUP)"
      continue
    fi

    if [[ "$code" == "PER" ]]; then
      warn "PER already exists, skipping"
      continue
    fi

    local label=""
    prompt label "Label for $code" "$code"

    # Show color palette
    echo ""
    info "Pick a color:"
    for i in "${!PALETTE[@]}"; do
      local hex="${PALETTE[$i]%%|*}"
      local name="${PALETTE[$i]#*|}"
      echo -e "    ${DIM}$((i+1)))${RESET} $name ${DIM}($hex)${RESET}"
    done
    echo ""

    local color_choice=""
    prompt color_choice "Color number" "$((color_idx % ${#PALETTE[@]} + 1))"

    local chosen_idx=$((color_choice - 1))
    if [[ $chosen_idx -lt 0 || $chosen_idx -ge ${#PALETTE[@]} ]]; then
      chosen_idx=$((color_idx % ${#PALETTE[@]}))
    fi

    local chosen_hex="${PALETTE[$chosen_idx]%%|*}"
    local chosen_name="${PALETTE[$chosen_idx]#*|}"

    PROJECTS+=("$code|$label|$chosen_hex")
    success "Added: $code — $label ($chosen_name)"
    color_idx=$((color_idx + 1))
  done

  echo ""
  info "Projects configured: ${#PROJECTS[@]}"
  for p in "${PROJECTS[@]}"; do
    local c="${p%%|*}"
    local rest="${p#*|}"
    local l="${rest%%|*}"
    echo -e "    ${BOLD}$c${RESET} — $l"
  done
}

# -- Section 5: Features -----------------------------------------------------

setup_features() {
  section "5/12  Features"

  info "Toggle features on/off. All can be changed later via MongoDB."
  echo ""

  local -a ALL_FEATURES=(
    "todos|Task Management|true"
    "people|People Directory & Tracking|true"
    "daily_summaries|Daily Summaries|true"
    "weekly_summaries|Weekly Summaries|true"
    "mental_health|Mental Health (mood/sleep)|true"
    "metrics|Daily & Weekly Metrics|true"
    "engineer_scores|Engineer/Team Scoring (11 dimensions)|false"
    "manager_feedback|Manager/Leadership Self-Assessment|false"
    "recurring_tasks|Recurring Task System|true"
    "milestones|Project Milestones|false"
    "chat|AI Chat (multi-provider)|true"
    "ai_memory|Shared AI Memory|true"
    "wishlist|Wishlist|false"
  )

  local -a feature_states=()
  for f in "${ALL_FEATURES[@]}"; do
    local state="${f##*|}"
    feature_states+=("$state")
  done

  echo -e "  ${DIM}Enter numbers to toggle, 'all' to enable all, 'done' to continue${RESET}"
  echo ""

  while true; do
    for i in "${!ALL_FEATURES[@]}"; do
      local entry="${ALL_FEATURES[$i]}"
      local key="${entry%%|*}"
      local rest="${entry#*|}"
      local label="${rest%%|*}"
      local state="${feature_states[$i]}"

      if [[ "$state" == "true" ]]; then
        echo -e "    ${GREEN}[$((i+1))]${RESET} ${BOLD}$label${RESET}"
      else
        echo -e "    ${DIM}[$((i+1))] $label${RESET}"
      fi
    done

    echo ""
    local toggle=""
    prompt toggle "Toggle (number/all/done)" "done"

    if [[ "$toggle" == "done" ]]; then
      break
    elif [[ "$toggle" == "all" ]]; then
      for i in "${!feature_states[@]}"; do
        feature_states[$i]="true"
      done
      echo ""
      success "All features enabled"
      echo ""
      continue
    fi

    # Handle comma-separated or single number
    IFS=',' read -ra nums <<< "$toggle"
    for num in "${nums[@]}"; do
      num=$(echo "$num" | tr -d ' ')
      if [[ "$num" =~ ^[0-9]+$ ]] && [[ $num -ge 1 ]] && [[ $num -le ${#ALL_FEATURES[@]} ]]; then
        local idx=$((num - 1))
        if [[ "${feature_states[$idx]}" == "true" ]]; then
          feature_states[$idx]="false"
        else
          feature_states[$idx]="true"
        fi
      fi
    done
    echo ""
  done

  # Collect enabled features
  FEATURES=()
  for i in "${!ALL_FEATURES[@]}"; do
    if [[ "${feature_states[$i]}" == "true" ]]; then
      local key="${ALL_FEATURES[$i]%%|*}"
      FEATURES+=("$key")
    fi
  done

  success "${#FEATURES[@]} features enabled"
}

# -- Section 6: People -------------------------------------------------------

setup_people() {
  section "6/12  People"

  # Check if engineer_scores or manager_feedback is enabled
  local has_scoring=false
  for f in "${FEATURES[@]}"; do
    [[ "$f" == "engineer_scores" || "$f" == "manager_feedback" ]] && has_scoring=true
  done

  info "Add people you manage or work closely with."
  if [[ "$has_scoring" == true ]]; then
    info "Engineers you add here will appear in the scoring dashboard."
  fi
  info "You can always add more people later via Claude Code or the dashboard."
  echo ""

  if ! prompt_yn "Add people now?" "n"; then
    info "Skipped — add people later via Claude Code"
    return
  fi

  echo ""
  while true; do
    local person_name=""
    prompt person_name "Person's full name (or 'done' to finish)" ""

    if [[ "${person_name,,}" == "done" || -z "$person_name" ]]; then
      break
    fi

    # Generate slug from name
    local slug
    slug=$(echo "$person_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

    local role=""
    prompt role "Role/title" ""

    # Pick project
    echo ""
    info "Which project?"
    for i in "${!PROJECTS[@]}"; do
      local p="${PROJECTS[$i]}"
      local c="${p%%|*}"
      local rest="${p#*|}"
      local l="${rest%%|*}"
      echo -e "    ${DIM}$((i+1)))${RESET} $c — $l"
    done
    echo ""

    local proj_choice=""
    prompt proj_choice "Project number" "1"
    local proj_idx=$((proj_choice - 1))
    if [[ $proj_idx -lt 0 || $proj_idx -ge ${#PROJECTS[@]} ]]; then
      proj_idx=0
    fi
    local proj_code="${PROJECTS[$proj_idx]%%|*}"

    MANAGED_PEOPLE+=("$slug|$person_name|$role|$proj_code")
    success "Added: $person_name ($role) — $proj_code"
    echo ""
  done

  if [[ ${#MANAGED_PEOPLE[@]} -gt 0 ]]; then
    success "${#MANAGED_PEOPLE[@]} people configured"
  fi
}

# -- Section 7: API Keys -----------------------------------------------------

setup_api_keys() {
  section "7/12  API Keys"

  info "API keys are stored in .env.local (never committed to git)."
  info "Press Enter to skip any key — you can add them later."
  echo ""

  # Anthropic
  echo -e "  ${BOLD}Anthropic (Claude)${RESET} — https://console.anthropic.com/settings/keys"
  info "Powers the AI chat and Claude Code agent"
  prompt_secret ANTHROPIC_API_KEY "  API key (sk-ant-...)"
  [[ -n "$ANTHROPIC_API_KEY" ]] && success "Anthropic key set" || info "Skipped"
  echo ""

  # OpenAI
  echo -e "  ${BOLD}OpenAI${RESET} — https://platform.openai.com/api-keys"
  info "Optional — enables GPT models in the multi-provider chat"
  prompt_secret OPENAI_API_KEY "  API key (sk-...)"
  [[ -n "$OPENAI_API_KEY" ]] && success "OpenAI key set" || info "Skipped"
}

# -- Section 8: AWS (Optional) -----------------------------------------------

setup_aws() {
  section "8/12  AWS (Optional)"

  info "Flint can deploy to AWS (EC2 + ALB + ECR) for cloud access."
  info "Skip this if you only want to run locally."
  echo ""

  if ! prompt_yn "Configure AWS deployment?" "n"; then
    info "Skipped — Flint will run locally at http://localhost:5555"
    return
  fi

  echo ""
  prompt AWS_PROFILE "AWS CLI profile name" "default"
  prompt AWS_REGION "AWS region" "us-east-1"
  prompt DOMAIN "Domain for Flint (e.g., flint.yourdomain.com)" ""
  prompt ECR_URI "ECR repository URI" ""
  prompt EC2_INSTANCE_ID "EC2 instance ID (i-...)" ""

  echo ""
  if [[ -n "$DOMAIN" ]]; then
    success "AWS configured: $DOMAIN ($AWS_REGION)"
  else
    warn "No domain set — you'll need to configure this later for deployment"
  fi
}

# -- Section 9: Auth ---------------------------------------------------------

setup_auth() {
  section "9/12  Authentication"

  info "When deployed behind AWS ALB with OIDC, only whitelisted emails can access."
  info "In local dev, all access is allowed regardless."
  echo ""

  prompt ALLOWED_EMAILS "Allowed emails (comma-separated, or Enter to skip)" ""

  if [[ -n "$ALLOWED_EMAILS" ]]; then
    success "Auth: ${ALLOWED_EMAILS}"
  else
    info "No restriction — all users allowed (configure later for production)"
  fi
}

# -- Section 10: Write .env.local --------------------------------------------

write_env_file() {
  section "10/12  Writing .env.local"

  if [[ ! -d "$SCRIPT_DIR/dashboard" ]]; then
    error "dashboard/ directory not found. Are you running from the Flint root?"
    exit 1
  fi

  cat > "$ENV_FILE" << ENVEOF
# ============================================================================
# Flint v1.0.0 — Environment Configuration
# Generated by flint-init.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ============================================================================

# --- Required ----------------------------------------------------------------
MONGODB_URI=${MONGODB_URI}

# --- Timezone ----------------------------------------------------------------
FLINT_TIMEZONE=${FLINT_TIMEZONE}

# --- Authentication (comma-separated emails for ALB OIDC) --------------------
ALLOWED_EMAILS=${ALLOWED_EMAILS}

# --- AI Providers ------------------------------------------------------------
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}

# --- AWS (optional, for deployment) ------------------------------------------
AWS_PROFILE=${AWS_PROFILE}
AWS_REGION=${AWS_REGION}
DOMAIN=${DOMAIN}
ECR_URI=${ECR_URI}
EC2_INSTANCE_ID=${EC2_INSTANCE_ID}
ENVEOF

  success "Wrote $ENV_FILE"
}

# -- Section 11: Seed MongoDB ------------------------------------------------

seed_mongodb() {
  section "11/12  Seeding MongoDB"

  # Build projects JSON array
  local projects_json="["
  local first=true
  for p in "${PROJECTS[@]}"; do
    local code="${p%%|*}"
    local rest="${p#*|}"
    local label="${rest%%|*}"
    local color="${rest##*|}"

    if [[ "$first" == true ]]; then
      first=false
    else
      projects_json+=","
    fi
    projects_json+="{\"code\":\"$code\",\"label\":\"$label\",\"color\":\"$color\"}"
  done
  projects_json+="]"

  # Build features JSON array
  local features_json="["
  first=true
  for f in "${FEATURES[@]}"; do
    if [[ "$first" == true ]]; then
      first=false
    else
      features_json+=","
    fi
    features_json+="\"$f\""
  done
  features_json+="]"

  # Build people JSON array
  local people_json="["
  first=true
  for p in "${MANAGED_PEOPLE[@]}"; do
    local slug="${p%%|*}"
    local rest="${p#*|}"
    local name="${rest%%|*}"
    rest="${rest#*|}"
    local role="${rest%%|*}"
    local proj="${rest##*|}"

    if [[ "$first" == true ]]; then
      first=false
    else
      people_json+=","
    fi
    people_json+="{\"slug\":\"$slug\",\"name\":\"$name\",\"role\":\"$role\",\"project\":\"$proj\"}"
  done
  people_json+="]"

  # Seed using Node.js directly
  local seed_result
  seed_result=$(MONGODB_URI="$MONGODB_URI" node -e "
    const { MongoClient } = require('mongodb');

    async function seed() {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db('flint');
      const col = db.collection('system_config');
      const now = new Date().toISOString();

      // User profile
      await col.updateOne(
        { _id: 'user_profile' },
        { \$set: {
          name: $(printf '%s' "$USER_NAME" | node -e "process.stdout.write(JSON.stringify(require('fs').readFileSync(0,'utf8')))"),
          timezone: '$USER_TIMEZONE',
          colorblind: $USER_COLORBLIND,
          dateFormat: '$USER_DATE_FORMAT',
          updatedAt: now
        }, \$setOnInsert: { createdAt: now } },
        { upsert: true }
      );

      // Projects
      await col.updateOne(
        { _id: 'projects' },
        { \$set: { list: $projects_json, updatedAt: now },
          \$setOnInsert: { createdAt: now } },
        { upsert: true }
      );

      // Features
      await col.updateOne(
        { _id: 'features' },
        { \$set: { enabled: $features_json, updatedAt: now },
          \$setOnInsert: { createdAt: now } },
        { upsert: true }
      );

      // Managed people
      await col.updateOne(
        { _id: 'managed_people' },
        { \$set: { engineers: $people_json, updatedAt: now },
          \$setOnInsert: { createdAt: now } },
        { upsert: true }
      );

      // Default todo sections
      const sections = db.collection('todo_sections');
      const existing = await sections.countDocuments();
      if (existing === 0) {
        await sections.insertMany([
          { _id: 'today', title: 'Today', order: 0, createdAt: now },
          { _id: 'short-term', title: 'Short Term', order: 1, createdAt: now },
          { _id: 'medium-term', title: 'Medium Term', order: 2, createdAt: now },
          { _id: 'long-term', title: 'Long Term', order: 3, createdAt: now },
        ]);
      }

      // Seed people into the people collection
      const people = $people_json;
      if (people.length > 0) {
        const peopleColl = db.collection('people');
        for (const p of people) {
          await peopleColl.updateOne(
            { _id: p.project.toLowerCase() + ':' + p.slug },
            { \$set: {
              project: p.project.toLowerCase(),
              slug: p.slug,
              name: p.name,
              role: p.role,
              team: '',
              content: '',
              favorite: false,
              updatedAt: now
            }, \$setOnInsert: { createdAt: now } },
            { upsert: true }
          );
        }
      }

      await client.close();
      console.log('ok');
    }

    seed().catch(e => { console.log('fail:' + e.message); process.exit(1); });
  " 2>/dev/null || echo "fail:node error")

  if [[ "$seed_result" == "ok" ]]; then
    success "Seeded system_config (user_profile, projects, features)"
    success "Created default todo sections"
    [[ ${#MANAGED_PEOPLE[@]} -gt 0 ]] && success "Added ${#MANAGED_PEOPLE[@]} people to database"
  else
    local err="${seed_result#fail:}"
    error "Failed to seed MongoDB: $err"
    warn "You can re-run this script to try again"
  fi
}

# -- Section 12: Install + Wrap Up -------------------------------------------

install_and_finish() {
  section "12/12  Final Setup"

  # Install dashboard dependencies
  if [[ -f "$SCRIPT_DIR/dashboard/package.json" ]]; then
    echo -ne "  ${DIM}Installing dashboard dependencies...${RESET}"
    if (cd "$SCRIPT_DIR/dashboard" && pnpm install --silent 2>/dev/null); then
      echo -ne "\r                                          \r"
      success "Dashboard dependencies installed"
    else
      echo -ne "\r                                          \r"
      warn "pnpm install failed — run manually: cd dashboard && pnpm install"
    fi
  fi

  # iOS setup
  if [[ -d "$SCRIPT_DIR/ios" ]]; then
    echo ""
    if prompt_yn "Configure iOS app?" "n"; then
      echo ""
      local ios_api_url=""
      if [[ -n "$DOMAIN" ]]; then
        prompt ios_api_url "API base URL for iOS" "https://$DOMAIN"
      else
        prompt ios_api_url "API base URL for iOS" "http://localhost:3000"
      fi

      local bundle_id=""
      prompt bundle_id "Bundle ID prefix" "com.flint"

      local config_dir="$SCRIPT_DIR/ios/Flint/Config"
      mkdir -p "$config_dir"

      cat > "$config_dir/Development.xcconfig" << XCEOF
// Development Configuration — Generated by flint-init.sh
FLINT_API_URL = http://localhost:3000
PRODUCT_BUNDLE_IDENTIFIER = ${bundle_id}.flint.dev
XCEOF

      cat > "$config_dir/Production.xcconfig" << XCEOF
// Production Configuration — Generated by flint-init.sh
FLINT_API_URL = ${ios_api_url}
PRODUCT_BUNDLE_IDENTIFIER = ${bundle_id}.flint
XCEOF

      success "Wrote iOS xcconfig files"
    fi
  fi

  # v0.0.2 migration
  echo ""
  if prompt_yn "Migrating from Flint v0.0.2 (file-based)?" "n"; then
    echo ""
    prompt MIGRATE_V002 "Path to your v0.0.2 directory" ""

    if [[ -n "$MIGRATE_V002" && -f "$MIGRATE_V002/todo.json" ]]; then
      local migrate_script="$SCRIPT_DIR/scripts/migrate-from-v002.mjs"
      if [[ -f "$migrate_script" ]]; then
        info "Running migration..."
        if MONGODB_URI="$MONGODB_URI" node "$migrate_script" --source "$MIGRATE_V002" 2>&1; then
          success "Migration complete"
        else
          error "Migration failed — check output above"
          info "Re-run: MONGODB_URI=... node scripts/migrate-from-v002.mjs --source $MIGRATE_V002"
        fi
      else
        warn "Migration script not yet available at $migrate_script"
        info "Run it later: node scripts/migrate-from-v002.mjs --source $MIGRATE_V002"
      fi
    elif [[ -n "$MIGRATE_V002" ]]; then
      error "Doesn't look like a v0.0.2 directory (no todo.json found)"
    fi
  fi
}

# -- Summary ------------------------------------------------------------------

print_summary() {
  echo ""
  echo ""
  echo -e "${BOLD}${GREEN}━━━ Setup Complete ━━━${RESET}"
  echo ""
  echo -e "  ${BOLD}User:${RESET}       $USER_NAME"
  echo -e "  ${BOLD}Timezone:${RESET}   $USER_TIMEZONE"
  echo -e "  ${BOLD}Projects:${RESET}   ${#PROJECTS[@]}"
  echo -e "  ${BOLD}Features:${RESET}   ${#FEATURES[@]} enabled"
  echo -e "  ${BOLD}People:${RESET}     ${#MANAGED_PEOPLE[@]}"
  echo -e "  ${BOLD}Database:${RESET}   MongoDB Atlas"
  [[ -n "$DOMAIN" ]] && echo -e "  ${BOLD}Domain:${RESET}     $DOMAIN"
  [[ -n "$ANTHROPIC_API_KEY" ]] && echo -e "  ${BOLD}AI:${RESET}         Claude"
  [[ -n "$OPENAI_API_KEY" ]] && echo -e "  ${BOLD}AI:${RESET}         + OpenAI"
  echo ""
  echo -e "  ${BOLD}Config:${RESET}     $ENV_FILE"
  echo ""
  echo -e "${BOLD}${CYAN}  Next Steps:${RESET}"
  echo ""
  echo -e "  1. Start the dashboard:"
  echo -e "     ${DIM}cd dashboard && pnpm dev${RESET}"
  echo -e "     ${DIM}Open http://localhost:5555${RESET}"
  echo ""
  echo -e "  2. Start Claude Code:"
  echo -e "     ${DIM}claude --dangerously-skip-permissions${RESET}"
  echo -e "     ${DIM}Say \"let's start the day\"${RESET}"
  echo ""

  if [[ -d "$SCRIPT_DIR/ios" ]]; then
    echo -e "  3. iOS app (optional):"
    echo -e "     ${DIM}Open ios/Flint.xcodeproj in Xcode, then Run${RESET}"
    echo ""
  fi

  if [[ -n "$DOMAIN" ]]; then
    local step=3
    [[ -d "$SCRIPT_DIR/ios" ]] && step=4
    echo -e "  $step. Deploy to AWS:"
    echo -e "     ${DIM}cd terraform && terraform init && terraform apply${RESET}"
    echo -e "     ${DIM}bash dashboard/scripts/deploy.sh${RESET}"
    echo ""
  fi

  echo -e "  ${DIM}To reconfigure, re-run: bash flint-init.sh${RESET}"
  echo ""
}

# -- Main ---------------------------------------------------------------------

main() {
  print_banner
  check_prerequisites
  setup_mongodb
  setup_user_profile
  setup_projects
  setup_features
  setup_people
  setup_api_keys
  setup_aws
  setup_auth
  write_env_file
  seed_mongodb
  install_and_finish
  print_summary
}

main "$@"
