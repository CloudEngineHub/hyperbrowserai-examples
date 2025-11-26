/**
 * Template: Etsy Shop Analyzer
 * Category: E-Commerce
 * Use Case: Analyze Etsy shop performance and best sellers
 * Target Site: etsy.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ShopProfileSchema = z.object({
  shopName: z.string(),
  ownerName: z.string().nullable(),
  location: z.string().nullable(),
  sales: z.string(),
  rating: z.string(),
  reviewCount: z.string(),
  admirers: z.string().nullable(),
  memberSince: z.string().nullable(),
  about: z.string().nullable(),
  announcement: z.string().nullable(),
  policies: z.object({
    shipping: z.string().nullable(),
    returns: z.string().nullable(),
  }),
});

const ShopListingsSchema = z.object({
  listings: z.array(
    z.object({
      title: z.string(),
      price: z.string(),
      originalPrice: z.string().nullable(),
      rating: z.string().nullable(),
      reviewCount: z.string().nullable(),
      isBestseller: z.boolean(),
      isOnSale: z.boolean(),
      freeShipping: z.boolean(),
      url: z.string(),
    })
  ),
});

const ShopReviewsSchema = z.object({
  averageRating: z.string(),
  totalReviews: z.string(),
  reviews: z.array(
    z.object({
      rating: z.string(),
      content: z.string(),
      reviewer: z.string(),
      date: z.string(),
      item: z.string().nullable(),
      hasPhoto: z.boolean(),
    })
  ),
});

interface ShopAnalysis {
  profile: z.infer<typeof ShopProfileSchema>;
  listings: z.infer<typeof ShopListingsSchema>["listings"];
  reviews: z.infer<typeof ShopReviewsSchema>;
  insights: {
    priceRange: { min: number; max: number; avg: number };
    bestsellersCount: number;
    saleItemsCount: number;
    freeShippingRate: number;
    reviewSentiment: string;
  };
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
}

function parseSales(salesStr: string): number {
  const match = salesStr.toLowerCase().match(/([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, "")) : 0;
}

async function analyzeEtsyShop(shopName: string): Promise<ShopAnalysis> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🛍️ Analyzing Etsy shop: ${shopName}\n`);

  try {
    const page = await agent.newPage();

    // Navigate to shop
    await page.goto(`https://www.etsy.com/shop/${shopName}`);
    await page.waitForTimeout(3000);

    // Extract shop profile
    console.log("  🏪 Extracting shop profile...");
    const profile = await page.extract(
      "Extract shop name, owner name, location, total sales, star rating, review count, admirers/followers, member since date, about section, shop announcement, and policies (shipping, returns)",
      ShopProfileSchema
    );

    // Scroll to load more listings
    console.log("  📦 Extracting listings...");
    await page.aiAction("scroll down to load more listings");
    await page.waitForTimeout(2000);

    const listingsData = await page.extract(
      "Extract shop listings with title, price, original price if on sale, rating, review count, bestseller badge, sale status, free shipping badge, and listing URL",
      ShopListingsSchema
    );

    // Navigate to reviews
    console.log("  ⭐ Extracting reviews...");
    await page.aiAction("click on reviews tab or section");
    await page.waitForTimeout(2000);

    const reviewsData = await page.extract(
      "Extract average rating, total reviews, and individual reviews with rating, content, reviewer name, date, item purchased, and whether it has a photo",
      ShopReviewsSchema
    );

    // Calculate insights
    const listings = listingsData.listings;
    const prices = listings.map((l) => parsePrice(l.price)).filter((p) => p > 0);

    const insights = {
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
        avg: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      },
      bestsellersCount: listings.filter((l) => l.isBestseller).length,
      saleItemsCount: listings.filter((l) => l.isOnSale).length,
      freeShippingRate: listings.length > 0
        ? (listings.filter((l) => l.freeShipping).length / listings.length) * 100
        : 0,
      reviewSentiment: parseFloat(reviewsData.averageRating) >= 4.5
        ? "Excellent"
        : parseFloat(reviewsData.averageRating) >= 4
        ? "Good"
        : "Mixed",
    };

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("ETSY SHOP ANALYSIS");
    console.log("=".repeat(60));

    console.log(`\n🏪 SHOP PROFILE`);
    console.log(`   Shop: ${profile.shopName}`);
    console.log(`   Owner: ${profile.ownerName || "N/A"}`);
    console.log(`   Location: ${profile.location || "N/A"}`);
    console.log(`   Member Since: ${profile.memberSince || "N/A"}`);

    console.log(`\n📊 PERFORMANCE`);
    console.log(`   Total Sales: ${profile.sales}`);
    console.log(`   Rating: ${profile.rating} ⭐ (${profile.reviewCount} reviews)`);
    console.log(`   Admirers: ${profile.admirers || "N/A"}`);

    console.log(`\n💰 PRICING`);
    console.log(`   Price Range: $${insights.priceRange.min.toFixed(2)} - $${insights.priceRange.max.toFixed(2)}`);
    console.log(`   Average Price: $${insights.priceRange.avg.toFixed(2)}`);

    console.log(`\n📦 LISTINGS (${listings.length} extracted)`);
    console.log(`   Bestsellers: ${insights.bestsellersCount}`);
    console.log(`   On Sale: ${insights.saleItemsCount}`);
    console.log(`   Free Shipping: ${insights.freeShippingRate.toFixed(0)}%`);

    if (profile.about) {
      console.log(`\n📝 ABOUT`);
      console.log(`   ${profile.about.substring(0, 150)}...`);
    }

    console.log(`\n🏆 TOP LISTINGS`);
    const sortedListings = [...listings].sort((a, b) => {
      // Prioritize bestsellers, then by reviews
      if (a.isBestseller && !b.isBestseller) return -1;
      if (!a.isBestseller && b.isBestseller) return 1;
      return parseInt(b.reviewCount || "0") - parseInt(a.reviewCount || "0");
    });

    sortedListings.slice(0, 5).forEach((listing, i) => {
      const badges = [];
      if (listing.isBestseller) badges.push("🏆 Bestseller");
      if (listing.isOnSale) badges.push("💸 Sale");
      if (listing.freeShipping) badges.push("📦 Free Ship");

      console.log(`\n   ${i + 1}. ${listing.title.substring(0, 50)}...`);
      console.log(`      ${listing.price}${listing.originalPrice ? ` (was ${listing.originalPrice})` : ""}`);
      console.log(`      ${listing.rating || "N/A"} ⭐ (${listing.reviewCount || "0"} reviews)`);
      if (badges.length > 0) console.log(`      ${badges.join(" | ")}`);
    });

    console.log(`\n⭐ REVIEWS`);
    console.log(`   Average: ${reviewsData.averageRating} (${reviewsData.totalReviews} total)`);
    console.log(`   Sentiment: ${insights.reviewSentiment}`);

    console.log(`\n   Recent Reviews:`);
    reviewsData.reviews.slice(0, 5).forEach((review, i) => {
      const photo = review.hasPhoto ? " 📷" : "";
      console.log(`   ${i + 1}. ${"⭐".repeat(parseInt(review.rating))} by ${review.reviewer}${photo}`);
      console.log(`      "${review.content.substring(0, 80)}..."`);
      if (review.item) console.log(`      Item: ${review.item}`);
    });

    // Policies
    if (profile.policies.shipping || profile.policies.returns) {
      console.log(`\n📋 POLICIES`);
      if (profile.policies.shipping) console.log(`   Shipping: ${profile.policies.shipping}`);
      if (profile.policies.returns) console.log(`   Returns: ${profile.policies.returns}`);
    }

    return {
      profile,
      listings,
      reviews: reviewsData,
      insights,
    };
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
analyzeEtsyShop("ThreeBirdNest");

