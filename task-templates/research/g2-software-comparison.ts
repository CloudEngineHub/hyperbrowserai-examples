/**
 * Template: G2 Software Comparison
 * Category: Research
 * Use Case: Compare SaaS products using G2 reviews and ratings
 * Target Site: g2.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ProductOverviewSchema = z.object({
  name: z.string(),
  category: z.string(),
  overallRating: z.string(),
  totalReviews: z.string(),
  description: z.string(),
  vendorName: z.string().nullable(),
  pricing: z.string().nullable(),
  freeTrialAvailable: z.boolean(),
  ratings: z.object({
    easeOfUse: z.string().nullable(),
    qualityOfSupport: z.string().nullable(),
    easeOfSetup: z.string().nullable(),
    easeOfAdmin: z.string().nullable(),
  }),
  userSatisfaction: z.string().nullable(),
  marketPresence: z.string().nullable(),
});

const ProductFeaturesSchema = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      rating: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
  integrations: z.array(z.string()),
  bestFor: z.array(z.string()),
});

const ProductReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      rating: z.string(),
      title: z.string(),
      reviewer: z.string().nullable(),
      role: z.string().nullable(),
      companySize: z.string().nullable(),
      date: z.string(),
      likes: z.string(),
      dislikes: z.string(),
      switchedFrom: z.string().nullable(),
    })
  ),
});

const ComparisonGridSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      rating: z.string(),
      reviewCount: z.string(),
      features: z.array(z.string()),
    })
  ),
  leader: z.string().nullable(),
});

interface SoftwareComparison {
  product1: z.infer<typeof ProductOverviewSchema>;
  product2: z.infer<typeof ProductOverviewSchema>;
  comparison: {
    winner: string;
    ratingDiff: number;
    keyDifferences: string[];
  };
}

async function getProductDetails(productSlug: string): Promise<{
  overview: z.infer<typeof ProductOverviewSchema>;
  features: z.infer<typeof ProductFeaturesSchema>;
  reviews: z.infer<typeof ProductReviewsSchema>;
}> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📊 Getting G2 data for: ${productSlug}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.g2.com/products/${productSlug}/reviews`);
    await page.waitForTimeout(3000);

    // Handle cookie consent
    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    // Extract overview
    console.log("  📋 Extracting product overview...");
    const overview = await page.extract(
      "Extract product overview: name, category, overall rating, total reviews, description, vendor name, pricing info, free trial availability, detailed ratings (ease of use, support quality, setup ease, admin ease), user satisfaction score, and market presence",
      ProductOverviewSchema
    );

    // Navigate to features
    console.log("  ✨ Extracting features...");
    await page.aiAction("scroll down to features section or click features tab");
    await page.waitForTimeout(1500);

    const features = await page.extract(
      "Extract features with name, rating, and description. Also extract integrations list and best-for use cases",
      ProductFeaturesSchema
    );

    // Get reviews
    console.log("  ⭐ Extracting reviews...");
    await page.aiAction("scroll to reviews section");
    await page.waitForTimeout(1500);

    const reviews = await page.extract(
      "Extract reviews with rating, title, reviewer name, role, company size, date, what they like, what they dislike, and what product they switched from if mentioned",
      ProductReviewsSchema
    );

    // Display
    console.log("\n" + "=".repeat(60));
    console.log(`G2 ANALYSIS - ${overview.name}`);
    console.log("=".repeat(60));

    console.log(`\n📊 OVERVIEW`);
    console.log(`   Rating: ${overview.overallRating} ⭐ (${overview.totalReviews} reviews)`);
    console.log(`   Category: ${overview.category}`);
    console.log(`   Vendor: ${overview.vendorName || "N/A"}`);
    console.log(`   Pricing: ${overview.pricing || "Contact for pricing"}`);
    console.log(`   Free Trial: ${overview.freeTrialAvailable ? "Yes ✓" : "No"}`);

    console.log(`\n⭐ DETAILED RATINGS`);
    console.log(`   Ease of Use: ${overview.ratings.easeOfUse || "N/A"}`);
    console.log(`   Quality of Support: ${overview.ratings.qualityOfSupport || "N/A"}`);
    console.log(`   Ease of Setup: ${overview.ratings.easeOfSetup || "N/A"}`);
    console.log(`   Ease of Admin: ${overview.ratings.easeOfAdmin || "N/A"}`);

    if (features.features.length > 0) {
      console.log(`\n✨ TOP FEATURES`);
      features.features.slice(0, 8).forEach((f) => {
        console.log(`   • ${f.name}${f.rating ? ` (${f.rating})` : ""}`);
      });
    }

    if (features.integrations.length > 0) {
      console.log(`\n🔌 INTEGRATIONS`);
      console.log(`   ${features.integrations.slice(0, 10).join(", ")}`);
    }

    console.log(`\n💬 RECENT REVIEWS`);
    reviews.reviews.slice(0, 3).forEach((review, i) => {
      console.log(`\n   ${i + 1}. ${"⭐".repeat(parseInt(review.rating))} "${review.title}"`);
      console.log(`      ${review.role || "User"}${review.companySize ? ` at ${review.companySize} company` : ""}`);
      console.log(`      ✅ Likes: ${review.likes.substring(0, 80)}...`);
      console.log(`      ❌ Dislikes: ${review.dislikes.substring(0, 80)}...`);
    });

    return { overview, features, reviews };
  } finally {
    await agent.closeAgent();
  }
}

async function compareProducts(product1Slug: string, product2Slug: string): Promise<SoftwareComparison> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`⚔️ Comparing: ${product1Slug} vs ${product2Slug}\n`);

  try {
    // Get first product
    const page1 = await agent.newPage();
    await page1.goto(`https://www.g2.com/products/${product1Slug}/reviews`);
    await page1.waitForTimeout(3000);

    console.log(`  📊 Analyzing ${product1Slug}...`);
    const product1 = await page1.extract(
      "Extract product name, overall rating, total reviews, description, pricing, and detailed ratings",
      ProductOverviewSchema
    );

    // Get second product
    const page2 = await agent.newPage();
    await page2.goto(`https://www.g2.com/products/${product2Slug}/reviews`);
    await page2.waitForTimeout(3000);

    console.log(`  📊 Analyzing ${product2Slug}...`);
    const product2 = await page2.extract(
      "Extract product name, overall rating, total reviews, description, pricing, and detailed ratings",
      ProductOverviewSchema
    );

    // Compare
    const rating1 = parseFloat(product1.overallRating);
    const rating2 = parseFloat(product2.overallRating);
    const winner = rating1 > rating2 ? product1.name : rating2 > rating1 ? product2.name : "Tie";

    const keyDifferences: string[] = [];

    // Compare specific ratings
    if (product1.ratings.easeOfUse && product2.ratings.easeOfUse) {
      const diff = parseFloat(product1.ratings.easeOfUse) - parseFloat(product2.ratings.easeOfUse);
      if (Math.abs(diff) > 0.3) {
        keyDifferences.push(`Ease of Use: ${diff > 0 ? product1.name : product2.name} leads`);
      }
    }

    if (product1.ratings.qualityOfSupport && product2.ratings.qualityOfSupport) {
      const diff = parseFloat(product1.ratings.qualityOfSupport) - parseFloat(product2.ratings.qualityOfSupport);
      if (Math.abs(diff) > 0.3) {
        keyDifferences.push(`Support Quality: ${diff > 0 ? product1.name : product2.name} leads`);
      }
    }

    // Pricing comparison
    if (product1.freeTrialAvailable !== product2.freeTrialAvailable) {
      const trialProduct = product1.freeTrialAvailable ? product1.name : product2.name;
      keyDifferences.push(`Free Trial: ${trialProduct} offers free trial`);
    }

    // Display comparison
    console.log("\n" + "=".repeat(70));
    console.log("SOFTWARE COMPARISON");
    console.log("=".repeat(70));

    console.log(`\n${"".padEnd(20)} | ${product1.name.padEnd(20)} | ${product2.name.padEnd(20)}`);
    console.log("-".repeat(70));
    console.log(`${"Overall Rating".padEnd(20)} | ${(product1.overallRating + " ⭐").padEnd(20)} | ${(product2.overallRating + " ⭐").padEnd(20)}`);
    console.log(`${"Total Reviews".padEnd(20)} | ${product1.totalReviews.padEnd(20)} | ${product2.totalReviews.padEnd(20)}`);
    console.log(`${"Ease of Use".padEnd(20)} | ${(product1.ratings.easeOfUse || "N/A").padEnd(20)} | ${(product2.ratings.easeOfUse || "N/A").padEnd(20)}`);
    console.log(`${"Support Quality".padEnd(20)} | ${(product1.ratings.qualityOfSupport || "N/A").padEnd(20)} | ${(product2.ratings.qualityOfSupport || "N/A").padEnd(20)}`);
    console.log(`${"Free Trial".padEnd(20)} | ${(product1.freeTrialAvailable ? "Yes ✓" : "No").padEnd(20)} | ${(product2.freeTrialAvailable ? "Yes ✓" : "No").padEnd(20)}`);

    console.log(`\n🏆 WINNER: ${winner}`);

    if (keyDifferences.length > 0) {
      console.log(`\n📊 KEY DIFFERENCES`);
      keyDifferences.forEach((diff) => console.log(`   • ${diff}`));
    }

    return {
      product1,
      product2,
      comparison: {
        winner,
        ratingDiff: Math.abs(rating1 - rating2),
        keyDifferences,
      },
    };
  } finally {
    await agent.closeAgent();
  }
}

async function getCategoryLeaders(category: string): Promise<z.infer<typeof ComparisonGridSchema>> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🏆 Getting leaders in: ${category}\n`);

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.g2.com/categories/${category}`);
    await page.waitForTimeout(3000);

    await page.aiAction("accept cookies if popup appears");
    await page.waitForTimeout(1000);

    const grid = await page.extract(
      "Extract the top products in this category with name, rating, review count, and key features. Also identify the category leader if shown",
      ComparisonGridSchema
    );

    console.log("=".repeat(60));
    console.log(`G2 CATEGORY LEADERS - ${category.toUpperCase()}`);
    console.log("=".repeat(60));

    if (grid.leader) {
      console.log(`\n🏆 Category Leader: ${grid.leader}`);
    }

    console.log(`\n📊 TOP PRODUCTS`);
    grid.products.slice(0, 10).forEach((product, i) => {
      console.log(`\n   ${i + 1}. ${product.name}`);
      console.log(`      Rating: ${product.rating} ⭐ (${product.reviewCount} reviews)`);
      if (product.features.length > 0) {
        console.log(`      Features: ${product.features.slice(0, 3).join(", ")}`);
      }
    });

    return grid;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Get product details
getProductDetails("slack");

// Example: Compare two products
// compareProducts("slack", "microsoft-teams");

// Example: Get category leaders
// getCategoryLeaders("project-management-software");

