/**
 * Template: Hotel Price Comparison
 * Category: Booking
 * Use Case: Compare hotel prices across Hotels.com and Booking.com
 * Target Sites: hotels.com, booking.com
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

const HotelListingSchema = z.object({
  hotels: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      pricePerNight: z.string().nullable(),
      rating: z.string().nullable(),
      reviewCount: z.string().nullable(),
      reviewScore: z.string().nullable(),
      location: z.string().nullable(),
      distance: z.string().nullable(),
      amenities: z.array(z.string()),
      freeCancel: z.boolean(),
      breakfastIncluded: z.boolean(),
      url: z.string(),
    })
  ),
});

const HotelDetailSchema = z.object({
  name: z.string(),
  address: z.string(),
  rating: z.string(),
  reviewScore: z.string(),
  totalReviews: z.string(),
  description: z.string(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  amenities: z.array(z.string()),
  roomTypes: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      sleeps: z.string().nullable(),
      beds: z.string().nullable(),
      features: z.array(z.string()),
    })
  ),
  policies: z.object({
    cancellation: z.string().nullable(),
    payment: z.string().nullable(),
    pets: z.string().nullable(),
  }),
});

interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface ComparisonResult {
  destination: string;
  dates: { checkIn: string; checkOut: string };
  hotelsComResults: z.infer<typeof HotelListingSchema>["hotels"];
  bookingComResults: z.infer<typeof HotelListingSchema>["hotels"];
  bestDeal: {
    source: string;
    hotel: string;
    price: string;
  } | null;
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+/);
  return match ? parseInt(match[0].replace(/,/g, "")) : Infinity;
}

async function searchHotelsCom(
  agent: HyperAgent,
  params: SearchParams
): Promise<z.infer<typeof HotelListingSchema>["hotels"]> {
  const page = await agent.newPage();

  try {
    await page.goto("https://www.hotels.com/");
    await page.waitForTimeout(3000);

    // Enter destination

    await page.aiAction("Click the where to? field");
    await page.aiAction(
      `type "${params.destination}" in the destination field`
    );
    await page.waitForTimeout(1500);
    await page.aiAction("click the first destination suggestion");
    await page.waitForTimeout(1000);

    // Set dates
    await page.aiAction("click on the dates field");
    await page.waitForTimeout(1000);
    await page.aiAction(`click check-in date ${params.checkIn}`);
    await page.aiAction(`click check-out date ${params.checkOut}`);
    await page.aiAction("apply the selected dates");
    await page.waitForTimeout(1000);

    // Set guests/rooms
    await page.aiAction(
      `set ${params.guests} guests and ${params.rooms} room(s)`
    );
    await page.waitForTimeout(1000);

    // Search
    await page.aiAction("click the search button");
    await page.aiAction("scroll 100%");

    // Extract results
    const result = await page.extract(
      "Extract hotel listings with name, total price, price per night, star rating, review count, review score, location/neighborhood, distance to center, amenities, free cancellation status, breakfast included status, and hotel URL",
      HotelListingSchema
    );

    return result.hotels;
  } catch (error) {
    console.error("Error searching Hotels.com:", error);
    return [];
  }
}

async function searchBookingCom(
  agent: HyperAgent,
  params: SearchParams
): Promise<z.infer<typeof HotelListingSchema>["hotels"]> {
  const page = await agent.newPage();

  try {
    await page.goto("https://www.booking.com/");
    await page.waitForTimeout(3000);

    // Close any popups
    await page.waitForTimeout(1000);

    await page.aiAction(
      " click the x button to clear the where are you going? field."
    );

    // Enter destination
    await page.aiAction(
      `type "${params.destination}" in the where are you going? field`
    );
    await page.waitForTimeout(1500);
    await page.aiAction("select the first destination suggestion");
    await page.waitForTimeout(1000);

    // Set dates
    await page.aiAction("click on the searchbox datess");
    await page.waitForTimeout(1000);
    await page.aiAction(`click the ${params.checkIn} date`);
    await page.aiAction(`click the ${params.checkOut} date`);
    await page.waitForTimeout(1000);

    // Search
    await page.aiAction("click the search button");

    await page.aiAction("scroll 100%");

    // Extract results
    const result = await page.extract(
      "Extract hotel listings with name, total price, price per night, star rating, review count, review score, location, distance from center, amenities, free cancellation, breakfast included, and URL",
      HotelListingSchema
    );

    return result.hotels;
  } catch (error) {
    console.error("Error searching Booking.com:", error);
    return [];
  }
}

async function compareHotels(params: SearchParams): Promise<ComparisonResult> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    localConfig: {
      args: ["--window-size=1920,1080"],
    },
    // uncomment to run with hyperbrowser provider
    // browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     solveCaptchas: true,
    //     enableWindowManager: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  console.log(`🏨 Comparing hotels in: ${params.destination}`);
  console.log(`   Check-in: ${params.checkIn} | Check-out: ${params.checkOut}`);
  console.log(`   Guests: ${params.guests} | Rooms: ${params.rooms}\n`);

  let sessionId: string | null = null;

  try {
    // Search both sites
    console.log("  🔍 Searching Hotels.com...");
    const hotelsComResults = await searchHotelsCom(agent, params);
    console.log(`     Found ${hotelsComResults.length} hotels`);

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    console.log("  🔍 Searching Booking.com...");
    const bookingComResults = await searchBookingCom(agent, params);
    console.log(`     Found ${bookingComResults.length} hotels`);

    // Find best deal
    let bestDeal = null;
    const allHotels = [
      ...hotelsComResults.map((h) => ({ ...h, source: "Hotels.com" })),
      ...bookingComResults.map((h) => ({ ...h, source: "Booking.com" })),
    ].filter((h) => h.price);

    if (allHotels.length > 0) {
      const cheapest = allHotels.reduce((min, hotel) => {
        return parsePrice(hotel.price) < parsePrice(min.price) ? hotel : min;
      });

      bestDeal = {
        source: cheapest.source,
        hotel: cheapest.name,
        price: cheapest.price,
      };
    }

    // Display results
    console.log("\n" + "=".repeat(70));
    console.log("HOTEL COMPARISON RESULTS");
    console.log("=".repeat(70));

    console.log(`\n📍 ${params.destination}`);
    console.log(`📅 ${params.checkIn} → ${params.checkOut}`);

    console.log(`\n🏨 HOTELS.COM (${hotelsComResults.length} results)`);
    hotelsComResults.slice(0, 5).forEach((hotel, i) => {
      const rating = hotel.rating ? `${hotel.rating}⭐` : "";
      const score = hotel.reviewScore ? `(${hotel.reviewScore})` : "";
      const cancel = hotel.freeCancel ? "✓ Free cancel" : "";
      const breakfast = hotel.breakfastIncluded ? "✓ Breakfast" : "";

      console.log(`\n   ${i + 1}. ${hotel.name} ${rating} ${score}`);
      console.log(
        `      💰 ${hotel.price}${
          hotel.pricePerNight ? ` (${hotel.pricePerNight}/night)` : ""
        }`
      );
      console.log(
        `      📍 ${hotel.location || "Location N/A"}${
          hotel.distance ? ` - ${hotel.distance}` : ""
        }`
      );
      if (cancel || breakfast) console.log(`      ${cancel} ${breakfast}`);
    });

    console.log(`\n🏨 BOOKING.COM (${bookingComResults.length} results)`);
    bookingComResults.slice(0, 5).forEach((hotel, i) => {
      const rating = hotel.rating ? `${hotel.rating}⭐` : "";
      const score = hotel.reviewScore ? `(${hotel.reviewScore})` : "";
      const cancel = hotel.freeCancel ? "✓ Free cancel" : "";
      const breakfast = hotel.breakfastIncluded ? "✓ Breakfast" : "";

      console.log(`\n   ${i + 1}. ${hotel.name} ${rating} ${score}`);
      console.log(
        `      💰 ${hotel.price}${
          hotel.pricePerNight ? ` (${hotel.pricePerNight}/night)` : ""
        }`
      );
      console.log(
        `      📍 ${hotel.location || "Location N/A"}${
          hotel.distance ? ` - ${hotel.distance}` : ""
        }`
      );
      if (cancel || breakfast) console.log(`      ${cancel} ${breakfast}`);
    });

    if (bestDeal) {
      console.log("\n" + "=".repeat(70));
      console.log("🏆 BEST DEAL");
      console.log("=".repeat(70));
      console.log(`   Source: ${bestDeal.source}`);
      console.log(`   Hotel: ${bestDeal.hotel}`);
      console.log(`   Price: ${bestDeal.price}`);
    }

    return {
      destination: params.destination,
      dates: { checkIn: params.checkIn, checkOut: params.checkOut },
      hotelsComResults,
      bookingComResults,
      bestDeal,
    };
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    //  if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "booking", "hotel-comparison");
    // }
  }
}

const curDate = new Date();
const sevenDaysFromNow = new Date(curDate.getTime() + 7 * 24 * 60 * 60 * 1000);
const fourteenDaysFromNow = new Date(
  curDate.getTime() + 14 * 24 * 60 * 60 * 1000
);

const checkIn = `${sevenDaysFromNow.getFullYear()}-${
  sevenDaysFromNow.getMonth() + 1
}-${sevenDaysFromNow.getDate()}`;
const checkOut = `${fourteenDaysFromNow.getFullYear()}-${
  fourteenDaysFromNow.getMonth() + 1
}-${fourteenDaysFromNow.getDate()}`;
// Example usage
const searchParams: SearchParams = {
  destination: "New York City",
  checkIn,
  checkOut,
  guests: 2,
  rooms: 1,
};

compareHotels(searchParams);
