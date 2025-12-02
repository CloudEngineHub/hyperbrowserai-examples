/**
 * Template: Coupon Finder
 * Category: E-Commerce
 * Use Case: Aggregate coupons from RetailMeNot and other coupon sites
 * Target Sites: retailmenot.com, coupons.com
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

const CouponSchema = z.object({
  coupons: z.array(
    z.object({
      code: z.string().nullable(),
      description: z.string(),
      discount: z.string(),
      type: z.string(), // "code", "deal", "free shipping"
      verified: z.boolean(),
      expirationDate: z.string().nullable(),
      successRate: z.string().nullable(),
      usedCount: z.string().nullable(),
      terms: z.string().nullable(),
    })
  ),
});

const StoreCouponsSchema = z.object({
  storeName: z.string(),
  storeUrl: z.string().nullable(),
  totalCoupons: z.string(),
  topOffer: z.string().nullable(),
  coupons: z.array(
    z.object({
      code: z.string().nullable(),
      description: z.string(),
      discount: z.string(),
      type: z.string(),
      verified: z.boolean(),
      expirationDate: z.string().nullable(),
    })
  ),
});

interface AggregatedCoupon {
  code: string | null;
  description: string;
  discount: string;
  type: string;
  verified: boolean;
  expirationDate: string | null;
  source: string;
  successRate: string | null;
}

function parseDiscount(discount: string): number {
  const percentMatch = discount.match(/(\d+)%/);
  if (percentMatch) return parseInt(percentMatch[1]);

  const dollarMatch = discount.match(/\$(\d+)/);
  if (dollarMatch) return parseInt(dollarMatch[1]);

  return 0;
}

async function findCouponsForStore(
  storeName: string
): Promise<{ coupons: AggregatedCoupon[]; bestDeal: AggregatedCoupon | null }> {
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

  console.log(`🎟️ Finding coupons for: ${storeName}\n`);

  const allCoupons: AggregatedCoupon[] = [];
  let sessionId: string | null = null;

  try {
    // Search RetailMeNot
    console.log("  📡 Searching RetailMeNot...");
    const page1 = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page1.goto(
      `https://www.retailmenot.com/view/${storeName
        .toLowerCase()
        .replace(/\s+/g, "")}.com`
    );
    await page1.waitForTimeout(3000);

    try {
      const rmResult = await page1.extract(
        "Extract coupon codes and deals with code (if applicable), description, discount amount/percentage, type (code/deal/free shipping), verification status, expiration date, success rate, and usage count",
        CouponSchema
      );

      rmResult.coupons.forEach((coupon) => {
        allCoupons.push({
          ...coupon,
          source: "RetailMeNot",
        });
      });
      console.log(`     Found ${rmResult.coupons.length} coupons`);
    } catch (e) {
      console.log("     No coupons found on RetailMeNot");
    }

    // Search Coupons.com
    console.log("  📡 Searching Coupons.com...");
    const page2 = await agent.newPage();
    await page2.goto(
      `https://www.coupons.com/coupon-codes/${storeName
        .toLowerCase()
        .replace(/\s+/g, "-")}`
    );
    await page2.waitForTimeout(3000);

    try {
      const couponsResult = await page2.extract(
        "Extract coupon codes and deals with code, description, discount, type, verified status, and expiration",
        CouponSchema
      );

      couponsResult.coupons.forEach((coupon) => {
        allCoupons.push({
          ...coupon,
          source: "Coupons.com",
        });
      });
      console.log(`     Found ${couponsResult.coupons.length} coupons`);
    } catch (e) {
      console.log("     No coupons found on Coupons.com");
    }

    // Sort by discount value
    const sortedCoupons = allCoupons.sort((a, b) => {
      return parseDiscount(b.discount) - parseDiscount(a.discount);
    });

    // Find best deal
    const verifiedCoupons = sortedCoupons.filter((c) => c.verified && c.code);
    const bestDeal =
      verifiedCoupons.length > 0 ? verifiedCoupons[0] : sortedCoupons[0];

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log(`COUPONS FOR ${storeName.toUpperCase()}`);
    console.log("=".repeat(60));

    console.log(`\n📊 SUMMARY`);
    console.log(`   Total coupons found: ${allCoupons.length}`);
    console.log(`   Verified codes: ${verifiedCoupons.length}`);
    console.log(
      `   Deals (no code): ${allCoupons.filter((c) => !c.code).length}`
    );

    if (bestDeal) {
      console.log(`\n🏆 BEST DEAL`);
      console.log(`   ${bestDeal.discount} - ${bestDeal.description}`);
      if (bestDeal.code) console.log(`   Code: ${bestDeal.code}`);
      console.log(
        `   Source: ${bestDeal.source} | Verified: ${
          bestDeal.verified ? "Yes ✓" : "No"
        }`
      );
    }

    // Codes
    const codes = sortedCoupons.filter((c) => c.code);
    if (codes.length > 0) {
      console.log(`\n🔤 COUPON CODES`);
      codes.slice(0, 10).forEach((coupon, i) => {
        const verified = coupon.verified ? "✓" : "";
        const expires = coupon.expirationDate
          ? ` (exp: ${coupon.expirationDate})`
          : "";
        console.log(`\n   ${i + 1}. ${coupon.code} ${verified}`);
        console.log(
          `      ${coupon.discount} - ${coupon.description.substring(0, 50)}...`
        );
        console.log(`      Source: ${coupon.source}${expires}`);
        if (coupon.successRate)
          console.log(`      Success rate: ${coupon.successRate}`);
      });
    }

    // Deals
    const deals = sortedCoupons.filter((c) => !c.code);
    if (deals.length > 0) {
      console.log(`\n🏷️ DEALS (no code needed)`);
      deals.slice(0, 5).forEach((deal, i) => {
        console.log(
          `   ${i + 1}. ${deal.discount} - ${deal.description.substring(
            0,
            60
          )}...`
        );
      });
    }

    return { coupons: sortedCoupons, bestDeal };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "e-commerce", "coupon-finder");
    // }
  }
}

// Example: Find coupons for a specific store
findCouponsForStore("Amazon");
