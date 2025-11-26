/**
 * Template: Product Hunt Product Scraper
 * Category: Research
 * Use Case: Extract recently launched products from Product Hunt
 * Target Sites: producthunt.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ProductHuntSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe("Product name"),
      tagline: z.string().describe("Product tagline or short description"),
      votes: z.string().describe("Number of upvotes, use '0' if not found"),
      url: z.string().describe("Product URL or link"),
    })
  ),
});

async function scrapeProductHunt() {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("🚀 Product Hunt Scraper\n");
  console.log("=".repeat(70) + "\n");

  const page = await agent.newPage();

  try {
    await page.goto("https://www.producthunt.com/", { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    await page.waitForTimeout(5000);

    await page.aiAction("scroll down to see more products");
    await page.waitForTimeout(3000);

    const data = await page.extract(
      "Extract all visible products from the page. For each product include: name, tagline, upvotes, and URL. Use '0' for votes if not visible.",
      ProductHuntSchema,
      { maxSteps: 3 }
    );

    console.log("=".repeat(70));
    console.log("PRODUCTS FOUND");
    console.log("=".repeat(70) + "\n");

    console.log(`✓ Found ${data.products.length} products\n`);

    data.products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`);
      console.log(`   ${product.tagline}`);
      console.log(`   Votes: ${product.votes}`);
      console.log(`   URL: ${product.url}`);
      console.log("-".repeat(70));
    });

    return data;
  } catch (error) {
    console.error("Error scraping Product Hunt:", error);
    throw error;
  } finally {
    await agent.closeAgent();
  }
}

scrapeProductHunt();