import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Hyperbrowser } from "@hyperbrowser/sdk"

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

// Initialize Hyperbrowser client
const hyperbrowser = process.env.HYPERBROWSER_API_KEY ? new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
}) : null

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { recipient, age, interests, vibe, budget } = body

    console.log("Gift research request:", { recipient, age, interests, vibe, budget })
    console.time("⏱️ Total research time")

    if (!process.env.ANTHROPIC_API_KEY) {
       return NextResponse.json({ error: "Anthropic API key is missing. Please add ANTHROPIC_API_KEY to your .env.local file." }, { status: 500 })
    }

    if (!process.env.HYPERBROWSER_API_KEY) {
       console.warn("Hyperbrowser API key is missing. Will use Claude's knowledge only.")
    }

    // 1. Construct Search Queries
    const baseQuery = `best gift ideas for ${age ? age + " year old " : ""}${recipient} who likes ${interests} ${vibe ? vibe + " style" : ""} ${budget ? "budget " + budget : ""}`
    const redditQuery = `${baseQuery} site:reddit.com`
    const amazonQuery = `${interests} gift ${budget || ""}`
    
    console.log("Search query:", baseQuery)

    let scrapedData = ""
    
    // 2. Scrape with Hyperbrowser if available (optimized for speed)
    if (hyperbrowser) {
      try {
        // Use direct Reddit search instead of Google (faster and lighter)
        const redditSearchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(baseQuery + " gift recommendations")}&type=link&sort=relevance`
        
        console.log("Scraping Reddit with Hyperbrowser SDK:", redditSearchUrl)
        console.time("hyperbrowser-scrape")
        
        // Single, faster scrape instead of multiple
        const redditData = await scrapeUrl(redditSearchUrl)
        
        console.timeEnd("hyperbrowser-scrape")

        if (redditData) {
          scrapedData += "=== Reddit Gift Discussions ===\n" + redditData.substring(0, 10000)
          console.log("✓ Successfully scraped Reddit data, length:", scrapedData.length)
        } else {
          console.log("⚠ Scraping returned no data, will use Claude's knowledge only")
        }
      } catch (scrapeError) {
        console.error("⚠ Scraping failed, falling back to Claude's knowledge:", scrapeError)
      }
    } else {
      console.log("⚠ Hyperbrowser not configured, using Claude's knowledge only")
    }

    // 3. Analyze with Claude
    const prompt = `You are an expert gift researcher specializing in HIGHLY PERSONALIZED gift recommendations. I need exactly 6 specific, deeply relevant gift recommendations for this person.

RECIPIENT DETAILS:
- Who: ${recipient}
${age ? `- Age: ${age}` : ''}
- Interests: ${interests}
${vibe ? `- Vibe: ${vibe}` : ''}
- Budget: ${budget}

${scrapedData ? `RESEARCH DATA:\n${scrapedData}\n\nUse the above scraped data to find REAL products mentioned in the search results and discussions.` : 'Based on your knowledge, recommend actual products that exist and can be purchased.'}

CRITICAL REQUIREMENTS - PRIORITIZE PERSONALIZATION:
1. **HIGH SPECIFICITY REQUIRED**: Each gift MUST directly relate to their specific interests/hobbies
   - ❌ AVOID generic gifts like: plain wallets, generic notebooks, basic gift cards (unless HIGHLY relevant)
   - ✅ PREFER niche items that show deep understanding of their interests
   
2. **Relevance Scoring**: Rate each gift's specificity internally:
   - 🎯 HIGHLY SPECIFIC (9-10): Directly tied to their unique interests (e.g., specific team merch, hobby equipment)
   - 🎯 MODERATELY SPECIFIC (6-8): Related to their interests but more general
   - ❌ GENERIC (1-5): Could work for anyone - AVOID THESE

3. **Product Specificity**:
   - Include exact product names, brands, and models
   - Mention specific features that match their interests
   - Include BOTH physical AND digital gifts when relevant (video games, subscriptions, digital content, courses, etc.)

4. **Sorting Priority**: Return gifts sorted by RELEVANCE (most specific first, generic last)
   - Position 1-3: Highly personalized, niche items
   - Position 4-5: Good matches but more accessible
   - Position 6: Still relevant but more general

5. **Make it Personal**: Explain WHY each gift matches THEIR SPECIFIC characteristics, not just general interest categories

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "recommendations": [
    {
      "name": "Exact product name with brand",
      "description": "Brief 1-2 sentence description highlighting specific features",
      "price": "Price in format $XX or $XX-$XX",
      "url": "https://www.amazon.com/s?k=EXACT_PRODUCT_NAME_URL_ENCODED",
      "reason": "2-3 sentences explaining why THIS SPECIFIC person would love this gift, referencing their unique characteristics",
      "category": "Physical" or "Digital",
      "relevanceScore": 9 (number 1-10, based on how personalized this gift is to their specific interests)
    }
  ]
}

