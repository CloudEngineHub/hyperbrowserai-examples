/**
 * Template: Docs Intelligence Analyzer
 * Category: Research
 * Use Case: Crawl documentation portals and auto-tag by feature, API, complexity
 * Target Sites: GitHub repos, documentation sites (Mintlify example)
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const GitHubRepoSchema = z.object({
  name: z.string(),
  description: z.string(),
  language: z.string().nullable(),
  stars: z.string(),
  forks: z.string(),
  mainTopics: z.array(z.string()),
  readmeHighlights: z.array(z.string()),
});

const DocsPageSchema = z.object({
  pages: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      category: z.string().nullable(),
      description: z.string(),
      topics: z.array(z.string()),
    })
  ),
});

interface TaggedDocPage {
  title: string;
  url: string;
  category: string;
  description: string;
  tags: {
    feature: string[];
    api: string[];
    complexity: "beginner" | "intermediate" | "advanced";
    topics: string[];
  };
}

interface DocsIntelligence {
  source: string;
  totalPages: number;
  pages: TaggedDocPage[];
  summary: {
    featureTags: Map<string, number>;
    apiTags: Map<string, number>;
    complexityDistribution: { beginner: number; intermediate: number; advanced: number };
  };
}

async function analyzeGitHubRepo(
  agent: HyperAgent,
  repoUrl: string
): Promise<z.infer<typeof GitHubRepoSchema>> {
  console.log(`  📂 Analyzing GitHub repository: ${repoUrl}\n`);

  const page = await agent.newPage();

  try {
    await page.goto(repoUrl);
    await page.waitForTimeout(3000);

    // Scroll to load README
    await page.aiAction("scroll down to view the full README");
    await page.waitForTimeout(2000);

    const repoData = await page.extract(
      "Extract repository name, description, primary language, star count, fork count, main topics/tags, and key highlights from README (features, installation, usage)",
      GitHubRepoSchema
    );

    console.log(`     ✓ Analyzed: ${repoData.name}\n`);
    return repoData;
  } catch (error) {
    console.error("Error analyzing GitHub repo:", error);
    return {
      name: "",
      description: "",
      language: null,
      stars: "0",
      forks: "0",
      mainTopics: [],
      readmeHighlights: [],
    };
  }
}

async function crawlDocsSite(
  agent: HyperAgent,
  docsUrl: string
): Promise<z.infer<typeof DocsPageSchema>> {
  console.log(`  📚 Crawling documentation site: ${docsUrl}\n`);

  const page = await agent.newPage();

  try {
    await page.goto(docsUrl);
    await page.waitForTimeout(3000);

    // Look for navigation/sidebar
    await page.aiAction("scroll to view full navigation menu or sidebar");
    await page.waitForTimeout(1500);

    const docsData = await page.extract(
      "Extract all documentation pages from navigation with title, URL, category/section, brief description, and relevant topics",
      DocsPageSchema
    );

    console.log(`     ✓ Found ${docsData.pages.length} documentation pages\n`);
    return docsData;
  } catch (error) {
    console.error("Error crawling docs site:", error);
    return { pages: [] };
  }
}

function autoTagDocPages(pages: z.infer<typeof DocsPageSchema>["pages"]): TaggedDocPage[] {
  const featureKeywords = ["authentication", "payment", "api", "webhook", "integration", "dashboard", "analytics", "search", "notification"];
  const apiKeywords = ["api", "endpoint", "rest", "graphql", "sdk", "client", "request", "response"];
  const beginnerKeywords = ["quickstart", "getting started", "introduction", "basics", "tutorial", "guide"];
  const advancedKeywords = ["advanced", "optimization", "custom", "architecture", "internals", "deep dive"];

  return pages.map((page) => {
    const searchText = `${page.title} ${page.description} ${page.category || ""}`.toLowerCase();

    // Extract feature tags
    const featureTags = featureKeywords.filter((keyword) => searchText.includes(keyword));

    // Extract API tags
    const apiTags = apiKeywords.filter((keyword) => searchText.includes(keyword));

    // Determine complexity
    let complexity: "beginner" | "intermediate" | "advanced" = "intermediate";
    if (beginnerKeywords.some((keyword) => searchText.includes(keyword))) {
      complexity = "beginner";
    } else if (advancedKeywords.some((keyword) => searchText.includes(keyword))) {
      complexity = "advanced";
    }

    return {
      title: page.title,
      url: page.url,
      category: page.category || "General",
      description: page.description,
      tags: {
        feature: featureTags,
        api: apiTags,
        complexity,
        topics: page.topics,
      },
    };
  });
}

function generateDocsSummary(pages: TaggedDocPage[]): DocsIntelligence["summary"] {
  const featureTags = new Map<string, number>();
  const apiTags = new Map<string, number>();
  const complexityDistribution = { beginner: 0, intermediate: 0, advanced: 0 };

  pages.forEach((page) => {
    // Count feature tags
    page.tags.feature.forEach((tag) => {
      featureTags.set(tag, (featureTags.get(tag) || 0) + 1);
    });

    // Count API tags
    page.tags.api.forEach((tag) => {
      apiTags.set(tag, (apiTags.get(tag) || 0) + 1);
    });

    // Count complexity
    complexityDistribution[page.tags.complexity]++;
  });

  return { featureTags, apiTags, complexityDistribution };
}

async function analyzeDocumentation(config: {
  githubRepo?: string;
  docsUrl?: string;
  source: string;
}) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("📖 Docs Intelligence Analyzer\n");
  console.log("=".repeat(70) + "\n");

  try {
    let pages: z.infer<typeof DocsPageSchema>["pages"] = [];

    // Analyze GitHub repo
    if (config.githubRepo) {
      const repoData = await analyzeGitHubRepo(agent, config.githubRepo);
      
      console.log("📂 GITHUB REPOSITORY ANALYSIS\n");
      console.log(`   Name: ${repoData.name}`);
      console.log(`   Description: ${repoData.description}`);
      console.log(`   Language: ${repoData.language}`);
      console.log(`   Stars: ${repoData.stars} ⭐`);
      console.log(`   Topics: ${repoData.mainTopics.join(", ")}`);
      console.log(`\n   README Highlights:`);
      repoData.readmeHighlights.slice(0, 5).forEach((highlight, i) => {
        console.log(`     ${i + 1}. ${highlight}`);
      });
      console.log("\n");
    }

    // Crawl docs site
    if (config.docsUrl) {
      const docsData = await crawlDocsSite(agent, config.docsUrl);
      pages = docsData.pages;
    }

    // Auto-tag pages
    const taggedPages = autoTagDocPages(pages);

    // Generate summary
    const summary = generateDocsSummary(taggedPages);

    // Display results
    console.log("=".repeat(70));
    console.log("DOCUMENTATION INTELLIGENCE REPORT");
    console.log("=".repeat(70) + "\n");

    console.log(`📊 Total Pages Analyzed: ${taggedPages.length}\n`);

    // Complexity distribution
    console.log("📈 Complexity Distribution:");
    console.log(`   Beginner: ${summary.complexityDistribution.beginner} pages`);
    console.log(`   Intermediate: ${summary.complexityDistribution.intermediate} pages`);
    console.log(`   Advanced: ${summary.complexityDistribution.advanced} pages\n`);

    // Top feature tags
    console.log("🏷️  Top Feature Tags:");
    const sortedFeatures = Array.from(summary.featureTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedFeatures.forEach(([tag, count]) => {
      console.log(`   • ${tag}: ${count} pages`);
    });

    // Top API tags
    console.log("\n🔌 Top API Tags:");
    const sortedApi = Array.from(summary.apiTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedApi.forEach(([tag, count]) => {
      console.log(`   • ${tag}: ${count} pages`);
    });

    // Sample pages by complexity
    console.log("\n📑 Sample Pages by Complexity:\n");

    ["beginner", "intermediate", "advanced"].forEach((complexity) => {
      const samplePages = taggedPages
        .filter((p) => p.tags.complexity === complexity)
        .slice(0, 3);

      if (samplePages.length > 0) {
        console.log(`   ${complexity.toUpperCase()}:`);
        samplePages.forEach((page) => {
          console.log(`     • ${page.title}`);
          console.log(`       ${page.url}`);
          console.log(`       Tags: ${[...page.tags.feature, ...page.tags.api].join(", ") || "None"}`);
        });
        console.log("");
      }
    });

    // Generate Mintlify-style mint.json structure
    console.log("💡 SUGGESTED DOCUMENTATION STRUCTURE (Mintlify format):\n");
    
    const categories = new Map<string, TaggedDocPage[]>();
    taggedPages.forEach((page) => {
      if (!categories.has(page.category)) {
        categories.set(page.category, []);
      }
      categories.get(page.category)!.push(page);
    });

    console.log("```json");
    console.log("{");
    console.log('  "navigation": [');
    
    Array.from(categories.entries()).forEach(([category, pages], i) => {
      console.log(`    {`);
      console.log(`      "group": "${category}",`);
      console.log(`      "pages": [`);
      pages.slice(0, 5).forEach((page, j) => {
        const path = page.url.split("/").pop() || page.title.toLowerCase().replace(/ /g, "-");
        console.log(`        "${path}"${j < pages.slice(0, 5).length - 1 ? "," : ""}`);
      });
      console.log(`      ]`);
      console.log(`    }${i < categories.size - 1 ? "," : ""}`);
    });
    
    console.log("  ]");
    console.log("}");
    console.log("```\n");

    return {
      source: config.source,
      totalPages: taggedPages.length,
      pages: taggedPages,
      summary,
    };
  } finally {
    await agent.closeAgent();
  }
}

// Example: Analyze Stripe documentation
analyzeDocumentation({
  githubRepo: "https://github.com/stripe/stripe-node",
  docsUrl: "https://stripe.com/docs",
  source: "Stripe",
});

// Example: Analyze Supabase documentation
// analyzeDocumentation({
//   githubRepo: "https://github.com/supabase/supabase",
//   docsUrl: "https://supabase.com/docs",
//   source: "Supabase",
// });

// Example: Analyze Mintlify itself
// analyzeDocumentation({
//   githubRepo: "https://github.com/mintlify/starter",
//   docsUrl: "https://mintlify.com/docs",
//   source: "Mintlify",
// });


