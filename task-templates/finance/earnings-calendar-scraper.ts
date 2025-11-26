/**
 * Template: Earnings Calendar Scraper
 * Category: Finance
 * Use Case: Extract upcoming earnings dates and estimates
 * Target Site: finance.yahoo.com, nasdaq.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const EarningsEventSchema = z.object({
  events: z.array(
    z.object({
      symbol: z.string(),
      companyName: z.string(),
      reportDate: z.string(),
      reportTime: z.string(), // "Before Market", "After Market", etc.
      epsEstimate: z.string().nullable(),
      revenueEstimate: z.string().nullable(),
      marketCap: z.string().nullable(),
    })
  ),
});

const EarningsDetailsSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  nextEarningsDate: z.string(),
  epsEstimate: z.string().nullable(),
  epsActual: z.string().nullable(),
  epsSurprise: z.string().nullable(),
  revenueEstimate: z.string().nullable(),
  revenueActual: z.string().nullable(),
  revenueSurprise: z.string().nullable(),
  analystCount: z.string().nullable(),
  history: z.array(
    z.object({
      quarter: z.string(),
      reportDate: z.string(),
      epsEstimate: z.string(),
      epsActual: z.string(),
      surprise: z.string(),
    })
  ),
});

interface EarningsCalendar {
  date: string;
  events: z.infer<typeof EarningsEventSchema>["events"];
  highlights: {
    beforeMarket: number;
    afterMarket: number;
    notSpecified: number;
    totalCompanies: number;
  };
}

async function getEarningsCalendar(date?: string): Promise<EarningsCalendar> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const targetDate = date || new Date().toISOString().split("T")[0];
  console.log(`📅 Getting earnings calendar for: ${targetDate}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://finance.yahoo.com/calendar/earnings?day=${targetDate}`);
    await page.waitForTimeout(3000);

    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    // Scroll to load more
    await page.aiAction("scroll down to load more earnings events");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract earnings events with stock symbol, company name, report date, report time (before/after market), EPS estimate, revenue estimate, and market cap",
      EarningsEventSchema
    );

    // Calculate highlights
    const events = result.events;
    const beforeMarket = events.filter((e) =>
      e.reportTime.toLowerCase().includes("before") || e.reportTime.toLowerCase().includes("bmo")
    ).length;
    const afterMarket = events.filter((e) =>
      e.reportTime.toLowerCase().includes("after") || e.reportTime.toLowerCase().includes("amc")
    ).length;

    const highlights = {
      beforeMarket,
      afterMarket,
      notSpecified: events.length - beforeMarket - afterMarket,
      totalCompanies: events.length,
    };

    // Display results
    console.log("=".repeat(70));
    console.log(`EARNINGS CALENDAR - ${targetDate}`);
    console.log("=".repeat(70));

    console.log(`\n📊 SUMMARY`);
    console.log(`   Total Reports: ${highlights.totalCompanies}`);
    console.log(`   Before Market: ${highlights.beforeMarket}`);
    console.log(`   After Market: ${highlights.afterMarket}`);
    console.log(`   Time TBD: ${highlights.notSpecified}`);

    // Before market
    const bmo = events.filter((e) =>
      e.reportTime.toLowerCase().includes("before") || e.reportTime.toLowerCase().includes("bmo")
    );
    if (bmo.length > 0) {
      console.log(`\n🌅 BEFORE MARKET OPEN`);
      bmo.slice(0, 10).forEach((event) => {
        const eps = event.epsEstimate ? `EPS Est: ${event.epsEstimate}` : "";
        const rev = event.revenueEstimate ? `Rev Est: ${event.revenueEstimate}` : "";
        console.log(`   ${event.symbol.padEnd(6)} ${event.companyName.substring(0, 30).padEnd(30)} | ${eps} ${rev}`);
      });
    }

    // After market
    const amc = events.filter((e) =>
      e.reportTime.toLowerCase().includes("after") || e.reportTime.toLowerCase().includes("amc")
    );
    if (amc.length > 0) {
      console.log(`\n🌙 AFTER MARKET CLOSE`);
      amc.slice(0, 10).forEach((event) => {
        const eps = event.epsEstimate ? `EPS Est: ${event.epsEstimate}` : "";
        const rev = event.revenueEstimate ? `Rev Est: ${event.revenueEstimate}` : "";
        console.log(`   ${event.symbol.padEnd(6)} ${event.companyName.substring(0, 30).padEnd(30)} | ${eps} ${rev}`);
      });
    }

    return { date: targetDate, events, highlights };
  } finally {
    await agent.closeAgent();
  }
}

async function getEarningsDetails(symbol: string): Promise<z.infer<typeof EarningsDetailsSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📊 Getting earnings details for: ${symbol.toUpperCase()}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://finance.yahoo.com/quote/${symbol.toUpperCase()}/analysis`);
    await page.waitForTimeout(3000);

    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    // Navigate to earnings tab if needed
    await page.aiAction("click on earnings tab or scroll to earnings section");
    await page.waitForTimeout(1500);

    const details = await page.extract(
      "Extract earnings information: symbol, company name, next earnings date, EPS estimate, EPS actual (if reported), EPS surprise, revenue estimate, revenue actual, revenue surprise, number of analysts, and earnings history (last 4 quarters with date, estimate, actual, and surprise)",
      EarningsDetailsSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`EARNINGS DETAILS - ${details.companyName} (${details.symbol})`);
    console.log("=".repeat(60));

    console.log(`\n📅 UPCOMING EARNINGS`);
    console.log(`   Next Report: ${details.nextEarningsDate}`);
    console.log(`   Analysts: ${details.analystCount || "N/A"}`);

    console.log(`\n💰 ESTIMATES`);
    console.log(`   EPS Estimate: ${details.epsEstimate || "N/A"}`);
    console.log(`   Revenue Estimate: ${details.revenueEstimate || "N/A"}`);

    if (details.epsActual) {
      console.log(`\n📈 LATEST RESULTS`);
      console.log(`   EPS Actual: ${details.epsActual}`);
      console.log(`   EPS Surprise: ${details.epsSurprise || "N/A"}`);
      console.log(`   Revenue Actual: ${details.revenueActual || "N/A"}`);
      console.log(`   Revenue Surprise: ${details.revenueSurprise || "N/A"}`);
    }

    if (details.history.length > 0) {
      console.log(`\n📊 EARNINGS HISTORY`);
      console.log("   Quarter     | Date       | Est      | Actual   | Surprise");
      console.log("   " + "-".repeat(55));
      details.history.forEach((q) => {
        const quarter = q.quarter.padEnd(11);
        const date = q.reportDate.padEnd(10);
        const est = q.epsEstimate.padEnd(8);
        const actual = q.epsActual.padEnd(8);
        console.log(`   ${quarter} | ${date} | ${est} | ${actual} | ${q.surprise}`);
      });

      // Calculate beat/miss ratio
      const beats = details.history.filter((q) => !q.surprise.includes("-")).length;
      console.log(`\n   📈 Beat Rate: ${beats}/${details.history.length} quarters`);
    }

    return details;
  } finally {
    await agent.closeAgent();
  }
}

async function getWeeklyEarnings(): Promise<Map<string, EarningsCalendar>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const weeklyData = new Map<string, EarningsCalendar>();
  const today = new Date();

  console.log(`📅 Getting earnings for the week...\n`);

  try {
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      console.log(`  📆 Fetching ${dayName} (${dateStr})...`);

      const page = await agent.newPage();
      await page.goto(`https://finance.yahoo.com/calendar/earnings?day=${dateStr}`);
      await page.waitForTimeout(2500);

      try {
        const result = await page.extract(
          "Extract earnings events with symbol, company name, report time, and EPS estimate",
          z.object({
            events: z.array(
              z.object({
                symbol: z.string(),
                companyName: z.string(),
                reportTime: z.string(),
                epsEstimate: z.string().nullable(),
              })
            ),
          })
        );

        weeklyData.set(dateStr, {
          date: dateStr,
          events: result.events as any,
          highlights: {
            beforeMarket: 0,
            afterMarket: 0,
            notSpecified: 0,
            totalCompanies: result.events.length,
          },
        });

        console.log(`     Found ${result.events.length} earnings reports`);
      } catch (e) {
        console.log(`     No data available`);
      }
    }

    // Display weekly summary
    console.log("\n" + "=".repeat(60));
    console.log("WEEKLY EARNINGS SUMMARY");
    console.log("=".repeat(60));

    weeklyData.forEach((data, date) => {
      const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
      console.log(`\n📆 ${dayName} (${date}): ${data.events.length} reports`);

      const topStocks = data.events.slice(0, 5);
      topStocks.forEach((event) => {
        console.log(`   • ${event.symbol} - ${event.companyName.substring(0, 25)}...`);
      });
    });

    return weeklyData;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Get earnings calendar for today
getEarningsCalendar();

// Example: Get earnings for specific date
// getEarningsCalendar("2024-01-15");

// Example: Get detailed earnings info for a stock
// getEarningsDetails("AAPL");

// Example: Get weekly earnings calendar
// getWeeklyEarnings();



