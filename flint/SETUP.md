# Flint v1.0.0 — Setup Guide

This guide walks you through setting up Flint from scratch. No prior experience with MongoDB, AWS, or iOS development is required for the basic setup.

---

## What You'll Need

Before starting, make sure you have:

- [ ] A computer running **macOS** or **Linux**
- [ ] An internet connection
- [ ] About 30 minutes for the basic setup

---

## Part 1: Install the Tools

### 1.1 Install Node.js (version 22 or higher)

Node.js is what runs the Flint dashboard. You need version 22+.

**Check if you already have it:**
```bash
node -v
```
If it says `v22.x.x` or higher, skip to 1.2.

**Install it:**
- Go to https://nodejs.org
- Download the **LTS** version (make sure it's 22+)
- Run the installer
- Close and reopen your terminal
- Run `node -v` again to confirm

### 1.2 Install pnpm (package manager)

pnpm is what installs Flint's dependencies. It's faster and more efficient than npm.

```bash
npm install -g pnpm
```

**Verify:** `pnpm -v` should show a version number.

### 1.3 Install Git (optional but recommended)

Git lets you track changes and sync with a remote repository.

**Check:** `git --version`

If not installed:
- **macOS:** It auto-installs when you run the command above (follow the prompt)
- **Linux:** `sudo apt install git` (Ubuntu/Debian) or `sudo dnf install git` (Fedora)

---

## Part 2: Set Up MongoDB (Your Database)

Flint stores everything — todos, people notes, daily summaries, scores — in MongoDB. You need a database.

### 2.1 Create a MongoDB Atlas Account (Free)

1. Go to https://cloud.mongodb.com
2. Click **"Try Free"** and sign up (Google/GitHub login works)
3. You'll land on the Atlas dashboard

### 2.2 Create a Cluster

1. Click **"Build a Database"** (or **"Create"**)
2. Choose **M0 Free** tier (this is completely free, no credit card needed)
3. Pick a cloud provider and region close to you (e.g., AWS us-east-1)
4. Name it whatever you want (e.g., "flint-cluster")
5. Click **"Create Deployment"**
6. Wait ~2 minutes for it to provision

### 2.3 Create a Database User

When prompted (or go to **Database Access** in the left sidebar):

1. Click **"Add New Database User"**
2. Choose **Password** authentication
3. Enter a username (e.g., `flint-admin`)
4. Click **"Autogenerate Secure Password"** — **copy this password somewhere safe!**
5. Under "Database User Privileges", select **"Read and write to any database"**
6. Click **"Add User"**

### 2.4 Allow Your IP Address

Go to **Network Access** in the left sidebar:

1. Click **"Add IP Address"**
2. Click **"Allow Access from Anywhere"** (or add your specific IP for better security)
3. Click **"Confirm"**

### 2.5 Get Your Connection String

1. Go back to **Database** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Drivers"**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://flint-admin:<password>@flint-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you saved in step 2.3
6. **Add `/flint`** before the `?` so it points to the right database:
   ```
   mongodb+srv://flint-admin:YOUR_PASSWORD@flint-cluster.abc123.mongodb.net/flint?retryWrites=true&w=majority
   ```

**Save this URI** — you'll need it in the next step.

---

## Part 3: Set Up Flint

You have two options: the automated setup script, or manual configuration.

### Option A: Automated Setup (Recommended)

This interactive script handles everything — database connection, user profile, projects, features, and API keys.

```bash
bash flint-init.sh
```

It will walk you through 12 steps:
1. Check that Node.js and pnpm are installed
2. Connect to your MongoDB (paste your connection URI)
3. Set up your profile (name, timezone)
4. Define your projects (e.g., "Work", "Freelance")
5. Choose which features to enable
6. Add people you manage (optional)
7. Enter API keys for AI chat (optional)
8. Configure AWS deployment (optional — skip if running locally)
9. Set up authentication (optional)
10. Write your configuration file
11. Seed your database with initial data
12. Install dependencies and show next steps

**When it's done, skip to Part 4.**

### Option B: Manual Setup

If you prefer to configure things yourself:

#### 3.1 Create your environment file

```bash
cp dashboard/.env.example dashboard/.env.local
```

Open `dashboard/.env.local` in a text editor and fill in:

```env
# REQUIRED — paste your MongoDB URI from Part 2
MONGODB_URI=mongodb+srv://flint-admin:YOUR_PASSWORD@flint-cluster.abc123.mongodb.net/flint?retryWrites=true&w=majority

# Your timezone (find yours at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
FLINT_TIMEZONE=America/New_York

# OPTIONAL — for AI chat features
ANTHROPIC_API_KEY=sk-ant-...    # Get one at https://console.anthropic.com/settings/keys
OPENAI_API_KEY=sk-...           # Get one at https://platform.openai.com/api-keys
```

#### 3.2 Install dependencies

```bash
cd dashboard
pnpm install
```

This downloads all the packages Flint needs. It may take 1-2 minutes.

#### 3.3 Seed your database

The database needs some initial data to work. Run these commands:

```bash
cd dashboard

# Create the todo board sections
node scripts/mongo-cli.mjs raw insert todo_sections '{"_id":"today","title":"Today","order":0}'
node scripts/mongo-cli.mjs raw insert todo_sections '{"_id":"short-term","title":"Short Term","order":1}'
node scripts/mongo-cli.mjs raw insert todo_sections '{"_id":"medium-term","title":"Medium Term","order":2}'
node scripts/mongo-cli.mjs raw insert todo_sections '{"_id":"long-term","title":"Long Term","order":3}'

# Set up your profile (change "Your Name" to your actual name)
node scripts/mongo-cli.mjs raw insert system_config '{"_id":"user_profile","name":"Your Name","timezone":"America/New_York","colorblind":false}'

# Define your projects (customize the codes and labels)
node scripts/mongo-cli.mjs raw insert system_config '{"_id":"projects","list":[{"code":"WORK","label":"Work","color":"#2563eb"},{"code":"PER","label":"Personal","color":"#6b7280"}]}'

# Enable features
node scripts/mongo-cli.mjs raw insert system_config '{"_id":"features","enabled":["todos","people","daily_summaries","weekly_summaries","mental_health","metrics","recurring_tasks","chat","ai_memory"]}'
```

---

## Part 4: Start the Dashboard

```bash
cd dashboard
pnpm dev
```

Open your browser and go to: **http://localhost:5555**

You should see the Flint dashboard with empty data. If you see an error:
- **"Cannot connect to MongoDB"** — double-check your `MONGODB_URI` in `.env.local`
- **"Module not found"** — run `pnpm install` again
- **Blank page** — check the terminal for errors

---

## Part 5: Set Up Claude Code (The AI Agent)

Claude Code is what makes Flint smart. It's the AI that manages your day, tracks people notes, generates summaries, and scores engineers.

### 5.1 Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 5.2 Get an Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Add it to your `dashboard/.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### 5.3 Start Claude Code

From the Flint root directory (not the dashboard directory):

```bash
claude --dangerously-skip-permissions
```

The `--dangerously-skip-permissions` flag lets Flint execute commands without asking for confirmation each time. This is safe because Flint only runs read/write operations on your local files and MongoDB.

### 5.4 Your First Session

Once Claude Code starts, say:

```
let's start the day
```

Flint will:
- Pull the latest git changes (if you have a repo)
- Check yesterday's summary
- Load your recurring tasks
- Show your todo list
- Ask how you slept (if mental health tracking is enabled)

---

## Part 6: Daily Usage

### Morning
1. Open your terminal
2. Make sure the dashboard is running: `cd dashboard && pnpm dev`
3. Start Claude Code: `claude --dangerously-skip-permissions`
4. Say: **"let's start the day"**

### During the Day
Tell Flint what you're doing:
- "Add todo: review PR #123"
- "Mark the PR review as done"
- "Note on Sarah: she's blocked on the API migration"
- Send screenshots of Slack/Teams conversations — Flint logs people notes and extracts action items

### End of Day
Say: **"let's wrap up"**

Flint will:
- Ask how you're feeling (mood tracking)
- Ask for notes on your team
- Generate a daily summary
- Score engineers (if enabled)
- Run manager feedback (if enabled)

---

## Optional: Deploy to the Cloud (AWS)

If you want to access Flint from anywhere (not just localhost), you can deploy to AWS.

**Prerequisites:**
- [ ] An AWS account
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Terraform installed (https://developer.hashicorp.com/terraform/install)
- [ ] A domain name (e.g., `flint.yourdomain.com`)

### Steps:

1. Copy the Terraform variables template:
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

2. Edit `terraform/terraform.tfvars` with your AWS details:
   ```hcl
   region          = "us-east-1"
   aws_profile     = "default"
   domain          = "flint.yourdomain.com"
   hosted_zone_name = "yourdomain.com"
   mongodb_uri     = "mongodb+srv://..."
   # ... other variables
   ```

3. Deploy the infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

4. Point your domain DNS to the ALB (Terraform will output the DNS name)

5. Deploy the app:
   ```bash
   bash dashboard/scripts/deploy.sh
   ```

---

## Optional: iOS App

Flint has a native iOS app that connects to the same API as the web dashboard.

**Prerequisites:**
- [ ] A Mac with Xcode installed
- [ ] The dashboard running (locally or deployed)

### Steps:

1. Open `ios/Flint.xcodeproj` in Xcode
2. Set the API URL:
   - For local dev: Edit `ios/Flint/Core/API/APIClient.swift` — the default is `http://localhost:3000`
   - For deployed: Create xcconfig files (the init script does this for you)
3. Select your simulator or device
4. Click **Run** (or press Cmd+R)

---

## Upgrading from v0.0.2

If you were using the file-based Flint Starter Pack (v0.0.2), you can migrate your data to MongoDB.

**What gets migrated:**
- Todos and completed todos
- People profiles and interaction logs
- Mental health entries
- Wishlist items
- Daily and weekly summaries
- AI memory

**Steps:**

1. Make sure your v1.0.0 is set up and connected to MongoDB (Parts 1-3 above)
2. Run the migration:
   ```bash
   MONGODB_URI="your-uri" node scripts/migrate-from-v002.mjs --source /path/to/your/v0.0.2/directory
   ```
3. Preview first without writing (dry run):
   ```bash
   MONGODB_URI="your-uri" node scripts/migrate-from-v002.mjs --source /path/to/v0.0.2 --dry-run
   ```
4. Check the dashboard — your data should appear

---

## Troubleshooting

### Dashboard won't start
- **Check Node version:** `node -v` must be 22+
- **Check dependencies:** Run `cd dashboard && pnpm install`
- **Check .env.local:** Make sure `MONGODB_URI` is set correctly

### Pages show empty data
- **Collections are empty:** Seed them using the commands in Part 3, or run `flint-init.sh`
- **Wrong database name:** Make sure your URI ends with `/flint?...`

### Can't connect to MongoDB
- **IP whitelist:** Go to Atlas > Network Access and make sure your IP is allowed
- **Password:** Make sure you replaced `<password>` in the URI with your actual password
- **Special characters in password:** If your password has `@`, `#`, `%`, etc., URL-encode them

### AI chat doesn't work
- **No API key:** Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to `.env.local`
- **Invalid key:** Check that the key is correct and hasn't expired
- **Restart the dashboard** after adding keys: Ctrl+C, then `pnpm dev` again

### iOS app can't connect
- **Dashboard not running:** The iOS app needs the API to be running
- **Wrong URL:** Check the base URL in `APIClient.swift`
- **Simulator network:** iOS Simulator should be able to reach `localhost` automatically

---

## Features Reference

| Feature | What It Does | Dashboard Page |
|---|---|---|
| **Todos** | Task management with sections, push tracking, recurring tasks | `/todo` |
| **People** | Directory of people + daily interaction logs | `/people` |
| **Teams** | Team structure and notes | `/teams` |
| **Daily Summaries** | Auto-generated end-of-day recaps | `/daily-summaries` |
| **Weekly Summaries** | Friday weekly rollups | `/weekly-summaries` |
| **Mental Health** | Mood and sleep tracking with charts | `/mental-health` |
| **Metrics** | Daily/weekly metric visualizations | `/metrics` |
| **Engineer Scores** | 11-dimension daily scoring for engineers you manage | `/engineer-scores` |
| **Manager Feedback** | Daily leadership self-assessment | `/manager-feedback` |
| **Milestones** | Project milestone tracking | `/milestones` |
| **Calendar** | Calendar view of meetings and events | `/calendar` |
| **Search** | Full-text search across all data | `/search` |
| **AI Chat** | Multi-provider chat (Claude, GPT, etc.) | `/chat` |
| **AI Memory** | Shared memory across AI sessions | `/ai-memory` |
| **AI Costs** | API usage and cost tracking | `/ai-costs` |
| **Wishlist** | Personal wishlist | `/wishlist` |
| **TV Mode** | Full-screen ambient dashboard for a monitor | `/tv` |

---

## Architecture

```
You (browser)  ──→  Web Dashboard (Next.js, localhost:5555)
You (iPhone)   ──→  iOS App (Swift)
                          │
                     API Routes (/api/*)
                          │
                     MongoDB Atlas
                    (database: flint)
                          │
Claude Code  ──→  mongo-cli.mjs  ──→  MongoDB
```

Everything flows through MongoDB. The dashboard reads from it, Claude Code writes to it, and the iOS app accesses it through the dashboard's API routes.
