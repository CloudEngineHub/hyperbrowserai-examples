/**
 * Template: Calendly Scheduling
 * Category: Workflows
 * Use Case: Schedule a meeting with Hyperbrowser
 * Target Site: calendly.com
 */

import "dotenv/config";
import { HyperAgent } from "@hyperbrowser/agent";
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

async function scheduleCalendly(): Promise<string> {
  let agent: HyperAgent | null = null;
  let sessionId: string | null = null;

  try {
    // Initialize HyperAgent
    console.log("Initializing HyperAgent...");
    agent = new HyperAgent({
      llm: {
        provider: "anthropic",
        model: "claude-sonnet-4-0",
      },
      // uncomment to run with hyperbrowser provider
      //   browserProvider: "Hyperbrowser",
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
    sessionId = getSessionId(agent);

    // Navigate to Calendly
    await page.goto("https://calendly.com/shri-hyperbrowser/demo");

    await page.aiAction("click the next available date");

    await page.aiAction("click the next available time");

    await page.aiAction("click the next button next to the time");

    // fill form
    await page.aiAction("type John Smith in the name field");

    await page.aiAction("type john.smith@example.com in the email field");

    await page.aiAction("type 'hyperbrowser is awesome' in the message field");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // commented out for demo purposes
    // await page.aiAction("click the schedule button")

    return "success";
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
    if (sessionId) {
      await waitForVideoAndDownload(sessionId, "booking", "calendly-schedule");
    }
  }
}

// Example usage
if (require.main === module) {
  scheduleCalendly()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}
