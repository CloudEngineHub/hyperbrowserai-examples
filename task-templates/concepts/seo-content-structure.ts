import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const SEODataSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  headings: z.array(
    z.object({
      level: z.string(),
      text: z.string(),
    })
  ),
  keywords: z.array(z.string()),
  imageCount: z.number(),
  linkCount: z.number(),
});

async function extractSEOStructure(url: string) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto(url);

  await page.waitForTimeout(2000);

  const seoData = await page.extract(
    "Extract SEO structure: page title, meta description, all headings with their levels (h1-h6), keywords if visible, image count, and total link count",
    SEODataSchema
  );

  console.log(`SEO Analysis for ${url}:`);
  console.log(JSON.stringify(seoData, null, 2));

  await agent.closeAgent();
  return seoData;
}

extractSEOStructure("https://www.example.com/blog/seo-guide");

