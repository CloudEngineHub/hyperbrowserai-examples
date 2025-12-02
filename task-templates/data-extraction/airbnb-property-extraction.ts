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
      model: "gpt-4o",
    },
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
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "data-extraction",
    //     "airbnb-property-extraction"
    //   );
    // }
  }
}

extractAirbnbProperties();
