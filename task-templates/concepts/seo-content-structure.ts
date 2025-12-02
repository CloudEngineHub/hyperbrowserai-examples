/**
 * Template: SEO Content Structure Analyzer
 * Category: Concepts
 * Use Case: Comprehensive SEO analysis including on-page elements, content structure, and technical SEO factors
 * Target Site: Any web page - demonstrated with MDN Web Docs
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import { z } from "zod";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

// Schema for basic on-page SEO elements
const OnPageSEOSchema = z.object({
  title: z.string().describe("The page title from <title> tag"),
  titleLength: z.number().describe("Character count of the title"),
  metaDescription: z.string().nullable().describe("Meta description content"),
  metaDescriptionLength: z.number().nullable(),
  canonicalUrl: z.string().nullable().describe("Canonical URL if present"),
  ogTitle: z.string().nullable().describe("Open Graph title"),
  ogDescription: z.string().nullable().describe("Open Graph description"),
  ogImage: z.string().nullable().describe("Open Graph image URL"),
});

// Schema for heading hierarchy analysis
const HeadingStructureSchema = z.object({
  h1Count: z.number(),
  h1Texts: z.array(z.string()),
  h2Count: z.number(),
  h2Texts: z.array(z.string()),
  h3Count: z.number(),
  h3Texts: z.array(z.string()),
  hasProperHierarchy: z
    .boolean()
    .describe("True if headings follow proper H1 > H2 > H3 order"),
});

// Schema for content analysis
const ContentAnalysisSchema = z.object({
  wordCount: z.number().describe("Approximate word count of main content"),
  paragraphCount: z.number(),
  imageCount: z.number(),
  imagesWithAlt: z.number().describe("Images that have alt text"),
  imagesWithoutAlt: z.number().describe("Images missing alt text"),
  internalLinkCount: z.number(),
  externalLinkCount: z.number(),
  hasTableOfContents: z.boolean(),
});

// Schema for technical SEO elements
const TechnicalSEOSchema = z.object({
  hasViewportMeta: z.boolean(),
  hasCharsetMeta: z.boolean(),
  hasLanguageAttribute: z.boolean(),
  language: z.string().nullable(),
  hasStructuredData: z.boolean().describe("JSON-LD or microdata present"),
  hasFavicon: z.boolean(),
  hasRobotsMeta: z
    .string()
    .nullable()
    .describe("Robots meta content if present"),
});

// Schema for link quality analysis
const LinkAnalysisSchema = z.object({
  links: z
    .array(
      z.object({
        text: z.string(),
        url: z.string(),
        isInternal: z.boolean(),
        hasNofollow: z.boolean(),
        opensInNewTab: z.boolean(),
      })
    )
    .describe("First 10 links on the page"),
  brokenLinkIndicators: z
    .number()
    .describe("Links that appear broken or empty"),
});

interface SEOReport {
  url: string;
  analyzedAt: string;
  onPageSEO: z.infer<typeof OnPageSEOSchema>;
  headingStructure: z.infer<typeof HeadingStructureSchema>;
  contentAnalysis: z.infer<typeof ContentAnalysisSchema>;
  technicalSEO: z.infer<typeof TechnicalSEOSchema>;
  linkAnalysis: z.infer<typeof LinkAnalysisSchema>;
  score: number;
  recommendations: string[];
}

/**
 * Comprehensive SEO Analysis
 * Extracts all major SEO factors from a page
 */
