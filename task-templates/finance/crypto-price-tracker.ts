/**
 * Template: Crypto Price Tracker
 * Category: Finance
 * Use Case: Track cryptocurrency prices from CoinGecko/CoinMarketCap
 * Target Sites: coingecko.com, coinmarketcap.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const CryptoQuoteSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  price: z.string(),
  change24h: z.string(),
  change7d: z.string().nullable(),
  marketCap: z.string(),
  volume24h: z.string(),
  circulatingSupply: z.string().nullable(),
  rank: z.string().nullable(),
  allTimeHigh: z.string().nullable(),
  allTimeLow: z.string().nullable(),
});

const TopCryptosSchema = z.object({
  cryptos: z.array(
    z.object({
      rank: z.string(),
      name: z.string(),
      symbol: z.string(),
      price: z.string(),
      change24h: z.string(),
      change7d: z.string().nullable(),
      marketCap: z.string(),
      volume24h: z.string(),
    })
  ),
});

const TrendingSchema = z.object({
  trending: z.array(
    z.object({
      name: z.string(),
      symbol: z.string(),
      price: z.string(),
      change24h: z.string(),
      reason: z.string().nullable(),
    })
  ),
  topGainers: z.array(
    z.object({
      name: z.string(),
      symbol: z.string(),
      change24h: z.string(),
    })
  ),
  topLosers: z.array(
    z.object({
      name: z.string(),
      symbol: z.string(),
      change24h: z.string(),
    })
  ),
});

interface CryptoData {
  quote: z.infer<typeof CryptoQuoteSchema>;
  source: string;
}

function formatChange(change: string): string {
  const isPositive = !change.includes("-");
  const arrow = isPositive ? "📈" : "📉";
  return `${arrow} ${change}`;
}

async function getCryptoPrice(coinId: string): Promise<CryptoData> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🪙 Getting crypto price for: ${coinId}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.coingecko.com/en/coins/${coinId}`);
    await page.waitForTimeout(3000);

    // Handle cookie consent
    await page.aiAction("close cookie banner if present");
    await page.waitForTimeout(1000);

    const quote = await page.extract(
      "Extract cryptocurrency name, symbol, current price in USD, 24h change percent, 7d change percent, market cap, 24h trading volume, circulating supply, market rank, all-time high price, and all-time low price",
      CryptoQuoteSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`${quote.name} (${quote.symbol.toUpperCase()})`);
    console.log("=".repeat(60));

    console.log(`\n💰 CURRENT PRICE: ${quote.price}`);
    console.log(`   24h: ${formatChange(quote.change24h)}`);
    if (quote.change7d) console.log(`   7d: ${formatChange(quote.change7d)}`);

    console.log(`\n📊 MARKET DATA`);
    console.log(`   Rank: #${quote.rank || "N/A"}`);
    console.log(`   Market Cap: ${quote.marketCap}`);
    console.log(`   24h Volume: ${quote.volume24h}`);
    console.log(`   Circulating Supply: ${quote.circulatingSupply || "N/A"}`);

    if (quote.allTimeHigh || quote.allTimeLow) {
      console.log(`\n📈 PRICE HISTORY`);
      if (quote.allTimeHigh) console.log(`   All-Time High: ${quote.allTimeHigh}`);
      if (quote.allTimeLow) console.log(`   All-Time Low: ${quote.allTimeLow}`);
    }

    return { quote, source: "CoinGecko" };
  } finally {
    await agent.closeAgent();
  }
}

async function getTopCryptos(limit: number = 20): Promise<z.infer<typeof TopCryptosSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🪙 Getting top ${limit} cryptocurrencies...\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.coingecko.com/");
    await page.waitForTimeout(3000);

    await page.aiAction("close cookie banner if present");
    await page.waitForTimeout(1000);

    // Scroll to load more
    await page.aiAction("scroll down to load more cryptocurrencies");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract the top ${limit} cryptocurrencies with rank, name, symbol, price, 24h change, 7d change, market cap, and 24h volume`,
      TopCryptosSchema
    );

    // Display results
    console.log("=".repeat(70));
    console.log("TOP CRYPTOCURRENCIES");
    console.log("=".repeat(70));

    console.log("\n Rank | Name              | Price          | 24h       | Market Cap");
    console.log("-".repeat(70));

    result.cryptos.slice(0, limit).forEach((crypto) => {
      const rank = crypto.rank.padStart(4);
      const name = `${crypto.name} (${crypto.symbol})`.padEnd(17).substring(0, 17);
      const price = crypto.price.padEnd(14);
      const change = crypto.change24h.padEnd(9);
      console.log(`${rank} | ${name} | ${price} | ${change} | ${crypto.marketCap}`);
    });

    // Summary
    const gainers = result.cryptos.filter((c) => !c.change24h.includes("-"));
    const losers = result.cryptos.filter((c) => c.change24h.includes("-"));

    console.log(`\n📊 SUMMARY`);
    console.log(`   Gainers: ${gainers.length} | Losers: ${losers.length}`);

    return result;
  } finally {
    await agent.closeAgent();
  }
}

async function getTrendingCryptos(): Promise<z.infer<typeof TrendingSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🔥 Getting trending cryptocurrencies...\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.coingecko.com/");
    await page.waitForTimeout(3000);

    await page.aiAction("close cookie banner if present");
    await page.waitForTimeout(1000);

    // Look for trending section
    await page.aiAction("scroll to trending or most searched coins section");
    await page.waitForTimeout(1500);

    const result = await page.extract(
      "Extract trending/most searched coins with name, symbol, price, 24h change, and reason if shown. Also extract top gainers and top losers with name, symbol, and change percentage",
      TrendingSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log("CRYPTO MARKET MOVERS");
    console.log("=".repeat(60));

    console.log("\n🔥 TRENDING");
    result.trending.slice(0, 10).forEach((crypto, i) => {
      const reason = crypto.reason ? ` (${crypto.reason})` : "";
      console.log(`   ${i + 1}. ${crypto.name} (${crypto.symbol}): ${crypto.price} ${formatChange(crypto.change24h)}${reason}`);
    });

    if (result.topGainers.length > 0) {
      console.log("\n📈 TOP GAINERS");
      result.topGainers.slice(0, 5).forEach((crypto, i) => {
        console.log(`   ${i + 1}. ${crypto.name} (${crypto.symbol}): ${crypto.change24h}`);
      });
    }

    if (result.topLosers.length > 0) {
      console.log("\n📉 TOP LOSERS");
      result.topLosers.slice(0, 5).forEach((crypto, i) => {
        console.log(`   ${i + 1}. ${crypto.name} (${crypto.symbol}): ${crypto.change24h}`);
      });
    }

    return result;
  } finally {
    await agent.closeAgent();
  }
}

async function compareCryptos(coins: string[]): Promise<Map<string, z.infer<typeof CryptoQuoteSchema>>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const quotes = new Map<string, z.infer<typeof CryptoQuoteSchema>>();

  console.log(`🪙 Comparing ${coins.length} cryptocurrencies...\n`);

  try {
    for (const coin of coins) {
      console.log(`  Fetching ${coin}...`);

      const page = await agent.newPage();
      await page.goto(`https://www.coingecko.com/en/coins/${coin}`);
      await page.waitForTimeout(2500);

      try {
        const quote = await page.extract(
          "Extract name, symbol, price, 24h change, market cap, and 24h volume",
          z.object({
            name: z.string(),
            symbol: z.string(),
            price: z.string(),
            change24h: z.string(),
            marketCap: z.string(),
            volume24h: z.string(),
          })
        );

        quotes.set(coin, quote as any);
        console.log(`     ${quote.price} ${formatChange(quote.change24h)}`);
      } catch (e) {
        console.log(`     Error fetching ${coin}`);
      }
    }

    // Comparison table
    console.log("\n" + "=".repeat(70));
    console.log("CRYPTOCURRENCY COMPARISON");
    console.log("=".repeat(70));

    console.log("\nCoin           | Price          | 24h Change  | Market Cap");
    console.log("-".repeat(70));

    quotes.forEach((quote) => {
      const name = `${quote.name}`.padEnd(14).substring(0, 14);
      const price = quote.price.padEnd(14);
      const change = quote.change24h.padEnd(11);
      console.log(`${name} | ${price} | ${change} | ${quote.marketCap}`);
    });

    return quotes;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Get single crypto price
getCryptoPrice("bitcoin");

// Example: Get top cryptos
// getTopCryptos(25);

// Example: Get trending
// getTrendingCryptos();

// Example: Compare multiple coins
// compareCryptos(["bitcoin", "ethereum", "solana", "cardano"]);



