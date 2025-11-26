/**
 * Template: Startup Launch Tracker
 * Category: Research
 * Use Case: Track newly launched tools from startup platforms matching target ICP
 * Target Sites: a16z.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const A16zStartupSchema = z.object({
  companies: z.array(
    z.object({
      name: z.string().describe("Company name"),
      description: z.string().describe("Company description"),
      category: z.string().nullable().describe("Category or industry"),
      website: z.string().nullable().describe("Company website URL"),
      stage: z.string().nullable().describe("Funding stage if available"),
    })
  ),
});

async function scrapeA16zPortfolio() {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("💼 a16z Portfolio Tracker\n");
  console.log("=".repeat(70) + "\n");

  const page = await agent.newPage();

  try {
    console.log("📊 Navigating to a16z portfolio page...\n");
    
    await page.goto("https://a16z.com/portfolio/", { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    await page.waitForTimeout(5000);

    // Handle cookie consent
    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    // Scroll to load more companies
    console.log("📜 Loading portfolio companies...\n");
    await page.aiAction("scroll down to load more portfolio companies");
    await page.waitForTimeout(3000);
    await page.aiAction("scroll down more");
    await page.waitForTimeout(2000);

    const data = await page.extract(
      "Extract portfolio companies with: company name, description, category/industry, website URL, and funding stage if available",
      A16zStartupSchema,
      { maxSteps: 5 }
    );

    console.log("=".repeat(70));
    console.log("A16Z PORTFOLIO COMPANIES");
    console.log("=".repeat(70) + "\n");

    console.log(`✓ Found ${data.companies.length} companies\n`);

    data.companies.forEach((company, i) => {
      console.log(`${i + 1}. 💼 ${company.name}`);
      console.log(`   ${company.description}`);
      if (company.category) console.log(`   Category: ${company.category}`);
      if (company.stage) console.log(`   Stage: ${company.stage}`);
      if (company.website) console.log(`   Website: ${company.website}`);
      console.log("-".repeat(70));
    });

    // Summary by category
    const categories = new Map<string, number>();
    data.companies.forEach((c) => {
      const cat = c.category || "Unknown";
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });

    console.log("\n📊 CATEGORIES BREAKDOWN:");
    Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        console.log(`   • ${cat}: ${count} companies`);
      });

    return data;
  } catch (error) {
    console.error("Error scraping a16z portfolio:", error);
    throw error;
  } finally {
    await agent.closeAgent();
  }
}

scrapeA16zPortfolio();