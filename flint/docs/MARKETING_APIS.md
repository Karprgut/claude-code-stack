# Marketing APIs — Meta, Google Ads, TikTok

How to get tokens for each ad platform, where to store them, and how to troubleshoot.

Flint replaces CSV scraping with native API calls. The cron at `/api/cron/meta-sync` (and platform equivalents) pulls campaigns, insights, and spend every few hours and writes to `campaign_snapshots` in MongoDB.

---

## Environment variables

All credentials live in AWS SSM Parameter Store under `/flint/*` and are injected into the EC2 container at runtime via `/data/.env`. For local dev, put them in `dashboard/.env.local`.

```env
# Meta — one token per client (separate Business Managers)
META_TOKEN_KAB=EAAxxxxxxxxxxxxxxx
META_TOKEN_RTH=EAAxxxxxxxxxxxxxxx
META_TOKEN_TBP=EAAxxxxxxxxxxxxxxx

# Google Ads — shared across all managed accounts
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxx
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890  # MCC customer ID, no dashes
GOOGLE_ADS_CUSTOMER_IDS_KAB=1112223333
GOOGLE_ADS_CUSTOMER_IDS_RTH=4445556666
GOOGLE_ADS_CUSTOMER_IDS_TBP=7778889999

# TikTok — one app, one token per advertiser
TIKTOK_APP_ID=xxxx
TIKTOK_APP_SECRET=xxxx
TIKTOK_ACCESS_TOKEN_KAB=xxxx
TIKTOK_ADVERTISER_ID_KAB=xxxx
# ... etc

# Cron auth
CRON_SECRET=<random-string>
ALERT_BUDGET_PCT=80  # optional, default 80
```

---

## Meta (Marketing API v21.0)

**Status:** Production-ready. KAB / RTH / TBP integrated.

### Getting a token

Meta tokens are **per Business Manager** — you need one token for each client whose BM you're a member of.

1. Log in to https://business.facebook.com with the account that has access to the client's BM
2. Go to https://developers.facebook.com/tools/explorer/
3. Top right → **App** dropdown → pick or create an app (any name is fine)
4. **User or Page** dropdown → select **Get User Access Token**
5. **Permissions** → add `ads_read`, `ads_management`, `business_management`
6. Click **Generate Access Token** → confirm via 2FA
7. The token you get is **short-lived (1 hour)**. To extend:
   - Click the ℹ️ icon next to the token → **Open in Access Token Tool**
   - Click **Extend Access Token** → now valid for ~60 days
8. Save it to SSM:
   ```bash
   aws ssm put-parameter --name "/flint/META_TOKEN_KAB" --value "EAAxxx..." \
     --type "SecureString" --overwrite --region us-east-1
   ```

### Rotating tokens

Meta tokens expire every ~60 days. The cron job will start returning `Error validating access token` when that happens. Regenerate via the Access Token Tool and update SSM.

### Testing manually

```bash
curl "https://graph.facebook.com/v21.0/me/adaccounts?access_token=$META_TOKEN_RTH&fields=id,name"
```

If this returns a list of ad accounts, the token works. If not, check the Graph API Explorer error message.

### Code

- `dashboard/lib/meta-api.ts` — API client, CLIENTS config, `syncAllMeta()`
- `dashboard/app/api/cron/meta-sync/route.ts` — cron endpoint, merges with previous snapshot

---

## Google Ads (API v17)

**Status:** In progress. Developer Token obtained (Test mode). OAuth2 + refresh token pending.

### Step 1 — Developer Token

1. Sign in to https://ads.google.com with an account that has **Admin role on a Manager Account (MCC)**. A regular ad account won't work — the API Center is only available from a manager account.
2. If you don't have an MCC: create one at https://ads.google.com/home/tools/manager-accounts/ and link your regular ad accounts to it.
3. Once in the MCC: Tools → **API Center** → Apply
4. You'll receive a Developer Token in **Test mode** immediately (works against test accounts only)
5. To hit production accounts: click **Apply for Basic Access** in the same page. Approval takes 1–2 business days.

### Step 2 — OAuth2 credentials

