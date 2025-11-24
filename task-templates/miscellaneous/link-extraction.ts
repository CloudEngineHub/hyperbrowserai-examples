import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const LinksSchema = z.object({
  links: z.array(
    z.object({
      text: z.string(),
      url: z.string(),
      type: z.string(),
    })
  ),
});

async function extractLinks(url: string) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto(url);

  await page.waitForTimeout(2000);

  const links = await page.extract(
    "Extract all links from the page with their text, URL, and type (navigation, external, internal, etc)",
    LinksSchema
  );

  console.log(`Extracted ${links.links.length} links from ${url}:`);
  console.log(JSON.stringify(links, null, 2));

  await agent.closeAgent();
  return links;
}

extractLinks("https://news.ycombinator.com");

