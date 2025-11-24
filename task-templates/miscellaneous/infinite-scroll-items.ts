import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

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
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://apple.com");

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

  await agent.closeAgent();
}

extractInfiniteScrollItems();

