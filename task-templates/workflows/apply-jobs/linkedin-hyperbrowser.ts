import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

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

async function extractHyperbrowserJobs() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
  });

  console.log("Starting Hyperbrowser LinkedIn Job Extraction...");

  try {
    const page = await agent.newPage();

    // 1. Navigate to Hyperbrowser LinkedIn page
    console.log("Navigating to Hyperbrowser LinkedIn page...");
    await page.goto("https://www.linkedin.com/company/hyperbrowser");

    await page.aiAction("click x on the modal");

    // 2. Click "See jobs" button
    console.log("Clicking 'See jobs' button...");
    // LinkedIn pages often have a "See jobs" link or tab.
    // Sometimes it's a tab named "Jobs" or a button.
    await page.aiAction("click the 'See jobs' button or 'Jobs' tab");

    // 3. Wait for content to load
    await page.waitForTimeout(3000);

    // 4. Extract job listings
    console.log("Extracting job listings...");
    const result = await page.extract(
      "Extract the job listings visible on the page. Include the job title, location, a brief description if visible (or snippet), and the link to the job.",
      JobSchema
    );

    // To apply to the job, you need to log into linked in.
    // We recommend you use a secrets manager for your credentials like AWS Secrets Manager.

    console.log("\nHyperbrowser Job Listings:");
    if (result.jobs.length === 0) {
      console.log("No jobs found or extracted.");
    }
    result.jobs.forEach((job, index) => {
      console.log(`\n#${index + 1} ${job.title}`);
      console.log(`Location: ${job.location}`);
      if (job.description) console.log(`Description: ${job.description}`);
      if (job.url) console.log(`URL: ${job.url}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await agent.closeAgent();
  }
}

extractHyperbrowserJobs();
