/**
 * Template: Amazon Bestseller Tracker
 * Category: E-Commerce
 * Use Case: Track bestseller rankings in different categories
 * Target Site: amazon.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import * as fs from "fs";

config();

const BestsellerListSchema = z.object({
  category: z.string(),
  products: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      price: z.string(),
      rating: z.string().nullable(),
      reviewCount: z.string().nullable(),
      url: z.string(),
      imageUrl: z.string().nullable(),
    })
  ),
});

const MoversShakersSchema = z.object({
  category: z.string(),
  products: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      price: z.string(),
      rankChange: z.string(),
      percentChange: z.string(),
      url: z.string(),
    })
  ),
});

interface TrackedProduct {
  asin: string;
  name: string;
  category: string;
  rankHistory: Array<{
    rank: number;
    timestamp: string;
  }>;
}

interface RankingChange {
  product: string;
  category: string;
  previousRank: number;
  currentRank: number;
  change: number;
  direction: "up" | "down" | "same";
}

const CATEGORIES: Record<string, string> = {
  electronics: "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
  books: "https://www.amazon.com/best-sellers-books-Amazon/zgbs/books",
  home: "https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden",
  toys: "https://www.amazon.com/Best-Sellers-Toys-Games/zgbs/toys-and-games",
  beauty: "https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty",
  fashion: "https://www.amazon.com/Best-Sellers-Clothing/zgbs/fashion",
  sports: "https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods",
  kitchen: "https://www.amazon.com/Best-Sellers-Kitchen-Dining/zgbs/kitchen",
};

const DATA_FILE = "./bestseller-tracker-data.json";

function loadTrackedProducts(): TrackedProduct[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return [];
}

function saveTrackedProducts(products: TrackedProduct[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

async function getBestsellers(category: string): Promise<z.infer<typeof BestsellerListSchema>> {
  const categoryUrl = CATEGORIES[category.toLowerCase()];
  if (!categoryUrl) {
    throw new Error(`Unknown category: ${category}. Available: ${Object.keys(CATEGORIES).join(", ")}`);
  }

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📊 Getting Amazon Bestsellers for: ${category}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(categoryUrl);
    await page.waitForTimeout(3000);

    // Scroll to load more
    await page.aiAction("scroll 100%");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract bestseller products with their rank number (1-50), product name, price, rating, review count, product URL, and image URL",
      BestsellerListSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`AMAZON BESTSELLERS - ${category.toUpperCase()}`);
    console.log("=".repeat(60));

    result.products.slice(0, 20).forEach((product) => {
      const rankBadge = product.rank <= 3 ? ["🥇", "🥈", "🥉"][product.rank - 1] : `#${product.rank}`;
      console.log(`\n${rankBadge} ${product.name.substring(0, 50)}...`);
      console.log(`   💰 ${product.price}`);
      console.log(`   ⭐ ${product.rating || "N/A"} (${product.reviewCount || "0"} reviews)`);
    });

    return result;
  } finally {
    await agent.closeAgent();
  }
}

async function getMoversAndShakers(category: string): Promise<z.infer<typeof MoversShakersSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📈 Getting Movers & Shakers for: ${category}\n`);

  try {
    const page = await agent.newPage();

    // Navigate to movers and shakers
    const url = `https://www.amazon.com/gp/movers-and-shakers/${category.toLowerCase()}`;
    await page.goto(url);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract movers and shakers products with rank, name, price, rank change (e.g., 'Up 500%'), percentage change, and URL",
      MoversShakersSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`MOVERS & SHAKERS - ${category.toUpperCase()}`);
    console.log("=".repeat(60));

    result.products.slice(0, 15).forEach((product) => {
      const arrow = product.rankChange.toLowerCase().includes("up") ? "📈" : "📉";
      console.log(`\n${arrow} #${product.rank} ${product.name.substring(0, 45)}...`);
      console.log(`   💰 ${product.price}`);
      console.log(`   📊 ${product.rankChange} (${product.percentChange})`);
    });

    return result;
  } finally {
    await agent.closeAgent();
  }
}

async function trackMultipleCategories(categories: string[]): Promise<Map<string, z.infer<typeof BestsellerListSchema>>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const results = new Map<string, z.infer<typeof BestsellerListSchema>>();

  console.log(`📊 Tracking bestsellers across ${categories.length} categories...\n`);

  try {
    for (const category of categories) {
      const categoryUrl = CATEGORIES[category.toLowerCase()];
      if (!categoryUrl) {
        console.log(`  ⚠️ Unknown category: ${category}`);
        continue;
      }

      console.log(`  📦 Fetching ${category}...`);

      const page = await agent.newPage();
      await page.goto(categoryUrl);
      await page.waitForTimeout(3000);

      const result = await page.extract(
        "Extract top 10 bestseller products with rank, name, price, rating, review count, and URL",
        BestsellerListSchema
      );

      results.set(category, result);
      console.log(`     Found ${result.products.length} products`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("BESTSELLER SUMMARY");
    console.log("=".repeat(60));

    results.forEach((data, category) => {
      console.log(`\n📦 ${category.toUpperCase()}`);
      data.products.slice(0, 3).forEach((product) => {
        console.log(`   #${product.rank}: ${product.name.substring(0, 40)}... - ${product.price}`);
      });
    });

    return results;
  } finally {
    await agent.closeAgent();
  }
}

async function compareRankings(): Promise<RankingChange[]> {
  const trackedProducts = loadTrackedProducts();
  if (trackedProducts.length === 0) {
    console.log("No products being tracked. Use getBestsellers() first to discover products.");
    return [];
  }

  const changes: RankingChange[] = [];

  console.log(`📊 Comparing rankings for ${trackedProducts.length} tracked products...\n`);

  // Group by category
  const byCategory = new Map<string, TrackedProduct[]>();
  trackedProducts.forEach((product) => {
    if (!byCategory.has(product.category)) {
      byCategory.set(product.category, []);
    }
    byCategory.get(product.category)!.push(product);
  });

  // For each category, get current rankings and compare
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    for (const [category, products] of byCategory) {
      const categoryUrl = CATEGORIES[category.toLowerCase()];
      if (!categoryUrl) continue;

      const page = await agent.newPage();
      await page.goto(categoryUrl);
      await page.waitForTimeout(3000);

      const currentRankings = await page.extract(
        "Extract bestseller products with rank and name",
        z.object({
          products: z.array(
            z.object({
              rank: z.number(),
              name: z.string(),
            })
          ),
        })
      );

      // Compare with historical data
      products.forEach((tracked) => {
        const current = currentRankings.products.find((p) =>
          p.name.toLowerCase().includes(tracked.name.toLowerCase().substring(0, 20))
        );

        if (current && tracked.rankHistory.length > 0) {
          const previousRank = tracked.rankHistory[tracked.rankHistory.length - 1].rank;
          const change = previousRank - current.rank;

          changes.push({
            product: tracked.name,
            category,
            previousRank,
            currentRank: current.rank,
            change: Math.abs(change),
            direction: change > 0 ? "up" : change < 0 ? "down" : "same",
          });

          // Update history
          tracked.rankHistory.push({
            rank: current.rank,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    saveTrackedProducts(trackedProducts);

    // Display changes
    if (changes.length > 0) {
      console.log("=".repeat(60));
      console.log("RANKING CHANGES");
      console.log("=".repeat(60));

      const movers = changes.filter((c) => c.change > 0).sort((a, b) => b.change - a.change);

      if (movers.length > 0) {
        console.log("\n📈 BIGGEST MOVERS:");
        movers.slice(0, 10).forEach((change) => {
          const arrow = change.direction === "up" ? "⬆️" : "⬇️";
          console.log(`   ${arrow} ${change.product.substring(0, 40)}...`);
          console.log(`      ${change.previousRank} → ${change.currentRank} (${change.direction} ${change.change} spots)`);
        });
      }
    }

    return changes;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Get bestsellers for a single category
getBestsellers("electronics");

// Example: Get movers and shakers
// getMoversAndShakers("electronics");

// Example: Track multiple categories
// trackMultipleCategories(["electronics", "books", "toys"]);

// Example: Compare rankings over time
// compareRankings();

