import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const JobSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      location: z.string(),
      description: z.string().nullable(),
      url: z.string().nullable(),
    })
  ),
});

async function extractIndeedJobs() {
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
    //     solveCaptchas: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  console.log("Starting Indeed Job Extraction...");

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    // 1. Navigate to Hyperbrowser LinkedIn page
    await page.goto("https://www.indeed.com", {
      waitUntil: "domcontentloaded",
    });

    await page.aiAction("type software engineer in the jobs search field");

    await page.aiAction("click the location search field");

    try {
      await page.aiAction("click the x to clear the location search field");
    } catch {}

    await page.aiAction("fill San Francisco into the location search field");

    await page.aiAction("click the search button");

    await page.waitForTimeout(2000);

    const jobs = await page.extract(
      "Extract the job listings visible on the page. Include the job title, location, a brief description if visible (or snippet), and the link to the job.",
      JobSchema
    );

    console.log("\nIndeed Job Listings:");
    console.log(JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "job-search", "indeed-jobs");
    // }
  }
}

extractIndeedJobs();
