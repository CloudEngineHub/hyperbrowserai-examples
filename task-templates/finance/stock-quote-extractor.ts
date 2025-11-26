/**
 * Template: Stock Quote Extractor
 * Category: Finance
 * Use Case: Extract real-time stock quotes from Yahoo Finance
 * Target Site: finance.yahoo.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const StockQuoteSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  price: z.string(),
  change: z.string(),
  changePercent: z.string(),
  previousClose: z.string(),
  open: z.string(),
  dayRange: z.string(),
  fiftyTwoWeekRange: z.string(),
  volume: z.string(),
  avgVolume: z.string(),
  marketCap: z.string(),
  peRatio: z.string().nullable(),
  eps: z.string().nullable(),
  dividend: z.string().nullable(),
});

const StockDetailsSchema = z.object({
  summary: z.string(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  employees: z.string().nullable(),
  headquarters: z.string().nullable(),
  analystRating: z.string().nullable(),
  priceTarget: z.string().nullable(),
  recentNews: z.array(
    z.object({
      headline: z.string(),
      source: z.string(),
      time: z.string(),
    })
  ),
});

const MarketOverviewSchema = z.object({
  indices: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      change: z.string(),
      changePercent: z.string(),
    })
  ),
  trending: z.array(
    z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.string(),
      change: z.string(),
    })
  ),
});

interface StockData {
  quote: z.infer<typeof StockQuoteSchema>;
  details?: z.infer<typeof StockDetailsSchema>;
}

function formatChange(change: string, percent: string): string {
  const isPositive = !change.includes("-");
  const arrow = isPositive ? "📈" : "📉";
  const color = isPositive ? "+" : "";
  return `${arrow} ${color}${change} (${percent})`;
}

async function getStockQuote(symbol: string, includeDetails: boolean = false): Promise<StockData> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📊 Getting stock quote for: ${symbol.toUpperCase()}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://finance.yahoo.com/quote/${symbol.toUpperCase()}`);
    await page.waitForTimeout(3000);

    // Handle cookie consent
    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    // Extract quote
    console.log("  💹 Extracting quote data...");
    const quote = await page.extract(
      "Extract stock quote: symbol, company name, current price, change, change percent, previous close, open, day range, 52-week range, volume, average volume, market cap, P/E ratio, EPS, and dividend yield",
      StockQuoteSchema
    );

    let details: z.infer<typeof StockDetailsSchema> | undefined;

    if (includeDetails) {
      console.log("  📰 Extracting details and news...");
      await page.aiAction("scroll down to see more information");
      await page.waitForTimeout(1500);

      details = await page.extract(
        "Extract company summary/description, sector, industry, number of employees, headquarters location, analyst rating consensus, price target, and recent news headlines with source and time",
        StockDetailsSchema
      );
    }

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log(`${quote.companyName} (${quote.symbol})`);
    console.log("=".repeat(60));

    console.log(`\n💰 CURRENT PRICE: ${quote.price}`);
    console.log(`   ${formatChange(quote.change, quote.changePercent)}`);

    console.log(`\n📊 TRADING DATA`);
    console.log(`   Previous Close: ${quote.previousClose}`);
    console.log(`   Open: ${quote.open}`);
    console.log(`   Day Range: ${quote.dayRange}`);
    console.log(`   52-Week Range: ${quote.fiftyTwoWeekRange}`);
    console.log(`   Volume: ${quote.volume}`);
    console.log(`   Avg Volume: ${quote.avgVolume}`);

    console.log(`\n📈 VALUATION`);
    console.log(`   Market Cap: ${quote.marketCap}`);
    console.log(`   P/E Ratio: ${quote.peRatio || "N/A"}`);
    console.log(`   EPS: ${quote.eps || "N/A"}`);
    console.log(`   Dividend: ${quote.dividend || "N/A"}`);

    if (details) {
      console.log(`\n🏢 COMPANY INFO`);
      console.log(`   Sector: ${details.sector || "N/A"}`);
      console.log(`   Industry: ${details.industry || "N/A"}`);
      console.log(`   Employees: ${details.employees || "N/A"}`);
      console.log(`   Headquarters: ${details.headquarters || "N/A"}`);

      if (details.analystRating || details.priceTarget) {
        console.log(`\n🎯 ANALYST OUTLOOK`);
        if (details.analystRating) console.log(`   Rating: ${details.analystRating}`);
        if (details.priceTarget) console.log(`   Price Target: ${details.priceTarget}`);
      }

      if (details.summary) {
        console.log(`\n📝 SUMMARY`);
        console.log(`   ${details.summary.substring(0, 200)}...`);
      }

      if (details.recentNews.length > 0) {
        console.log(`\n📰 RECENT NEWS`);
        details.recentNews.slice(0, 5).forEach((news, i) => {
          console.log(`   ${i + 1}. ${news.headline}`);
          console.log(`      ${news.source} - ${news.time}`);
        });
      }
    }

    return { quote, details };
  } finally {
    await agent.closeAgent();
  }
}

async function getMultipleQuotes(symbols: string[]): Promise<Map<string, z.infer<typeof StockQuoteSchema>>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const quotes = new Map<string, z.infer<typeof StockQuoteSchema>>();

  console.log(`📊 Getting quotes for ${symbols.length} stocks...\n`);

  try {
    for (const symbol of symbols) {
      console.log(`  Fetching ${symbol}...`);

      const page = await agent.newPage();
      await page.goto(`https://finance.yahoo.com/quote/${symbol.toUpperCase()}`);
      await page.waitForTimeout(2500);

      try {
        const quote = await page.extract(
          "Extract stock symbol, company name, current price, change, change percent, volume, and market cap",
          z.object({
            symbol: z.string(),
            companyName: z.string(),
            price: z.string(),
            change: z.string(),
            changePercent: z.string(),
            volume: z.string(),
            marketCap: z.string(),
          })
        );

        quotes.set(symbol, quote as any);
        const changeStr = formatChange(quote.change, quote.changePercent);
        console.log(`     ${quote.price} ${changeStr}`);
      } catch (e) {
        console.log(`     Error fetching ${symbol}`);
      }
    }

    // Summary table
    console.log("\n" + "=".repeat(70));
    console.log("STOCK QUOTES SUMMARY");
    console.log("=".repeat(70));
    console.log("\nSymbol    | Price        | Change          | Volume      | Mkt Cap");
    console.log("-".repeat(70));

    quotes.forEach((quote, symbol) => {
      const sym = symbol.padEnd(9);
      const price = quote.price.padEnd(12);
      const change = `${quote.change} (${quote.changePercent})`.padEnd(15);
      const vol = quote.volume.padEnd(11);
      console.log(`${sym} | ${price} | ${change} | ${vol} | ${quote.marketCap}`);
    });

    return quotes;
  } finally {
    await agent.closeAgent();
  }
}

async function getMarketOverview(): Promise<z.infer<typeof MarketOverviewSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📊 Getting market overview...\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://finance.yahoo.com/");
    await page.waitForTimeout(3000);

    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    const overview = await page.extract(
      "Extract major market indices (S&P 500, Dow, Nasdaq) with name, value, change, percent change. Also extract trending/most active stocks with symbol, name, price, and change",
      MarketOverviewSchema
    );

    console.log("=".repeat(60));
    console.log("MARKET OVERVIEW");
    console.log("=".repeat(60));

    console.log("\n📈 MAJOR INDICES");
    overview.indices.forEach((index) => {
      console.log(`   ${index.name}: ${index.value} ${formatChange(index.change, index.changePercent)}`);
    });

    console.log("\n🔥 TRENDING STOCKS");
    overview.trending.slice(0, 10).forEach((stock, i) => {
      const isPositive = !stock.change.includes("-");
      const arrow = isPositive ? "⬆️" : "⬇️";
      console.log(`   ${i + 1}. ${stock.symbol} (${stock.name}): ${stock.price} ${arrow} ${stock.change}`);
    });

    return overview;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Get single stock quote with details
getStockQuote("AAPL", true);

// Example: Get multiple quotes
// getMultipleQuotes(["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]);

// Example: Get market overview
// getMarketOverview();



