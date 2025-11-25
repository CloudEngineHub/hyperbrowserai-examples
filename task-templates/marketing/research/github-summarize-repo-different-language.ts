import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const SummarySchema = z.object({
  repositoryName: z.string(),
  summary: z.string(),
  keyFeatures: z.array(z.string()),
  primaryLanguage: z.string().nullable(),
});

async function summarizeRepoWithDifferentLanguage(language: string) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
  });

  console.log("Starting GitHub Trending Repo summarization...");

  try {
    const page = await agent.newPage();

    // 1. Navigate to GitHub Trending
    console.log("Navigating to GitHub Trending...");
    await page.goto("https://github.com/sansan0/TrendRadar");

    // 4. Summarize the repository
    console.log("Summarizing repository content...");
    const result = await page.extract(
      `The repository is written in  ${language}. Analyze the repository page (README and description). Extract the repository name, a comprehensive summary of what it does, its key features, and the primary language. Output the summary in English`,
      SummarySchema
    );

    console.log("\n=== Repository Analysis ===");
    console.log(`Name: ${result.repositoryName}`);
    console.log(`Language: ${result.primaryLanguage || "N/A"}`);
    console.log(`\nSummary:\n${result.summary}`);
    console.log("\nKey Features:");
    result.keyFeatures.forEach((feature) => console.log(`- ${feature}`));
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await agent.closeAgent();
  }
}

summarizeRepoWithDifferentLanguage("chinese");
