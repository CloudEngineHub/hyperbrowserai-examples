import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";

config();

const FlightResultSchema = z.object({
  flights: z.array(
    z.object({
      airline: z.string(),
      price: z.string(),
      departure: z.string(),
      arrival: z.string(),
      duration: z.string(),
      stops: z.string(),
    })
  ),
});

async function searchKayak() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.kayak.com/flights");

  await page.waitForTimeout(3000);

  await page.aiAction("click the origin input field");
  await page.aiAction("type MIA into the origin field");
  await page.waitForTimeout(2000);
  await page.aiAction("click the first Miami option in the dropdown");

  await page.waitForTimeout(1000);

  await page.aiAction("click the destination input field");
  await page.aiAction("type NYC into the destination field");
  await page.waitForTimeout(2000);
  await page.aiAction("click the first New York option in the dropdown");

  await page.waitForTimeout(1000);

  await page.aiAction("click the departure date field");
  await page.waitForTimeout(1000);
  await page.aiAction("click on a date that is 7 days from today");

  await page.waitForTimeout(1000);
  await page.aiAction("click on a return date that is 14 days from today");

  await page.waitForTimeout(2000);

  await page.aiAction("click the search button");

  await page.waitForTimeout(10000);

  const flights = await page.extract(
    "Extract the first 10 flight results with airline name, price, departure time, arrival time, duration, and number of stops",
    FlightResultSchema
  );

  console.log("Kayak Results:");
  console.log(JSON.stringify(flights, null, 2));

  await agent.closeAgent();
  return flights;
}

searchKayak();