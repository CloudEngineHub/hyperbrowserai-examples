/**
 * Template: Startup Launch Tracker
 * Category: Research
 * Use Case: Track newly launched tools from startup platforms matching target ICP
 * Target Sites: a16z.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
// uncomment to view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const A16zStartupSchema = z.object({
  companies: z.array(
    z.object({
      name: z.string().describe("Company name"),
    })
  ),
});

async function scrapeA16zPortfolio() {
  const agent = new HyperAgent({
    llm: { provider: "anthropic", model: "claude-sonnet-4-0" },
    // llm: { provider: "gemini", model: "gemini-3-pro" },
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

  console.log("💼 a16z Portfolio Tracker\n");
  console.log("=".repeat(70) + "\n");

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    console.log("📊 Navigating to a16z portfolio page...\n");

    await page.goto("https://a16z.com/portfolio/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Scroll to load more companies
    console.log("📜 Loading portfolio companies...\n");
    await page.aiAction("click the company focus area select dropdown");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.aiAction("click the AI dropdown option");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.aiAction("click the stage select dropdown");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.aiAction("click the dropdown option for GROWTH");
    await page.aiAction("click the company status select dropdown");
    await page.aiAction("click the ACTIVE option");
    await page.waitForTimeout(2000);

    await page.aiAction("scroll 100%");

    const data = await page.extract(
      "Extract ALL portfolio companies with their company name",
      A16zStartupSchema
    );

    console.log("=".repeat(70));
    console.log("A16Z PORTFOLIO COMPANIES");
    console.log("=".repeat(70) + "\n");

    console.log(`✓ Found ${data.companies.length} companies\n`);

    data.companies.forEach((company, i) => {
      console.log(`${i + 1}. 💼 ${company.name}`);
    });

    return data;
  } catch (error) {
    console.error("Error scraping a16z portfolio:", error);
    throw error;
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "research",
    //     "startup-launch-tracker"
    //   );
    // }
  }
}

scrapeA16zPortfolio();
