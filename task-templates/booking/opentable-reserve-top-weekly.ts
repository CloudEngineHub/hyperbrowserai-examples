/**
 * Template: OpenTable Scheduling
 * Category: Workflows
 * Use Case: Reserve a table at a restaurant
 * Target Site: opentable.com
 */

import "dotenv/config";
import { HyperAgent } from "@hyperbrowser/agent";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

async function scheduleOpenTable(): Promise<string> {
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

    // Get the page instance
    const page = await agent.newPage();
    if (!page) {
      throw new Error("Failed to get page instance from HyperAgent");
    }

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    // Navigate to Calendly
    await page.goto(
      "https://www.opentable.com/metro/san-francisco-restaurants",
      { waitUntil: "networkidle" }
    );

    // add timeout for page to settle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await page.aiAction("scroll to 'Top restaurants this week' section");
    await page.aiAction("click the first restaurant in Top Booked");

    await page.aiAction("click the next available time");

    // fill form
    await page.aiAction("type 1234567890 in the phone number field");

    await page.aiAction("select Birthday in the occasion field");

    await page.aiAction(
      "uncheck 'Sign me up to receive dining offers and news from this restaurant by email.'"
    );

    await page.aiAction(
      "check 'I agree to the restaurant's terms and conditions'"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // commented out for demo purposes
    // await page.aiAction("click Complete Reservation button");

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

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "booking", "opentable-reserve");
    // }
  }
}

// Example usage
if (require.main === module) {
  scheduleOpenTable()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}
