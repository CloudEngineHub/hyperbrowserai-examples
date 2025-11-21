/**
 * Template: Social Media Feed Extraction
 * Category: Social Media Data Collection
 * Use Case: Extract posts from Twitter/X user feed
 * Target Site: x.com
 */

import "dotenv/config";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";

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

  try {
    // Initialize HyperAgent
    console.log("Initializing HyperAgent...");
    agent = new HyperAgent({
      llm: {
        provider: "anthropic",
        model: "claude-sonnet-4-0",
      },
      debug: true,
    });

    // Get the page instance
    const page = await agent.newPage();
    if (!page) {
      throw new Error("Failed to get page instance from HyperAgent");
    }

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