IMPORTANT: Sort the array by relevanceScore (highest first). Include scores:
- 9-10: Perfectly tailored to their specific interests
- 7-8: Strong match with their interests  
- 5-6: General match (try to avoid these)

Make sure the Amazon search URLs are properly formatted with the actual product name URL-encoded.`

    console.log("Sending request to Claude...")
    console.time("claude-api")

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    console.timeEnd("claude-api")
    
    // Parse JSON from Claude
    const text = (msg.content[0] as any).text
    console.log("Claude response length:", text.length)
    
    // Extract JSON (handle markdown code blocks)
    let jsonStr = text.trim()
    if (jsonStr.startsWith("```")) {
      const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      jsonStr = jsonMatch ? jsonMatch[1] : jsonStr
    }
    // Try to find JSON object if not wrapped
    const jsonMatch = jsonStr.match(/\{[\s\S]*"recommendations"[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }
    
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse Claude response:", text.substring(0, 500));
      return NextResponse.json({ 
        error: "Failed to parse recommendations. Please try again.",
        debug: text.substring(0, 200)
      }, { status: 500 });
    }

    if (!data.recommendations || !Array.isArray(data.recommendations)) {
      console.error("Invalid response format from Claude:", data);
      return NextResponse.json({ 
        error: "Invalid response format from AI",
        debug: JSON.stringify(data).substring(0, 200)
      }, { status: 500 });
    }

    // Enhance recommendations with proper URLs and sort by relevance
    const enhancedRecs = data.recommendations
      .map((rec: any) => ({
        ...rec,
        url: rec.url || `https://www.amazon.com/s?k=${encodeURIComponent(rec.name)}`,
        relevanceScore: rec.relevanceScore || 5, // Default to moderate relevance if missing
      }))
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) // Sort by relevance (highest first)

    console.log("Returning", enhancedRecs.length, "recommendations sorted by relevance")
    console.timeEnd("⏱️ Total research time")

    return NextResponse.json({ recommendations: enhancedRecs })

  } catch (error: any) {
    console.error("Research error:", error)
    return NextResponse.json({ 
      error: "Failed to research gifts: " + (error.message || "Unknown error"),
      details: error.toString()
    }, { status: 500 })
  }
}

async function scrapeUrl(url: string): Promise<string> {
  if (!hyperbrowser) {
    return ""
  }

  try {
    console.log("Scraping with Hyperbrowser SDK:", url)
    
    // Add aggressive timeout to prevent hanging (10 seconds max for speed)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Scrape timeout after 10s")), 10000)
    )
    
    // Use official SDK method with timeout
    const scrapeResult: any = await Promise.race([
      hyperbrowser.scrape.startAndWait({
        url: url,
      }),
      timeoutPromise
    ])
    
    console.log("Hyperbrowser scrape completed for:", url)
    
    // Extract text content from the scrape result
    // The SDK returns structured data - try different possible formats
    return scrapeResult.data?.markdown || scrapeResult.data?.text || scrapeResult.data?.content || JSON.stringify(scrapeResult.data || scrapeResult).substring(0, 5000)
  } catch (e: any) {
    console.error("Scrape failed for", url, ":", e.message)
    return ""
  }
}

