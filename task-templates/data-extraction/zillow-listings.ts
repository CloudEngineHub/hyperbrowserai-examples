/**
 * Template: Zillow Real Estate Listings
 * Category: Data Extraction
 * Use Case: Extract real estate listings and property data
 * Target Site: zillow.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const PropertyListingSchema = z.object({
  listings: z.array(
    z.object({
      address: z.string(),
      price: z.string(),
      beds: z.string(),
      baths: z.string(),
      sqft: z.string(),
      lotSize: z.string().nullable(),
      propertyType: z.string(),
      status: z.string(), // For Sale, Pending, Sold
      daysOnMarket: z.string().nullable(),
      pricePerSqft: z.string().nullable(),
      url: z.string(),
    })
  ),
});

const PropertyDetailSchema = z.object({
  address: z.string(),
  price: z.string(),
  zestimate: z.string().nullable(),
  beds: z.string(),
  baths: z.string(),
  sqft: z.string(),
  lotSize: z.string().nullable(),
  yearBuilt: z.string().nullable(),
  propertyType: z.string(),
  heating: z.string().nullable(),
  cooling: z.string().nullable(),
  parking: z.string().nullable(),
  hoa: z.string().nullable(),
  description: z.string(),
  features: z.array(z.string()),
  priceHistory: z.array(
    z.object({
      date: z.string(),
      event: z.string(),
      price: z.string(),
    })
  ),
  taxHistory: z.array(
    z.object({
      year: z.string(),
      tax: z.string(),
      assessment: z.string(),
    })
  ),
  schools: z.array(
    z.object({
      name: z.string(),
      rating: z.string(),
      distance: z.string(),
      grades: z.string(),
    })
  ),
});

interface SearchParams {
  location: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  propertyType?: "house" | "condo" | "townhouse" | "multi-family";
}

async function searchListings(
  params: SearchParams
): Promise<z.infer<typeof PropertyListingSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    // uncomment to run wth hyperbrowser provider
    // browserProvider: "Hyperbrowser",
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

  console.log(`🏠 Searching Zillow listings in: ${params.location}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto("https://www.zillow.com/");
    await page.waitForTimeout(3000);

    // Search for location
    await page.aiAction(
      `type "${params.location}" in the search box and press Enter`
    );

    await page.aiAction("click the search button");

    try {
      await page.aiAction("click skip this question");
    } catch (error) {
      //no op
    }

    // Apply filters if specified
    if (params.minPrice || params.maxPrice) {
      // zillow price range filter is finicky so it's often better to perform a multi step page.ai() so that it can have more context
      await page.ai(
        `Select the price range filter and for the minimum price fill in ${params.minPrice} and for the maximum price fill in ${params.maxPrice}. Select or fill in the closest matching options`
      );
      await page.waitForTimeout(2000);
    }

    if (params.beds) {
      await page.aiAction("click on the Beds & Baths filter");
      await page.aiAction(
        `click the bedrooms option for ${params.beds}+ bedrooms`
      );

      await page.aiAction("click apply");
      await page.waitForTimeout(2000);
    }

    const result = await page.extract(
      "Extract property listings with address, price, bedrooms, bathrooms, square footage, lot size, property type, sale status, days on market, price per sqft, and listing URL",
      PropertyListingSchema
    );

    // Display results
    console.log("=".repeat(70));
    console.log(`ZILLOW LISTINGS - ${params.location.toUpperCase()}`);
    console.log("=".repeat(70));

    console.log(`\n📊 Found ${result.listings.length} listings\n`);

    result.listings.slice(0, 10).forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.address}`);
      console.log(
        `   💰 ${listing.price} | ${listing.beds} bd | ${listing.baths} ba | ${listing.sqft} sqft`
      );
      console.log(`   🏠 ${listing.propertyType} | ${listing.status}`);
      if (listing.pricePerSqft)
        console.log(`   📐 ${listing.pricePerSqft}/sqft`);
      if (listing.daysOnMarket)
        console.log(`   📅 ${listing.daysOnMarket} days on market`);
      console.log();
    });

    // Price stats
    const prices = result.listings
      .map((l) => parseFloat(l.price.replace(/[$,]/g, "")))
      .filter((p) => !isNaN(p));

    if (prices.length > 0) {
      console.log("📈 PRICE STATISTICS");
      console.log(`   Lowest: $${Math.min(...prices).toLocaleString()}`);
      console.log(`   Highest: $${Math.max(...prices).toLocaleString()}`);
      console.log(
        `   Average: $${Math.round(
          prices.reduce((a, b) => a + b, 0) / prices.length
        ).toLocaleString()}`
      );
    }

    return result;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    // uncomment to download the video recording if you run with hyperbrowser
    // await waitForVideoAndDownload(sessionId, "data-extraction", "zillow-listings-search");
    // }
  }
}

async function getPropertyDetails(
  propertyUrl: string
): Promise<z.infer<typeof PropertyDetailSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },

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

  console.log(`🏠 Getting property details...\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto(propertyUrl);
    await page.waitForTimeout(4000);

    // Scroll to load all content
    await page.aiAction("scroll next chunk to see more property details");
    await page.waitForTimeout(2000);

    const details = await page.extract(
      "Extract property details: address, price, Zestimate, beds, baths, sqft, lot size, year built, property type, heating, cooling, parking, HOA fees, description, key features, price history (date, event, price), tax history (year, tax, assessment), and nearby schools (name, rating, distance, grades)",
      PropertyDetailSchema
    );

    // Display
    console.log("=".repeat(60));
    console.log(`PROPERTY DETAILS`);
    console.log("=".repeat(60));

    console.log(`\n📍 ${details.address}`);

    console.log(`\n💰 PRICING`);
    console.log(`   Asking: ${details.price}`);
    if (details.zestimate) console.log(`   Zestimate: ${details.zestimate}`);
    if (details.hoa) console.log(`   HOA: ${details.hoa}`);

    console.log(`\n🏠 PROPERTY INFO`);
    console.log(
      `   ${details.beds} bed | ${details.baths} bath | ${details.sqft} sqft`
    );
    console.log(`   Type: ${details.propertyType}`);
    if (details.yearBuilt) console.log(`   Built: ${details.yearBuilt}`);
    if (details.lotSize) console.log(`   Lot: ${details.lotSize}`);

    console.log(`\n🔧 FEATURES`);
    if (details.heating) console.log(`   Heating: ${details.heating}`);
    if (details.cooling) console.log(`   Cooling: ${details.cooling}`);
    if (details.parking) console.log(`   Parking: ${details.parking}`);

    if (details.features.length > 0) {
      console.log(`\n✨ KEY FEATURES`);
      details.features.slice(0, 8).forEach((f) => console.log(`   • ${f}`));
    }

    console.log(`\n📝 DESCRIPTION`);
    console.log(`   ${details.description.substring(0, 200)}...`);

    if (details.priceHistory.length > 0) {
      console.log(`\n📊 PRICE HISTORY`);
      details.priceHistory.slice(0, 5).forEach((h) => {
        console.log(`   ${h.date}: ${h.event} - ${h.price}`);
      });
    }

    if (details.schools.length > 0) {
      console.log(`\n🏫 NEARBY SCHOOLS`);
      details.schools.slice(0, 5).forEach((s) => {
        console.log(`   ${s.name} (${s.grades})`);
        console.log(`      Rating: ${s.rating} | Distance: ${s.distance}`);
      });
    }

    return details;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //  await waitForVideoAndDownload(
    //   sessionId,
    //   "data-extraction",
    //   "zillow-property-details"
    // );
    // }
  }
}

// Example: Search listings
searchListings({
  location: "San Francisco, CA",
  minPrice: 800000,
  maxPrice: 1500000,
  beds: 2,
});

// Example: Get property details
// getPropertyDetails("https://www.zillow.com/homedetails/...");
