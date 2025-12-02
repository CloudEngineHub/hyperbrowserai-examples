import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const ItemsSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      metadata: z.string(),
    })
  ),
});

async function extractInfiniteScrollItems() {
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

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto("https://infinite-scroll.com/demo/full-page");

    const scrollIterations = 3;

    for (let i = 0; i < scrollIterations; i++) {
      console.log(`Scrolling iteration ${i + 1}...`);
      await page.aiAction("scroll down to load more items");
      await page.waitForTimeout(2000);
    }

    const items = await page.extract(
      "Extract all visible article items with title, description, and metadata",
      ItemsSchema
    );

    console.log(`Extracted ${items.items.length} items:`);
    console.log(JSON.stringify(items, null, 2));
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //  await waitForVideoAndDownload(sessionId, "concepts", "infinite-scroll-items");
    // }
  }
}

extractInfiniteScrollItems();
