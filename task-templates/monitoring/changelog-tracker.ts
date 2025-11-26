/**
 * Template: Changelog Scraper
 * Category: Monitoring
 * Use Case: Extract changelog entries from product update pages
 * Target Sites: changelog pages, release notes
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ChangelogSchema = z.object({
  entries: z.array(
    z.object({
      title: z.string().describe("Entry title or feature name"),
      date: z.string().describe("Release date, use 'Unknown' if not found"),
      description: z.string().describe("Description of the update"),
      version: z.string().describe("Version number, use 'N/A' if not found"),
    })
  ),
});

async function scrapeChangelog(changelogUrl: string) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("📋 Changelog Scraper\n");
  console.log("=".repeat(70) + "\n");

  const page = await agent.newPage();

  try {
    await page.goto(changelogUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(5000);

    await page.aiAction("scroll down to see changelog entries");
    await page.waitForTimeout(3000);

    const data = await page.extract(
      "Extract all visible changelog entries. For each entry include: title, date, description, and version number. Use 'Unknown' for date and 'N/A' for version if not found.",
      ChangelogSchema,
      { maxSteps: 3 }
    );

    console.log("=".repeat(70));
    console.log("CHANGELOG ENTRIES");
    console.log("=".repeat(70) + "\n");

    console.log(`✓ Found ${data.entries.length} entries\n`);

    data.entries.forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.title}`);
      console.log(`   Version: ${entry.version}`);
      console.log(`   Date: ${entry.date}`);
      console.log(`   ${entry.description.substring(0, 150)}${entry.description.length > 150 ? "..." : ""}`);
      console.log("-".repeat(70));
    });

    return data;
  } catch (error) {
    console.error("Error scraping changelog:", error);
    throw error;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Scrape Vercel changelog
scrapeChangelog("https://vercel.com/changelog");

// Example: Scrape another changelog
// scrapeChangelog("https://supabase.com/changelog");
