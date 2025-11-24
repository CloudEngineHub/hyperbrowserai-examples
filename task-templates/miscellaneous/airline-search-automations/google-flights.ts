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

async function searchGoogleFlights() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.google.com/travel/flights");

  await page.waitForTimeout(3000);

  await page.aiAction("click the departure city input");
  await page.waitForTimeout(500);
  await page.aiAction("type Los Angeles");
  await page.waitForTimeout(2000);
  await page.aiAction("press Enter");

  await page.waitForTimeout(1500);

  await page.aiAction("click the destination city input");
  await page.waitForTimeout(500);
  await page.aiAction("type San Francisco");
  await page.waitForTimeout(2000);
  await page.aiAction("press Enter");

  await page.waitForTimeout(2000);

  await page.aiAction("click the explore button or search button");

  await page.waitForTimeout(5000);

  const flights = await page.extract(
    "Extract the first 10 flight options with airline, price, departure time, arrival time, duration, and stops",
    FlightResultSchema
  );

  console.log("Google Flights Results:");
  console.log(JSON.stringify(flights, null, 2));

  await agent.closeAgent();
  return flights;
}

searchGoogleFlights();

