import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const DynamicContentSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
});

async function waitForDynamicContent() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.amazon.com/s?k=laptop");

  console.log("Waiting for initial page load...");
  await page.waitForTimeout(3000);

  console.log("Scrolling to trigger lazy-loaded content...");
  await page.aiAction("scroll down slowly to load lazy content");
  await page.waitForTimeout(3000);

  await page.aiAction("scroll down more to load additional content");
  await page.waitForTimeout(3000);

  console.log("Extracting dynamically loaded content...");
  const content = await page.extract(
    "Extract all visible content items that were lazy-loaded",
    DynamicContentSchema
  );

  console.log("Dynamic Content Extracted:");
  console.log(JSON.stringify(content, null, 2));

  await agent.closeAgent();
}

waitForDynamicContent();

