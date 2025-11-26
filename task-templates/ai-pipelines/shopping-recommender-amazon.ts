/**
 * Template: Amazon Shopping Recommender
 * Category: AI Pipelines
 * Use Case: Search Amazon, extract results, use OpenAI to recommend best products
 * Target Site: amazon.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "dotenv";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.string(),
      rating: z.string(),
      reviewCount: z.string(),
      isPrime: z.boolean(),
      features: z.array(z.string()),
    })
  ),
});

interface UserPreferences {
  searchQuery: string;
  budget?: number;
  prioritizePrime?: boolean;
  mustHaveFeatures?: string[];
  useCase?: string;
}

async function extractAmazonProducts(
  agent: HyperAgent,
  searchQuery: string,
  limit: number = 10
) {
  const page = await agent.newPage();

  await page.goto("https://www.amazon.com");
  await page.waitForTimeout(2000);

  await page.aiAction(`type "${searchQuery}" in the search box`);
  await page.aiAction("click the search button");
  await page.waitForTimeout(3000);

  // Scroll to load more products
  await page.waitForTimeout(2000);

  const result = await page.extract(
    `Extract up to ${limit} products with name, price, rating, review count, Prime eligibility, and key features/bullet points`,
    ProductSchema
  );

  return result.products;
}

async function getAIRecommendation(
  products: any[],
  preferences: UserPreferences
) {
  const prompt = `You are a shopping assistant. Based on the user's preferences and the available products, recommend the best options.

USER PREFERENCES:
- Search: ${preferences.searchQuery}
${preferences.budget ? `- Budget: $${preferences.budget}` : ""}
${preferences.prioritizePrime ? "- Prefers Prime shipping" : ""}
${
  preferences.mustHaveFeatures?.length
    ? `- Must have: ${preferences.mustHaveFeatures.join(", ")}`
    : ""
}
${preferences.useCase ? `- Use case: ${preferences.useCase}` : ""}

AVAILABLE PRODUCTS:
${JSON.stringify(products, null, 2)}

Please analyze these products and provide:
1. TOP RECOMMENDATION: The single best product for this user and why
2. BUDGET PICK: Best value option if different from top pick
3. PREMIUM PICK: Best quality option if budget allows
4. PRODUCTS TO AVOID: Any products with red flags (low ratings, missing features, etc.)

Be specific about why each recommendation fits the user's needs.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function amazonShoppingRecommender(preferences: UserPreferences) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  console.log(`\n🔍 Searching Amazon for: "${preferences.searchQuery}"...\n`);

  try {
    // Step 1: Extract products from Amazon
    const products = await extractAmazonProducts(
      agent,
      preferences.searchQuery,
      15
    );
    console.log(`✅ Found ${products.length} products\n`);

    // Step 2: Get AI recommendations
    console.log("🤖 Analyzing products with AI...\n");
    const recommendation = await getAIRecommendation(products, preferences);

    console.log("=".repeat(60));
    console.log("AI SHOPPING RECOMMENDATIONS");
    console.log("=".repeat(60));
    console.log(recommendation);
    console.log("=".repeat(60));

    return { products, recommendation };
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
const userPreferences: UserPreferences = {
  searchQuery: "wireless noise canceling headphones",
  budget: 200,
  prioritizePrime: true,
  mustHaveFeatures: ["Bluetooth 5.0", "30+ hour battery"],
  useCase: "Working from home with video calls",
};

amazonShoppingRecommender(userPreferences);