async function analyzeSEO(url: string): Promise<SEOReport> {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
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

  let sessionId: string | null = null;

  console.log("=".repeat(60));
  console.log("SEO CONTENT STRUCTURE ANALYZER");
  console.log("=".repeat(60));
  console.log(`\n🔍 Analyzing: ${url}\n`);

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(3000);

    // 1. Extract On-Page SEO Elements
    console.log("📝 Extracting on-page SEO elements...");
    const onPageSEO = await page.extract(
      `Extract SEO metadata: 
       - Page title and its character length
       - Meta description and its length
       - Canonical URL
       - Open Graph title, description, and image`,
      OnPageSEOSchema
    );
    console.log(
      `   ✓ Title: "${onPageSEO.title}" (${onPageSEO.titleLength} chars)`
    );
    console.log(
      `   ✓ Meta description: ${onPageSEO.metaDescriptionLength || 0} chars`
    );

    // 2. Analyze Heading Structure
    console.log("\n📊 Analyzing heading structure...");
    const headingStructure = await page.extract(
      `Analyze the heading hierarchy:
       - Count all H1, H2, H3 tags
       - Extract the text of each heading
       - Determine if headings follow proper hierarchy (H1 before H2, H2 before H3)`,
      HeadingStructureSchema
    );
    console.log(`   ✓ H1 tags: ${headingStructure.h1Count}`);
    console.log(`   ✓ H2 tags: ${headingStructure.h2Count}`);
    console.log(`   ✓ H3 tags: ${headingStructure.h3Count}`);
    console.log(
      `   ✓ Proper hierarchy: ${
        headingStructure.hasProperHierarchy ? "Yes" : "No"
      }`
    );

    // 3. Content Analysis
    console.log("\n📄 Analyzing content...");
    const contentAnalysis = await page.extract(
      `Analyze the main content:
       - Approximate word count
       - Number of paragraphs
       - Total images and how many have alt text
       - Count internal vs external links
       - Check if there's a table of contents`,
      ContentAnalysisSchema
    );
    console.log(`   ✓ Word count: ~${contentAnalysis.wordCount}`);
    console.log(
      `   ✓ Images: ${contentAnalysis.imageCount} (${contentAnalysis.imagesWithAlt} with alt text)`
    );
    console.log(`   ✓ Internal links: ${contentAnalysis.internalLinkCount}`);
    console.log(`   ✓ External links: ${contentAnalysis.externalLinkCount}`);

    // 4. Technical SEO Check
    console.log("\n⚙️  Checking technical SEO...");
    const technicalSEO = await page.extract(
      `Check technical SEO elements:
       - Viewport meta tag present
       - Charset meta tag present
       - HTML lang attribute and its value
       - Structured data (JSON-LD or microdata)
       - Favicon present
       - Robots meta tag content`,
      TechnicalSEOSchema
    );
    console.log(
      `   ✓ Viewport meta: ${technicalSEO.hasViewportMeta ? "Yes" : "No"}`
    );
    console.log(`   ✓ Language: ${technicalSEO.language || "Not specified"}`);
    console.log(
      `   ✓ Structured data: ${technicalSEO.hasStructuredData ? "Yes" : "No"}`
    );

    // 5. Link Analysis
    console.log("\n🔗 Analyzing links...");
    const linkAnalysis = await page.extract(
      `Analyze the first 10 links on the page:
       - Link text and URL
       - Whether it's internal or external
       - Has nofollow attribute
       - Opens in new tab
       Also count any links that appear broken (empty href, javascript:void, etc.)`,
      LinkAnalysisSchema
    );
    console.log(`   ✓ Analyzed ${linkAnalysis.links.length} links`);
    console.log(
      `   ✓ Potential broken links: ${linkAnalysis.brokenLinkIndicators}`
    );

    // Calculate SEO Score and Generate Recommendations
    const { score, recommendations } = calculateSEOScore({
      onPageSEO,
      headingStructure,
      contentAnalysis,
      technicalSEO,
      linkAnalysis,
    });

    const report: SEOReport = {
      url,
      analyzedAt: new Date().toISOString(),
      onPageSEO,
      headingStructure,
      contentAnalysis,
      technicalSEO,
      linkAnalysis,
      score,
      recommendations,
    };

    // Print Summary
    console.log("\n" + "=".repeat(60));
    console.log("📈 SEO SCORE:", score, "/ 100");
    console.log("=".repeat(60));

    if (recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    } else {
      console.log("\n✨ Great job! No major SEO issues found.");
    }

    console.log("\n📋 Full Report:");
    console.log(JSON.stringify(report, null, 2));

    return report;
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "concepts",
    //     "seo-content-structure"
    //   );
    // }
  }
}

/**
 * Calculate SEO score and generate recommendations
 */
