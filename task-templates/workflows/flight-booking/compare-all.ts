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

interface SearchParams {
  origin: string;
  destination: string;
  date?: string;
}

async function searchKayak(
  agent: HyperAgent,
  params: SearchParams
): Promise<any> {
  const page = await agent.newPage();
  await page.goto("https://www.kayak.com/flights");

  await page.waitForTimeout(3000);

  await page.aiAction("click the origin input field");
  await page.aiAction(`type ${params.origin}`);
  await page.waitForTimeout(1500);
  await page.aiAction("press Enter");

  await page.waitForTimeout(1000);

  await page.aiAction("click the destination input field");
  await page.aiAction(`type ${params.destination}`);
  await page.waitForTimeout(1500);
  await page.aiAction("press Enter");

  await page.aiAction("click the search flights button");
  await page.waitForTimeout(5000);

  const flights = await page.extract(
    "Extract the first 5 flight results with airline name, price, departure time, arrival time, duration, and stops",
    FlightResultSchema
  );

  return { source: "Kayak", ...flights };
}

async function searchGoogleFlights(
  agent: HyperAgent,
  params: SearchParams
): Promise<any> {
  const page = await agent.newPage();
  await page.goto("https://www.google.com/travel/flights");

  await page.waitForTimeout(3000);

  await page.aiAction("click the departure city input");
  await page.waitForTimeout(500);
  await page.aiAction(`type ${params.origin}`);
  await page.waitForTimeout(1500);
  await page.aiAction("press Enter");

  await page.waitForTimeout(1000);

  await page.aiAction("click the destination city input");
  await page.waitForTimeout(500);
  await page.aiAction(`type ${params.destination}`);
  await page.waitForTimeout(1500);
  await page.aiAction("press Enter");

  await page.aiAction("click the search button");
  await page.waitForTimeout(5000);

  const flights = await page.extract(
    "Extract the first 5 flight options with airline, price, departure time, arrival time, duration, and stops",
    FlightResultSchema
  );

  return { source: "Google Flights", ...flights };
}

async function compareAllSources() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const searchParams: SearchParams = {
    origin: "Miami",
    destination: "New York",
  };

  console.log(
    `\nComparing flight prices from ${searchParams.origin} to ${searchParams.destination}...\n`
  );

  const [kayakResults, googleResults] = await Promise.all([
    searchKayak(agent, searchParams).catch((e) => ({
      source: "Kayak",
      error: e.message,
    })),
    searchGoogleFlights(agent, searchParams).catch((e) => ({
      source: "Google Flights",
      error: e.message,
    })),
  ]);

  console.log("\n=== KAYAK RESULTS ===");
  console.log(JSON.stringify(kayakResults, null, 2));

  console.log("\n=== GOOGLE FLIGHTS RESULTS ===");
  console.log(JSON.stringify(googleResults, null, 2));

  await agent.closeAgent();
}

compareAllSources();

