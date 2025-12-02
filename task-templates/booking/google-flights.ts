import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

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
      model: "gpt-4o",
    },
    // llm: {
    //   provider: "anthropic",
    //   model: "claude-sonnet-4-0",
    // },
    // uncomment to run with hyperbrowser provider
    // browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto("https://www.google.com/travel/flights");

    await page.waitForTimeout(3000);

    await page.aiAction("click the departure city input");
    await page.waitForTimeout(500);
    await page.aiAction("type Los Angeles");
    await page.waitForTimeout(2000);
    await page.aiAction("click the LAX dropdown option");

    await page.waitForTimeout(1500);

    await page.aiAction("click the destination city input");
    await page.waitForTimeout(500);
    await page.aiAction("type San Francisco");
    await page.waitForTimeout(2000);
    await page.aiAction("click the SFO dropdown option");

    await page.waitForTimeout(2000);

    const curDate = new Date();
    const sevenDaysFromNow = new Date(
      curDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const fourteenDaysFromNow = new Date(
      curDate.getTime() + 14 * 24 * 60 * 60 * 1000
    );

    await page.aiAction("click the departure date field");

    await page.aiAction(
      `click the departure date that is ${
        sevenDaysFromNow.getMonth() + 1
      }/${sevenDaysFromNow.getDate()}`
    );
    await page.aiAction(
      `click the departure date that is ${
        fourteenDaysFromNow.getMonth() + 1
      }/${fourteenDaysFromNow.getDate()}`
    );
    await page.aiAction("click the done button");

    await page.aiAction("click the search button");

    const flights = await page.extract(
      "Extract the first 10 flight options with airline, price, departure time, arrival time, duration, and stops",
      FlightResultSchema
    );

    console.log("Google Flights Results:");
    console.log(JSON.stringify(flights, null, 2));

    return flights;
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "booking", "google-flights");
    // }
  }
}

searchGoogleFlights();
