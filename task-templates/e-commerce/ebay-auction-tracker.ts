/**
 * Template: eBay Auction Tracker
 * Category: E-Commerce
 * Use Case: Track auction items, current bids, and time remaining
 * Target Site: ebay.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import * as fs from "fs";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const AuctionSchema = z.object({
  auctions: z.array(
    z.object({
      title: z.string(),
      currentBid: z.string(),
      buyItNowPrice: z.string().nullable(),
      bidCount: z.string(),
      timeRemaining: z.string(),
      seller: z.string(),
      sellerRating: z.string().nullable(),
      condition: z.string().nullable(),
      shipping: z.string().nullable(),
      watchers: z.string().nullable(),
      url: z.string(),
    })
  ),
});

const AuctionDetailSchema = z.object({
  title: z.string(),
  currentBid: z.string(),
  buyItNowPrice: z.string().nullable(),
  bidCount: z.string(),
  timeRemaining: z.string(),
  startingBid: z.string().nullable(),
  bidHistory: z.array(
    z.object({
      bidder: z.string(),
      amount: z.string(),
      time: z.string(),
    })
  ),
  seller: z.string(),
  sellerRating: z.string(),
  condition: z.string(),
  description: z.string(),
  shipping: z.string(),
  location: z.string().nullable(),
  returns: z.string().nullable(),
});

interface TrackedAuction {
  id: string;
  url: string;
  title: string;
  maxBid: number;
  notifications: boolean;
  history: Array<{
    bid: number;
    bidCount: number;
    timestamp: string;
  }>;
}

interface AuctionAlert {
  type: "ending_soon" | "outbid" | "price_drop" | "new_bid";
  auction: string;
  message: string;
  url: string;
}

const DATA_FILE = "./auction-tracker-data.json";

function loadTrackedAuctions(): TrackedAuction[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return [];
}

function saveTrackedAuctions(auctions: TrackedAuction[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(auctions, null, 2));
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

function parseTimeRemaining(timeStr: string): number {
  // Returns minutes remaining
  const daysMatch = timeStr.match(/(\d+)\s*d/i);
  const hoursMatch = timeStr.match(/(\d+)\s*h/i);
  const minsMatch = timeStr.match(/(\d+)\s*m/i);

  let minutes = 0;
  if (daysMatch) minutes += parseInt(daysMatch[1]) * 24 * 60;
  if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
  if (minsMatch) minutes += parseInt(minsMatch[1]);

  return minutes;
}

async function searchAuctions(
  query: string,
  options: { minPrice?: number; maxPrice?: number; endingSoon?: boolean } = {}
): Promise<z.infer<typeof AuctionSchema>["auctions"]> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    // uncomment to run with hyperbrowser provider
    // browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  console.log(`🔨 Searching eBay auctions for: "${query}"\n`);

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // // sessionId = getSessionId(agent);

    // Build URL with filters
    let url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
      query
    )}&LH_Auction=1`;
    if (options.minPrice) url += `&_udlo=${options.minPrice}`;
    if (options.maxPrice) url += `&_udhi=${options.maxPrice}`;
    if (options.endingSoon) url += `&_sop=1`; // Sort by ending soonest

    await page.goto(url);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract auction listings with title, current bid, buy it now price if available, bid count, time remaining, seller name, seller rating, item condition, shipping cost, watcher count, and listing URL",
      AuctionSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log("AUCTION SEARCH RESULTS");
    console.log("=".repeat(60));

    result.auctions.slice(0, 10).forEach((auction, i) => {
      const bids = parseInt(auction.bidCount) || 0;
      const timeLeft = parseTimeRemaining(auction.timeRemaining);
      const urgencyIcon = timeLeft < 60 ? "🔥" : timeLeft < 360 ? "⏰" : "📅";

      console.log(`\n${i + 1}. ${auction.title.substring(0, 60)}...`);
      console.log(
        `   💰 Current: ${auction.currentBid} (${auction.bidCount} bids)`
      );
      if (auction.buyItNowPrice) {
        console.log(`   🛒 Buy It Now: ${auction.buyItNowPrice}`);
      }
      console.log(`   ${urgencyIcon} Time Left: ${auction.timeRemaining}`);
      console.log(
        `   👤 Seller: ${auction.seller} (${auction.sellerRating || "N/A"})`
      );
      console.log(`   📦 Shipping: ${auction.shipping || "See listing"}`);
      if (auction.watchers) {
        console.log(`   👀 Watchers: ${auction.watchers}`);
      }
    });

    return result.auctions;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // if (sessionId) {
    // uncomment to download the video recording if you run with hyperbrowser
    // await waitForVideoAndDownload(
    //   sessionId,
    //   "e-commerce",
    //   "ebay-auction-search"
    // );
    // }
  }
}

async function getAuctionDetails(
  auctionUrl: string
): Promise<z.infer<typeof AuctionDetailSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    // uncomment to run with hyperbrowser provider
    //  browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  console.log(`📋 Getting auction details...\n`);

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // // sessionId = getSessionId(agent);

    await page.goto(auctionUrl);
    await page.waitForTimeout(3000);

    // Try to view bid history
    await page.aiAction(
      "click on bid history or number of bids link if available"
    );
    await page.waitForTimeout(2000);

    const details = await page.extract(
      "Extract auction title, current bid, buy it now price, bid count, time remaining, starting bid, bid history (bidder, amount, time), seller name, seller rating, condition, description, shipping cost, item location, and return policy",
      AuctionDetailSchema
    );

    // Display details
    console.log("=".repeat(60));
    console.log("AUCTION DETAILS");
    console.log("=".repeat(60));

    console.log(`\n📦 ${details.title}`);
    console.log(`\n💰 PRICING`);
    console.log(`   Current Bid: ${details.currentBid}`);
    if (details.startingBid)
      console.log(`   Starting Bid: ${details.startingBid}`);
    if (details.buyItNowPrice)
      console.log(`   Buy It Now: ${details.buyItNowPrice}`);
    console.log(`   Bids: ${details.bidCount}`);
    console.log(`   Time Left: ${details.timeRemaining}`);

    console.log(`\n👤 SELLER`);
    console.log(`   Name: ${details.seller}`);
    console.log(`   Rating: ${details.sellerRating}`);

    console.log(`\n📋 ITEM INFO`);
    console.log(`   Condition: ${details.condition}`);
    console.log(`   Shipping: ${details.shipping}`);
    if (details.location) console.log(`   Location: ${details.location}`);
    if (details.returns) console.log(`   Returns: ${details.returns}`);

    console.log(`\n📝 DESCRIPTION`);
    console.log(`   ${details.description.substring(0, 200)}...`);

    if (details.bidHistory.length > 0) {
      console.log(`\n📊 BID HISTORY (${details.bidHistory.length} bids)`);
      details.bidHistory.slice(0, 5).forEach((bid, i) => {
        console.log(`   ${i + 1}. ${bid.bidder}: ${bid.amount} (${bid.time})`);
      });
    }

    return details;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // if (sessionId) {
    // uncomment to download the video recording if you run with hyperbrowser
    // await waitForVideoAndDownload(
    //   sessionId,
    //   "e-commerce",
    //   "ebay-auction-details"
    // );
    // }
  }
}

async function checkTrackedAuctions(): Promise<AuctionAlert[]> {
  const auctions = loadTrackedAuctions();
  if (auctions.length === 0) {
    console.log("No auctions being tracked.");
    return [];
  }

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    // uncomment to run with hyperbrowser provider
    // browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  const alerts: AuctionAlert[] = [];
  // let sessionId: string | null = null;

  console.log(`📋 Checking ${auctions.length} tracked auctions...\n`);

  try {
    for (const auction of auctions) {
      console.log(`  Checking: ${auction.title.substring(0, 40)}...`);

      const page = await agent.newPage();

      // Get session ID after first page is initialized
      // if (!sessionId) {
      // sessionId = getSessionId(agent);
      // }

      await page.goto(auction.url);
      await page.waitForTimeout(2000);

      const CurrentBidSchema = z.object({
        currentBid: z.string(),
        bidCount: z.string(),
        timeRemaining: z.string(),
        isEnded: z.boolean(),
      });

      const status = await page.extract(
        "Extract current bid amount, bid count, time remaining, and whether auction has ended",
        CurrentBidSchema
      );

      const currentBid = parsePrice(status.currentBid);
      const previousBid =
        auction.history.length > 0
          ? auction.history[auction.history.length - 1].bid
          : 0;

      // Track history
      auction.history.push({
        bid: currentBid,
        bidCount: parseInt(status.bidCount) || 0,
        timestamp: new Date().toISOString(),
      });

      // Check for alerts
      const timeLeft = parseTimeRemaining(status.timeRemaining);

      if (timeLeft < 60 && timeLeft > 0) {
        alerts.push({
          type: "ending_soon",
          auction: auction.title,
          message: `Ending in ${status.timeRemaining}! Current bid: ${status.currentBid}`,
          url: auction.url,
        });
      }

      if (currentBid > auction.maxBid && previousBid <= auction.maxBid) {
        alerts.push({
          type: "outbid",
          auction: auction.title,
          message: `Price exceeded your max bid of $${auction.maxBid}. Current: ${status.currentBid}`,
          url: auction.url,
        });
      }

      if (currentBid > previousBid && previousBid > 0) {
        alerts.push({
          type: "new_bid",
          auction: auction.title,
          message: `New bid! Was $${previousBid.toFixed(2)}, now ${
            status.currentBid
          }`,
          url: auction.url,
        });
      }

      console.log(
        `     Current: ${status.currentBid} | Time: ${status.timeRemaining}`
      );
    }

    // Save updated tracking data
    saveTrackedAuctions(auctions);

    // Display alerts
    if (alerts.length > 0) {
      console.log("\n" + "🚨".repeat(20));
      console.log("\nALERTS:");
      alerts.forEach((alert) => {
        const icon =
          alert.type === "ending_soon"
            ? "⏰"
            : alert.type === "outbid"
            ? "💸"
            : "🔔";
        console.log(`\n${icon} ${alert.type.toUpperCase()}: ${alert.auction}`);
        console.log(`   ${alert.message}`);
      });
    }

    return alerts;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // if (sessionId) {
    // uncomment to download the video recording if you run with hyperbrowser
    // await waitForVideoAndDownload(
    //   sessionId,
    //   "e-commerce",
    //   "ebay-auction-check"
    // );
    //  }
  }
}

// Example: Search for auctions
searchAuctions("vintage rolex watch", {
  minPrice: 500,
  maxPrice: 5000,
  endingSoon: true,
});

// Example: Get details for specific auction
// getAuctionDetails("https://www.ebay.com/itm/1234567890");

// Example: Check tracked auctions
// checkTrackedAuctions();
