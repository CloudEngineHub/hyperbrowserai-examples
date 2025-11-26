/**
 * Template: Multi-Site Price Comparison
 * Category: E-Commerce
 * Use Case: Compare product prices across Amazon, Walmart, and Target
 * Target Sites: amazon.com, walmart.com, target.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ProductSearchSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      originalPrice: z.string().nullable(),
      rating: z.string().nullable(),
      reviewCount: z.string().nullable(),
      seller: z.string().nullable(),
      inStock: z.boolean(),
      url: z.string(),
      shipping: z.string().nullable(),
    })
  ),
});

interface PriceResult {
  store: string;
  product: z.infer<typeof ProductSearchSchema>["products"][0] | null;
  error?: string;
}

interface ComparisonResult {
  searchQuery: string;
  results: PriceResult[];
  bestDeal: {
    store: string;
    price: number;
    savings: string;
  } | null;
  summary: string;
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ""));
  }
  return Infinity;
}

async function searchAmazon(
  agent: HyperAgent,
  query: string
): Promise<PriceResult> {
  try {
    const page = await agent.newPage();
    await page.goto("https://www.amazon.com");
    await page.waitForTimeout(2000);

    await page.aiAction(`type "${query}" in the search box and press Enter`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract the first product result with name, price, original price if on sale, rating, review count, seller, stock status, product URL, and shipping info",
      ProductSearchSchema
    );

    return {
      store: "Amazon",
      product: result.products[0] || null,
    };
  } catch (error: any) {
    return { store: "Amazon", product: null, error: error.message };
  }
}

async function searchWalmart(
  agent: HyperAgent,
  query: string
): Promise<PriceResult> {
  try {
    const page = await agent.newPage();
    await page.goto("https://www.walmart.com");
    await page.waitForTimeout(2000);

    await page.aiAction(`type "${query}" in the search box and press Enter`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract the first product result with name, price, original price if on sale, rating, review count, seller, stock status, product URL, and shipping info",
      ProductSearchSchema
    );

    return {
      store: "Walmart",
      product: result.products[0] || null,
    };
  } catch (error: any) {
    return { store: "Walmart", product: null, error: error.message };
  }
}

async function searchTarget(
  agent: HyperAgent,
  query: string
): Promise<PriceResult> {
  try {
    const page = await agent.newPage();
    await page.goto("https://www.target.com");
    await page.waitForTimeout(2000);

    await page.aiAction(`type "${query}" in the search box and press Enter`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract the first product result with name, price, original price if on sale, rating, review count, seller, stock status, product URL, and shipping info",
      ProductSearchSchema
    );

    return {
      store: "Target",
      product: result.products[0] || null,
    };
  } catch (error: any) {
    return { store: "Target", product: null, error: error.message };
  }
}

async function comparePrices(searchQuery: string): Promise<ComparisonResult> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🔍 Comparing prices for: "${searchQuery}"\n`);

  try {
    // Search all stores
    console.log("  📦 Searching Amazon...");
    const amazonResult = await searchAmazon(agent, searchQuery);

    console.log("  📦 Searching Walmart...");
    const walmartResult = await searchWalmart(agent, searchQuery);

    console.log("  📦 Searching Target...");
    const targetResult = await searchTarget(agent, searchQuery);

    const results = [amazonResult, walmartResult, targetResult];

    // Find best deal
    const validResults = results.filter((r) => r.product && r.product.inStock);
    let bestDeal = null;

    if (validResults.length > 0) {
      const prices = validResults.map((r) => ({
        store: r.store,
        price: parsePrice(r.product!.price),
      }));

      const lowestPrice = Math.min(...prices.map((p) => p.price));
      const highestPrice = Math.max(...prices.map((p) => p.price));
      const winner = prices.find((p) => p.price === lowestPrice);

      if (winner) {
        const savings = highestPrice - lowestPrice;
        bestDeal = {
          store: winner.store,
          price: winner.price,
          savings: savings > 0 ? `$${savings.toFixed(2)} less than highest` : "Best available price",
        };
      }
    }

    // Generate summary
    const availableStores = results.filter((r) => r.product).length;
    const inStockStores = validResults.length;
    let summary = `Found at ${availableStores}/3 stores. ${inStockStores} in stock.`;
    if (bestDeal) {
      summary += ` Best price: $${bestDeal.price.toFixed(2)} at ${bestDeal.store}.`;
    }

    const comparison: ComparisonResult = {
      searchQuery,
      results,
      bestDeal,
      summary,
    };

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("PRICE COMPARISON RESULTS");
    console.log("=".repeat(60));

    console.log(`\n🔍 Search: "${searchQuery}"\n`);

    results.forEach((result) => {
      const icon = result.error ? "❌" : result.product?.inStock ? "✅" : "⚠️";
      console.log(`${icon} ${result.store}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else if (result.product) {
        const isBest = bestDeal?.store === result.store;
        const bestTag = isBest ? " 🏆 BEST PRICE" : "";

        console.log(`   Product: ${result.product.name.substring(0, 50)}...`);
        console.log(`   Price: ${result.product.price}${bestTag}`);
        if (result.product.originalPrice) {
          console.log(`   Was: ${result.product.originalPrice}`);
        }
        console.log(`   Rating: ${result.product.rating || "N/A"} (${result.product.reviewCount || "0"} reviews)`);
        console.log(`   In Stock: ${result.product.inStock ? "Yes" : "No"}`);
        console.log(`   Shipping: ${result.product.shipping || "Check site"}`);
      } else {
        console.log(`   No results found`);
      }
      console.log();
    });

    if (bestDeal) {
      console.log("=".repeat(60));
      console.log("🏆 BEST DEAL");
      console.log("=".repeat(60));
      console.log(`   Store: ${bestDeal.store}`);
      console.log(`   Price: $${bestDeal.price.toFixed(2)}`);
      console.log(`   Savings: ${bestDeal.savings}`);
    }

    console.log(`\n📊 Summary: ${summary}`);

    return comparison;
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
comparePrices("Sony WH-1000XM5 headphones");

