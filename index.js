#!/usr/bin/env node
"use strict";
require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

function printHelp() {
  const help = [
    "Usage:",
    "  twi \"your tweet text\"",
    "  echo \"your tweet text\" | twi",
    "",
    "Environment variables required:",
    "  TWITTER_API_KEY          Your app API key",
    "  TWITTER_API_KEY_SECRET   Your app API key secret",
    "  TWITTER_BEARER_TOKEN     Your app bearer token (optional for tweeting)",
    "  TWITTER_ACCESS_TOKEN     Your user access token",
    "  TWITTER_TOKEN_SECRET     Your user access token secret",
    "",
    "Also supported via .env file in the project directory.",
    "",
    "Examples:",
    "  twi \"hello from the CLI 👋\"",
    "  twi --help",
  ].join("\n");
  process.stdout.write(help + "\n");
}

async function readStdinIfPiped() {
  if (process.stdin.isTTY) return "";
  return await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const fromArgs = args.join(" ").trim();
  const fromStdin = await readStdinIfPiped();
  const text = (fromArgs || fromStdin || "").trim();

  if (!text) {
    process.stderr.write("Error: No tweet text provided.\n\n");
    printHelp();
    process.exit(1);
  }

  let client;
  try {
    const appKey = getEnv("TWITTER_API_KEY");
    const appSecret = getEnv("TWITTER_API_KEY_SECRET");
    const accessToken = getEnv("TWITTER_ACCESS_TOKEN");
    const accessSecret = getEnv("TWITTER_TOKEN_SECRET");

    client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
      // bearerToken can be supplied too if needed by other commands
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
    });
  } catch (err) {
    process.stderr.write(err.message + "\n");
    process.exit(1);
  }

  try {
    // This is the correct v2 endpoint call
    const { data } = await client.v2.tweet(text);
    process.stdout.write(`Tweet posted: https://x.com/i/web/status/${data.id}\n`);
  } catch (err) {
    // Log the detailed error message from Twitter
    const errorData = err?.data;
    let errorMsg = `Failed to post tweet.`;

    if (errorData) {
      errorMsg += `\nStatus: ${errorData.status}`;
      errorMsg += `\nTitle: ${errorData.title}`;
      errorMsg += `\nDetail: ${errorData.detail}`;
      if (errorData.errors) {
        errorMsg += `\nErrors: ${JSON.stringify(errorData.errors, null, 2)}`;
      }
    } else {
      errorMsg += `\nError: ${err?.message || String(err)}`;
    }

    process.stderr.write(errorMsg + "\n");
    process.exit(1);
  }
}

main();
