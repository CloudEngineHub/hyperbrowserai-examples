/**
 * Template: Social Media Feed Extraction
 * Category: Social Media Data Collection
 * Use Case: Extract posts from Twitter/X user feed
 * Target Site: x.com
 */

import "dotenv/config";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
// if you want you can view the video recording if you run with hyperbrowser
//  import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

// Extract schema
const XPageSchema = z.object({
  posts: z.array(
    z.object({
      author: z.string().describe("Username or display name"),
      content: z.string().describe("Tweet text content"),
      timestamp: z.string().optional().describe("Relative or absolute time"),
      likes: z.string().optional().describe("Like count"),
      retweets: z.string().optional().describe("Retweet count"),
    })
  ),
});

type XPageResult = z.infer<typeof XPageSchema>;

/**
 * Extract posts from Twitter/X feed
 * @returns Promise with extracted feed data
 */
async function extractXPage(): Promise<XPageResult> {
  let agent: HyperAgent | null = null;
  let sessionId: string | null = null;

  try {
    // Initialize HyperAgent
    console.log("Initializing HyperAgent...");
    agent = new HyperAgent({
      llm: {
        provider: "openai",
        model: "gpt-4o",
      },
      // uncomment to run with hyperbrowser provider
      // browserProvider: "Hyperbrowser",
      //   hyperbrowserConfig: {
      //     sessionConfig: {
      //       useUltraStealth: true,
      //       useProxy: true,
      //       adblock: true,
      //       ...videoSessionConfig,
      //     },
      //   },
    });

    // Get the page instance
    const page = await agent.newPage();
    if (!page) {
      throw new Error("Failed to get page instance from HyperAgent");
    }

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    // Navigate to Twitter
    await page.goto("https://x.com/hyperbrowser");

    // Click on timeline/feed (or just scroll if already on timeline)
    await page.aiAction("scroll to 30%");

    // Scroll to load more posts
    await page.aiAction("scroll to 50%");

    await page.aiAction("scroll to 75%");

    await page.aiAction("scroll to 100%");

    // Extract posts
    const result = await page.extract(
      "Extract tweets/posts including author, content, timestamp, likes, and retweets",
      XPageSchema
    );

    return result as XPageResult;
  } catch (error) {
    console.error("Error in extractTwitterFeed:", error);
    throw error;
  } finally {
    if (agent) {
      console.log("Closing HyperAgent connection.");
      try {
        await agent.closeAgent();
      } catch (err) {
        console.error("Error closing HyperAgent:", err);
      }
    }

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    // uncomment to download the video recording if you run with hyperbrowser
    // await waitForVideoAndDownload(sessionId, "data-extraction", "x-hyperbrowser-posts");
    // }
  }
}

// Example usage
if (require.main === module) {
  extractXPage()
    .then((result) => {
      console.log("\n===== Twitter Feed Results =====");
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nTotal posts extracted: ${result.posts.length}`);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}
