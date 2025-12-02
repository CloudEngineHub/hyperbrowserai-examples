import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

// uncomment to view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const FeaturesSchema = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      available: z.boolean(),
      description: z.string(),
    })
  ),
});

async function extractCompetitorFeatures(
  agent: HyperAgent,
  competitorUrl: string,
  competitorName: string
) {
  const page = await agent.newPage();

  await page.goto(competitorUrl);

  await page.waitForTimeout(3000);

  await page.aiAction("scroll down to find the features section");
  await page.waitForTimeout(2000);

  const features = await page.extract(
    "Extract all product features with name, availability status, and description",
    FeaturesSchema
  );

  console.log(`\n${competitorName} Features:`);
  console.log(JSON.stringify(features, null, 2));

  return { name: competitorName, features: features.features };
}

function compareFeatures(
  product1: { name: string; features: any[] },
  product2: { name: string; features: any[] }
) {
  console.log("\n=== FEATURE COMPARISON ===\n");

  const product1Features = new Set(
    product1.features.map((f) => f.name.toLowerCase())
  );
  const product2Features = new Set(
    product2.features.map((f) => f.name.toLowerCase())
  );

  const onlyInProduct1 = product1.features.filter(
    (f) => !product2Features.has(f.name.toLowerCase())
  );
  const onlyInProduct2 = product2.features.filter(
    (f) => !product1Features.has(f.name.toLowerCase())
  );

  console.log(`\n✅ Only in ${product1.name} (${onlyInProduct1.length}):`);
  onlyInProduct1.forEach((f) => {
    console.log(`  - ${f.name}: ${f.description}`);
  });

  console.log(`\n✅ Only in ${product2.name} (${onlyInProduct2.length}):`);
  onlyInProduct2.forEach((f) => {
    console.log(`  - ${f.name}: ${f.description}`);
  });

  const commonFeatures = product1.features.filter((f) =>
    product2Features.has(f.name.toLowerCase())
  );
  console.log(`\n🔄 Common features (${commonFeatures.length}):`);
  commonFeatures.forEach((f) => {
    console.log(`  - ${f.name}`);
  });
}

async function compareTwoProducts(
  url1: string,
  name1: string,
  url2: string,
  name2: string
) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
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

  console.log(`\nComparing ${name1} vs ${name2}...\n`);

  let sessionId: string | null = null;

  try {
    const product1 = await extractCompetitorFeatures(agent, url1, name1);

    // Get session ID after first page is initialized
    // sessionId = getSessionId(agent);

    const product2 = await extractCompetitorFeatures(agent, url2, name2);

    compareFeatures(product1, product2);
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "research",
    //     "competitor-feature-comparison"
    //   );
    // }
  }
}

compareTwoProducts(
  "https://www.figma.com/features",
  "Figma",
  "https://www.sketch.com/features",
  "Sketch"
);
