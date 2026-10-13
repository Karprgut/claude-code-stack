#!/usr/bin/env node
/**
 * Google Ads API — one-time OAuth2 flow to obtain a refresh_token.
 *
 * Usage:
 *   cd dashboard && node scripts/google-ads-auth.mjs
 *
 * Reads GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET from env or SSM.
 * Opens the browser, listens on localhost for the OAuth redirect, exchanges
 * the code for a refresh_token, and stores it in SSM at
 * /flint/GOOGLE_ADS_REFRESH_TOKEN.
 */

import http from "http";
import { URL } from "url";
import { exec } from "child_process";
import { execSync } from "child_process";
import crypto from "crypto";

const SCOPE = "https://www.googleapis.com/auth/adwords";

function getSsm(name) {
  try {
    return execSync(
      `aws ssm get-parameter --name "${name}" --with-decryption --region us-east-1 --query "Parameter.Value" --output text`
    ).toString().trim();
  } catch {
    return null;
  }
}

function putSsm(name, value) {
  execSync(
    `aws ssm put-parameter --name "${name}" --value "${value}" --type "SecureString" --overwrite --region us-east-1 --output text`
  );
}

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || getSsm("/flint/GOOGLE_ADS_CLIENT_ID");
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || getSsm("/flint/GOOGLE_ADS_CLIENT_SECRET");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET (env or SSM).");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
let redirectUri;
let server;

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  if (url.pathname !== "/") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" }).end(`<h1>Error</h1><p>${error}</p>`);
    console.error("OAuth error:", error);
    process.exit(1);
  }
  if (!code || returnedState !== state) {
    res.writeHead(400, { "Content-Type": "text/html" }).end("<h1>Invalid request</h1>");
    return;
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      res.writeHead(500, { "Content-Type": "text/html" }).end(
        "<h1>No refresh_token returned</h1><p>Revoke access at https://myaccount.google.com/permissions and retry.</p>"
      );
      console.error("\nNo refresh_token returned. Google only returns it on first authorization.");
      console.error("Fix: visit https://myaccount.google.com/permissions → find 'Flint' → Remove access → rerun this script.");
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html" }).end(
      "<h1>Done</h1><p>Refresh token obtained. You can close this tab.</p>"
    );

    console.log("\n✅ Refresh token obtained.");
    console.log("Storing in SSM at /flint/GOOGLE_ADS_REFRESH_TOKEN...");
    putSsm("/flint/GOOGLE_ADS_REFRESH_TOKEN", tokens.refresh_token);
    console.log("✅ Stored.");
    console.log("\nAccess token (1h lifetime):", tokens.access_token.slice(0, 40) + "...");
    console.log("Refresh token (permanent):  ", tokens.refresh_token.slice(0, 40) + "...");

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" }).end(`<h1>Error</h1><pre>${err.message}</pre>`);
    console.error(err);
    process.exit(1);
  }
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;
  redirectUri = `http://localhost:${port}`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  console.log("\nOpening browser for Google authorization...");
  console.log("If it doesn't open automatically, visit:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for you to authorize and be redirected...");
  openBrowser(authUrl.toString());
});