1. Go to https://console.cloud.google.com/
2. Create (or select) a project
3. **APIs & Services** → **Library** → search **"Google Ads API"** → Enable
4. **APIs & Services** → **OAuth consent screen**:
   - User Type: External
   - App name: Flint
   - User support email: your email
   - Scopes: skip (we'll pass them in the flow)
   - Test users: add your Google account
5. **APIs & Services** → **Credentials** → Create Credentials → **OAuth client ID**:
   - Application type: **Desktop app**
   - Name: Flint CLI
6. Copy the **Client ID** and **Client Secret**

### Step 3 — Refresh token

Run the OAuth flow once from your laptop — the resulting refresh token is long-lived.

```bash
cd dashboard
node scripts/google-ads-auth.mjs
# Opens a browser, logs in, prints refresh_token
```

(The script doesn't exist yet — we'll add it when the Developer Token is approved for Basic Access.)

### Step 4 — Customer IDs

For each client account, find the 10-digit Customer ID shown at the top of the Google Ads UI (e.g., `123-456-7890` → store as `1234567890`, no dashes).

The MCC also has a Customer ID — that's `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.

### Testing manually

Once all four values are set, test with:

```bash
cd dashboard
node scripts/google-ads-test.mjs --customer-id 1234567890
```

---

## TikTok (Marketing API v1.3)

**Status:** Blocked. App registration stuck in "Pending Review".

### Why it's blocked

TikTok requires app review before issuing an App ID / Secret, and the review process isn't deterministic — apps have been pending for weeks. For internal/personal use, TikTok offers a **Sandbox Mode** that doesn't require review but is limited to sandbox advertiser accounts.

### What to do in the meantime

Keep using the CSV workflow at `ops/campaigns/` until the app is approved. When it's approved:

1. From https://business-api.tiktok.com/portal/ → your app → copy App ID + App Secret
2. Generate a long-lived access token per advertiser via the OAuth flow (TikTok has a dedicated page per advertiser)
3. Store `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN_<CLIENT>`, `TIKTOK_ADVERTISER_ID_<CLIENT>` in SSM
4. Implement `dashboard/lib/tiktok-api.ts` using the pattern from `meta-api.ts`

---

## The cron jobs

Each platform has its own cron endpoint. All are secret-gated via the `x-cron-secret` header.

| Endpoint | Schedule | Writes to |
|---|---|---|
| `/api/cron/meta-sync` | Every 3h (0 */3 * * *) | `campaign_snapshots` (merges with previous) |
| `/api/cron/google-sync` | Every 3h (TBD) | `campaign_snapshots` |
| `/api/cron/tiktok-sync` | Every 3h (TBD) | `campaign_snapshots` |
| `/api/cron/calendar-sync` | Every 30m | `calendar_events` |

Cron files live on EC2 under `/etc/cron.d/flint-*`. Logs go to `/var/log/cron` and Docker's `flint` container logs.

### Manual trigger

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://<tu-dominio-de-flint>/api/cron/meta-sync
```

---

## Snapshot merging

Because the three platforms sync independently, the cron jobs don't overwrite each other's data. Each job reads the most recent snapshot, replaces its own platform block, and writes a new snapshot.

Example after a Meta sync:

```json
{
  "_id": "snap_2026-04-17T18-47-42",
  "generatedAt": "2026-04-17T18:47:42.000Z",
  "platforms": {
    "meta":      { "scrapedAt": "...", "accounts": [...], "source": "graph-api" },
    "tiktok":    { "scrapedAt": "...", "accounts": [...], "source": "csv" },
    "google-ads":{ "scrapedAt": "...", "accounts": [...], "source": "csv" }
  },
  "alerts": [...]
}
```

The dashboard's `/campaigns` page reads the latest snapshot and renders whatever's there — if TikTok hasn't synced, its block just shows the last successful run.

---

## Alert thresholds

In `dashboard/app/api/cron/meta-sync/route.ts` (and peers):

- **`medium`** severity at ≥ `ALERT_BUDGET_PCT`% of monthly budget (default 80%)
- **`high`** severity at 100%+ of monthly budget

Alerts are computed on every sync and stored in the snapshot. Budget numbers come from each account's `monthlyBudget` field — configure those in the `adClients` collection.

---

## Troubleshooting

### Meta — "Invalid OAuth access token"
Token expired. Regenerate via Graph API Explorer, extend to 60d, update SSM, redeploy (or `docker stop flint && docker rm flint && docker run ...` to re-read `.env`).

### Meta — "Unsupported get request"
You're hitting an ad account you don't have permission for. Verify the token's user is still a member of the Business Manager.

### Google Ads — "AuthenticationError.CUSTOMER_NOT_FOUND"
The `login-customer-id` header doesn't match an MCC that can see the target Customer ID. Confirm the MCC has the client account linked.

### Container not picking up new env var
`docker restart` doesn't re-read the env file. Do a full cycle:

```bash
docker stop flint && docker rm flint && \
docker run -d --name flint --env-file /data/.env -p 3000:3000 $ECR_URI:latest
```
