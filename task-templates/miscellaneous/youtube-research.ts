import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const VideoDataSchema = z.object({
  videos: z.array(
    z.object({
      title: z.string(),
      channel: z.string(),
      views: z.string(),
      uploadDate: z.string(),
      duration: z.string(),
    })
  ),
});

async function researchYouTubeTopic(searchQuery: string) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.youtube.com");

  await page.waitForTimeout(3000);

  await page.aiAction("click the search box");
  await page.aiAction(`type ${searchQuery} into the search field`);
  await page.aiAction("press enter or click search button");

  await page.waitForTimeout(4000);

  const videos = await page.extract(
    "Extract the first 10 video results with title, channel name, view count, upload date, and duration",
    VideoDataSchema
  );

  console.log(`YouTube Research: ${searchQuery}`);
  console.log(JSON.stringify(videos, null, 2));

  await agent.closeAgent();
  return videos;
}

researchYouTubeTopic("web scraping tutorial");

