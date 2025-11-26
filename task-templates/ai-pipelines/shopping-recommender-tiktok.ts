/**
 * Template: TikTok Shop Recommender
 * Category: AI Pipelines
 * Use Case: Extract TikTok Shop trending items, use OpenAI for recommendations
 * Target Site: tiktok.com/shop
 */

import { HyperAgent } from "@hyperbrowser/agent";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "dotenv";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TikTokProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      originalPrice: z.string().nullable(),
      soldCount: z.string().nullable(),
      rating: z.string().nullable(),
      shopName: z.string().nullable(),
      videoViews: z.string().nullable(),
    })
  ),
});

interface ShoppingCriteria {
  category: string;
  maxPrice?: number;
  minRating?: number;
  preferViral?: boolean;
  giftFor?: string;
}

async function extractTikTokTrending(agent: HyperAgent, category: string) {
  const page = await agent.newPage();

  await page.goto("https://www.tiktok.com/shop");
  await page.waitForTimeout(3000);

  // Search or navigate to category
  await page.aiAction(`search for "${category}" products`);
  await page.waitForTimeout(3000);

  // Sort by popular/trending
  await page.aiAction("sort by best selling or most popular if available");
  await page.waitForTimeout(2000);

  // Scroll to load more
  await page.aiAction("scroll down to load more products");
  await page.waitForTimeout(2000);

  const result = await page.extract(
    "Extract trending products with name, current price, original price (if discounted), sold count, rating, shop name, and video views if shown",
    TikTokProductSchema
  );

  return result.products;
}

async function analyzeTrendsAndRecommend(
  products: any[],
  criteria: ShoppingCriteria
) {
  const prompt = `You are a TikTok shopping trend analyst. Analyze these viral products and make recommendations.

SHOPPING CRITERIA:
- Category: ${criteria.category}
${criteria.maxPrice ? `- Max Price: $${criteria.maxPrice}` : ""}
${criteria.minRating ? `- Min Rating: ${criteria.minRating} stars` : ""}
${criteria.preferViral ? "- Prefers viral/trending items" : ""}
${criteria.giftFor ? `- Looking for gift for: ${criteria.giftFor}` : ""}

TRENDING PRODUCTS:
${JSON.stringify(products, null, 2)}

Please provide:

1. TREND ANALYSIS:
   - What types of products are trending in this category?
   - What price points are most popular?
   - Any patterns in viral products?

2. TOP 3 RECOMMENDATIONS:
   For each, explain:
   - Why it's a good choice
   - Value assessment (is the discount real?)
   - Social proof (sales count, reviews)

3. HIDDEN GEMS:
   Products that might be underrated but worth considering

4. CAUTION FLAGS:
   Products to be careful about (too good to be true, new sellers, etc.)

5. GIFT RECOMMENDATIONS (if applicable):
   Best options if this is for a gift`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function tiktokShopRecommender(criteria: ShoppingCriteria) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  console.log(`\n📱 Searching TikTok Shop for: "${criteria.category}"...\n`);

  try {
    // Step 1: Extract trending products
    const products = await extractTikTokTrending(agent, criteria.category);
    console.log(`✅ Found ${products.length} trending products\n`);

    // Log raw products
    console.log("📊 Raw product data:");
    products.forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} - ${p.price} (${p.soldCount || "N/A"} sold)`
      );
    });
    console.log();

    // Step 2: AI analysis and recommendations
    console.log("🤖 Analyzing trends with AI...\n");
    const analysis = await analyzeTrendsAndRecommend(products, criteria);

    console.log("=".repeat(60));
    console.log("TIKTOK SHOP ANALYSIS & RECOMMENDATIONS");
    console.log("=".repeat(60));
    console.log(analysis);
    console.log("=".repeat(60));

    return { products, analysis };
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
const shoppingCriteria: ShoppingCriteria = {
  category: "skincare",
  maxPrice: 50,
  minRating: 4.0,
  preferViral: true,
  giftFor: "mom",
};

tiktokShopRecommender(shoppingCriteria);
