/**
 * Template: Product Review Analyzer
 * Category: AI Pipelines
 * Use Case: Extract reviews from multiple sites, generate AI summary and insights
 * Target Sites: Amazon, BestBuy, etc.
 */

import { HyperAgent } from "@hyperbrowser/agent";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "dotenv";

// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      rating: z.string(),
      title: z.string(),
      content: z.string(),
    })
  ),
});

const ProductInfoSchema = z.object({
  name: z.string(),
  overallRating: z.string(),
  totalReviews: z.string(),
  ratingBreakdown: z.object({
    fiveStar: z.string(),
    fourStar: z.string(),
    threeStar: z.string(),
    twoStar: z.string(),
    oneStar: z.string(),
  }),
});

interface ReviewSource {
  name: string;
  url: string;
}

async function extractReviewsFromSource(
  agent: HyperAgent,
  source: ReviewSource
) {
  const page = await agent.newPage();

  try {
    await page.goto(source.url);
    await page.waitForTimeout(3000);

    try {
      await page.aiAction("click the continue shopping button");
    } catch {}

    // Get product info
    const productInfo = await page.extract(
      "Extract product name, overall rating, total review count, and rating breakdown (5-star to 1-star percentages)",
      ProductInfoSchema
    );

    // Navigate to reviews section
    await page.aiAction("scroll to 50%");
    await page.waitForTimeout(2000);

    // Extract reviews
    const reviews = await page.extract(
      "Extract up to 20 customer reviews with rating, title, full content",
      ReviewsSchema
    );

    return {
      source: source.name,
      productInfo,
      reviews: reviews.reviews,
    };
  } catch (error) {
    console.error(`Error extracting from ${source.name}:`, error);
    return null;
  }
}

async function analyzeReviews(reviewData: any[]) {
  const allReviews = reviewData.flatMap((d) =>
    d.reviews.map((r: any) => ({ ...r, source: d.source }))
  );

  const prompt = `Analyze these product reviews from multiple sources and provide comprehensive insights.

PRODUCT INFO:
${JSON.stringify(
  reviewData.map((d) => ({ source: d.source, ...d.productInfo })),
  null,
  2
)}

REVIEWS (${allReviews.length} total):
${JSON.stringify(allReviews, null, 2)}

Please provide:

1. EXECUTIVE SUMMARY:
   - Overall verdict (Buy / Consider / Avoid)
   - Confidence score (based on review quality and quantity)
   - One-line summary

2. PROS (What customers love):
   - List top 5 praised features
   - Include specific quotes

3. CONS (Common complaints):
   - List top 5 issues
   - Severity rating for each (Minor / Moderate / Major)

4. RELIABILITY ANALYSIS:
   - Quality of reviews (genuine vs potentially fake)
   - Verified purchase percentage
   - Review recency

5. USER SEGMENTS:
   - Who loves this product?
   - Who should avoid it?
   - Best use cases

6. COMPARISON INSIGHTS:
   - Differences in ratings between sources
   - Any source-specific patterns

7. RED FLAGS:
   - Any concerning patterns
   - Issues that appear consistently

8. RECOMMENDATION:
   - Final verdict with reasoning
   - Alternative suggestions if applicable`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return completion.choices[0].message.content;
}

async function generateQuickSummary(analysis: string) {
  const prompt = `Based on this detailed review analysis, create a quick summary card.

${analysis}

Format as:
📊 QUICK VERDICT
━━━━━━━━━━━━━━━
Rating: [X/5 stars]
Verdict: [Buy/Consider/Avoid]
Best For: [user type]
Avoid If: [condition]

Top 3 Pros:
✅ [pro 1]
✅ [pro 2]
✅ [pro 3]

Top 3 Cons:
⚠️ [con 1]
⚠️ [con 2]
⚠️ [con 3]

Bottom Line: [one sentence]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}

async function productReviewAnalyzer(sources: ReviewSource[]) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },

    // uncomment to run with hyperbrowser provider
    // browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: true,
    //     useProxy: true,
    //     adblock: true,
    //     solveCaptchas: true,
    //     ...videoSessionConfig,
    //   },
    // },
  });

  console.log("🔍 Product Review Analyzer\n");
  console.log(`Analyzing reviews from ${sources.length} sources...\n`);

  let sessionId: string | null = null;

  try {
    // Step 1: Extract reviews from all sources
    const reviewData: any[] = [];

    for (const source of sources) {
      console.log(`  📡 Extracting from ${source.name}...`);
      const data = await extractReviewsFromSource(agent, source);
      if (data) {
        reviewData.push(data);
        console.log(`     Found ${data.reviews.length} reviews`);
      }
    }

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    if (reviewData.length === 0) {
      throw new Error("No reviews could be extracted");
    }

    // Step 2: Analyze with AI
    console.log("\n🤖 Analyzing reviews with AI...\n");
    const analysis = await analyzeReviews(reviewData);

    if (!analysis) {
      throw new Error("No analysis could be generated");
    }

    // Step 3: Generate quick summary
    const quickSummary = await generateQuickSummary(analysis);

    // Output
    console.log(quickSummary);
    console.log("\n" + "=".repeat(60));
    console.log("DETAILED ANALYSIS");
    console.log("=".repeat(60));
    console.log(analysis);

    return {
      sources: reviewData.map((d) => ({
        name: d.source,
        productInfo: d.productInfo,
        reviewCount: d.reviews.length,
      })),
      analysis,
      quickSummary,
    };
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "ai-pipelines", "product-review-analyzer");
    // }
  }
}

// Example: Analyze a product across multiple sites
const productSources: ReviewSource[] = [
  {
    name: "Amazon",
    url: "https://www.amazon.com/dp/B0BSHF7WHW", // Example: Sony WH-1000XM5
  },
  {
    name: "BestBuy",
    url: "https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p",
  },
];

productReviewAnalyzer(productSources);