function calculateSEOScore(data: {
  onPageSEO: z.infer<typeof OnPageSEOSchema>;
  headingStructure: z.infer<typeof HeadingStructureSchema>;
  contentAnalysis: z.infer<typeof ContentAnalysisSchema>;
  technicalSEO: z.infer<typeof TechnicalSEOSchema>;
  linkAnalysis: z.infer<typeof LinkAnalysisSchema>;
}): { score: number; recommendations: string[] } {
  let score = 0;
  const recommendations: string[] = [];

  // Title checks (20 points)
  if (data.onPageSEO.title) {
    score += 10;
    if (data.onPageSEO.titleLength >= 30 && data.onPageSEO.titleLength <= 60) {
      score += 10;
    } else {
      recommendations.push(
        `Title length (${data.onPageSEO.titleLength}) should be between 30-60 characters`
      );
    }
  } else {
    recommendations.push("Add a descriptive page title");
  }

  // Meta description (15 points)
  if (data.onPageSEO.metaDescription) {
    score += 7;
    if (
      data.onPageSEO.metaDescriptionLength &&
      data.onPageSEO.metaDescriptionLength >= 120 &&
      data.onPageSEO.metaDescriptionLength <= 160
    ) {
      score += 8;
    } else {
      recommendations.push(
        `Meta description length should be 120-160 characters (currently ${data.onPageSEO.metaDescriptionLength})`
      );
    }
  } else {
    recommendations.push(
      "Add a meta description to improve click-through rates"
    );
  }

  // Heading structure (20 points)
  if (data.headingStructure.h1Count === 1) {
    score += 10;
  } else if (data.headingStructure.h1Count === 0) {
    recommendations.push("Add exactly one H1 tag to the page");
  } else {
    recommendations.push(
      `Use only one H1 tag (currently ${data.headingStructure.h1Count})`
    );
    score += 5;
  }

  if (data.headingStructure.hasProperHierarchy) {
    score += 10;
  } else {
    recommendations.push(
      "Ensure headings follow proper hierarchy (H1 > H2 > H3)"
    );
  }

  // Content quality (15 points)
  if (data.contentAnalysis.wordCount >= 300) {
    score += 10;
  } else {
    recommendations.push(
      `Content is thin (${data.contentAnalysis.wordCount} words). Aim for at least 300 words.`
    );
  }

  if (
    data.contentAnalysis.imageCount > 0 &&
    data.contentAnalysis.imagesWithoutAlt === 0
  ) {
    score += 5;
  } else if (data.contentAnalysis.imagesWithoutAlt > 0) {
    recommendations.push(
      `Add alt text to ${data.contentAnalysis.imagesWithoutAlt} images`
    );
  }

  // Technical SEO (20 points)
  if (data.technicalSEO.hasViewportMeta) score += 5;
  else recommendations.push("Add viewport meta tag for mobile responsiveness");

  if (data.technicalSEO.hasLanguageAttribute) score += 5;
  else recommendations.push("Add lang attribute to HTML tag");

  if (data.technicalSEO.hasStructuredData) score += 5;
  else
    recommendations.push(
      "Consider adding structured data (JSON-LD) for rich snippets"
    );

  if (data.technicalSEO.hasFavicon) score += 5;
  else recommendations.push("Add a favicon");

  // Open Graph (10 points)
  if (
    data.onPageSEO.ogTitle &&
    data.onPageSEO.ogDescription &&
    data.onPageSEO.ogImage
  ) {
    score += 10;
  } else {
    recommendations.push("Add Open Graph meta tags for better social sharing");
  }

  return { score: Math.min(score, 100), recommendations };
}

/**
 * Compare SEO of multiple pages
 */
async function compareSEO(urls: string[]): Promise<void> {
  console.log("\n📊 COMPARING SEO ACROSS MULTIPLE PAGES\n");

  const reports: SEOReport[] = [];

  for (const url of urls) {
    try {
      const report = await analyzeSEO(url);
      reports.push(report);
    } catch (error) {
      console.error(`Failed to analyze ${url}:`, error);
    }
  }

  // Summary comparison
  console.log("\n" + "=".repeat(60));
  console.log("COMPARISON SUMMARY");
  console.log("=".repeat(60));

  reports.forEach((report) => {
    console.log(`\n${report.url}`);
    console.log(`  Score: ${report.score}/100`);
    console.log(`  Title: ${report.onPageSEO.title.substring(0, 50)}...`);
    console.log(`  Words: ${report.contentAnalysis.wordCount}`);
    console.log(`  Issues: ${report.recommendations.length}`);
  });
}

// Run the analysis
analyzeSEO(
  "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML"
);
