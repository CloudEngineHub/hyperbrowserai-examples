/**
 * Template: News Sentiment Aggregator
 * Category: AI Pipelines
 * Use Case: Scrape news headlines from multiple sources, analyze sentiment with OpenAI
 * Target Sites: Multiple news sources
 */

import { HyperAgent } from "@hyperbrowser/agent";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "dotenv";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HeadlinesSchema = z.object({
  headlines: z.array(
    z.object({
      title: z.string(),
      source: z.string(),
      summary: z.string().nullable(),
      category: z.string().nullable(),
      timestamp: z.string().nullable(),
    })
  ),
});

interface NewsSource {
  name: string;
  url: string;
}

const NEWS_SOURCES: NewsSource[] = [
  { name: "Reuters", url: "https://www.reuters.com" },
  { name: "AP News", url: "https://apnews.com" },
  { name: "BBC", url: "https://www.bbc.com/news" },
];

async function extractHeadlines(
  agent: HyperAgent,
  source: NewsSource
): Promise<any[]> {
  const page = await agent.newPage();

  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract the top 10 news headlines with title, source name, summary/snippet if available, category/section, and timestamp",
      HeadlinesSchema
    );

    return result.headlines.map((h) => ({
      ...h,
      source: source.name,
    }));
  } catch (error) {
    console.error(`Error extracting from ${source.name}:`, error);
    return [];
  }
}

async function analyzeSentiment(headlines: any[]) {
  const prompt = `Analyze the sentiment and themes of these news headlines from multiple sources.

HEADLINES:
${JSON.stringify(headlines, null, 2)}

Please provide a comprehensive analysis:

1. OVERALL SENTIMENT SCORE:
   Rate from -10 (very negative) to +10 (very positive) with explanation

2. SENTIMENT BREAKDOWN BY SOURCE:
   - Which sources tend more positive/negative?
   - Any notable bias patterns?

3. TOP THEMES:
   - What are the 5 most prominent topics across all headlines?
   - How is each theme being covered (positive/negative/neutral)?

4. NOTABLE STORIES:
   - Most impactful/significant stories
   - Stories with conflicting coverage between sources

5. SENTIMENT BY CATEGORY:
   - Politics
   - Economy/Business
   - Technology
   - World News
   - Other

6. TREND ANALYSIS:
   - What narratives are dominating the news cycle?
   - Any emerging stories to watch?

7. READER ADVISORY:
   - Headlines that may be sensationalized
   - Stories that need more context`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return completion.choices[0].message.content;
}

async function generateBriefing(headlines: any[], sentimentAnalysis: string) {
  const prompt = `Based on these headlines and analysis, create a concise morning news briefing.

HEADLINES:
${JSON.stringify(headlines.slice(0, 15), null, 2)}

SENTIMENT ANALYSIS:
${sentimentAnalysis}

Create a 2-minute read briefing that:
1. Summarizes the top 5 stories everyone should know
2. Highlights one positive/uplifting story
3. Notes any developing situations to watch
4. Ends with a "mood of the news" summary

Keep it professional but accessible.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function newsSentimentAggregator(customSources?: NewsSource[]) {
  const sources = customSources || NEWS_SOURCES;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("📰 News Sentiment Aggregator\n");
  console.log(`Fetching headlines from ${sources.length} sources...\n`);

  try {
    // Step 1: Extract headlines from all sources
    const allHeadlines: any[] = [];

    for (const source of sources) {
      console.log(`  📡 Fetching from ${source.name}...`);
      const headlines = await extractHeadlines(agent, source);
      allHeadlines.push(...headlines);
      console.log(`     Found ${headlines.length} headlines`);
    }

    console.log(`\n✅ Total headlines collected: ${allHeadlines.length}\n`);

    // Step 2: Analyze sentiment
    console.log("🤖 Analyzing sentiment with AI...\n");
    const sentimentAnalysis = await analyzeSentiment(allHeadlines);

    if (!sentimentAnalysis) {
      throw new Error("No sentiment analysis could be generated");
    }

    // Step 3: Generate briefing
    console.log("📝 Generating news briefing...\n");
    const briefing = await generateBriefing(allHeadlines, sentimentAnalysis);

    // Output results
    console.log("=".repeat(60));
    console.log("SENTIMENT ANALYSIS");
    console.log("=".repeat(60));
    console.log(sentimentAnalysis);

    console.log("\n" + "=".repeat(60));
    console.log("MORNING BRIEFING");
    console.log("=".repeat(60));
    console.log(briefing);
    console.log("=".repeat(60));

    return {
      headlines: allHeadlines,
      sentimentAnalysis,
      briefing,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await agent.closeAgent();
  }
}

// Run the aggregator
newsSentimentAggregator();
