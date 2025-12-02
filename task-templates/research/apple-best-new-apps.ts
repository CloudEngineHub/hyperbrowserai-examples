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

const AppSchema = z.object({
  apps: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      description: z.string(),
      url: z.string(),
    })
  ),
});

async function extractBestNewApps() {
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

  console.log("Starting Apple App Store extraction...");

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    // 1. Navigate to Apple App Store (iPhone apps)
    console.log("Navigating to Apple App Store...");
    await page.goto("https://apps.apple.com/us/iphone/apps");

    // 2. Click "Best New Apps and Updates" (or See All for that section)
    console.log("Navigating to Best New Apps section...");
    // The user specifically asked to click "Best New Apps and Updates".
    // Often these headers are links or have a "See All" button.
    // We'll try to click the section header or a "See All" link associated with it.
    await page.aiAction("click the 'Best New Apps and Updates' link");

    await page.aiAction("scroll to bottom of page");

    // 4. Extract apps
    console.log("Extracting apps...");
    const result = await page.extract(
      "Extract the list of apps from the 'Best New Apps and Updates' page/section. Include the app name, category, a brief description if available, and the URL.",
      AppSchema
    );

    console.log("\nBest New Apps and Updates:");
    result.apps.forEach((app, index) => {
      console.log(`\n#${index + 1} ${app.name}`);
      console.log(`Category: ${app.category}`);
      if (app.description) console.log(`Description: ${app.description}`);
      if (app.url) console.log(`URL: ${app.url}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    // await waitForVideoAndDownload(sessionId, "research", "apple-best-new-apps");
    // }
  }
}

extractBestNewApps();
