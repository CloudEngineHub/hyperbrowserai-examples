import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const RedditPostsSchema = z.object({
  posts: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      upvotes: z.string(),
      comments: z.string(),
      subreddit: z.string(),
      url: z.string(),
    })
  ),
});

async function researchRedditTopic(subreddit: string, topic: string) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto(`https://www.reddit.com/r/${subreddit}`);

  await page.waitForTimeout(3000);

  await page.aiAction("click the search box");
  await page.aiAction(`type ${topic} into the search field`);
  await page.aiAction("click the search button");

  await page.waitForTimeout(3000);

  const posts = await page.extract(
    "Extract the top 10 posts with title, author, upvotes, comment count, subreddit, and URL",
    RedditPostsSchema
  );

  console.log(`Reddit Research: ${topic} in r/${subreddit}`);
  console.log(JSON.stringify(posts, null, 2));

  await agent.closeAgent();
  return posts;
}

researchRedditTopic("programming", "artificial intelligence");

