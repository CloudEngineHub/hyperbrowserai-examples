import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const PropertySchema = z.object({
  properties: z.array(
    z.object({
      title: z.string(),
      price: z.string(),
      rating: z.string(),
      location: z.string(),
      amenities: z.array(z.string()),
    })
  ),
});

async function extractAirbnbProperties() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.airbnb.com");

  await page.aiAction("click the location search input");
  await page.aiAction("type Miami Beach into the location field");
  await page.aiAction("select Miami Beach from suggestions");

  await page.aiAction("click the search button");
  await page.aiAction("click the Got it button if it appears");

  await page.waitForTimeout(5000);

  const properties = await page.extract(
    "Extract the first 10 property listings with title, price per night, rating, location, and key amenities",
    PropertySchema
  );

  console.log("Airbnb Properties:");
  console.log(JSON.stringify(properties, null, 2));

  await agent.closeAgent();
}

extractAirbnbProperties();

