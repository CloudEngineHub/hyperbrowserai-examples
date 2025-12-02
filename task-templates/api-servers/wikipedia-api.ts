/**
 * Template: Wikipedia API Server
 * Category: API Servers
 * Use Case: Extract article summaries and structured data from Wikipedia
 * Target Site: wikipedia.org
 */

import express, { Request, Response } from "express";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import { videoSessionConfig } from "../utils/video-recording";

config();

const app = express();
const PORT = process.env.PORT || 3001;

const ArticleSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(z.string()),
  categories: z.array(z.string()),
  lastModified: z.string().nullable(),
});

const ArticleInfoboxSchema = z.object({
  title: z.string(),
  infobox: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
  imageUrl: z.string().nullable(),
});

const SearchResultsSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      snippet: z.string(),
      url: z.string(),
    })
  ),
});

// GET /api/wiki/summary/:title - Get article summary
app.get("/api/wiki/summary/:title", async (req: Request, res: Response) => {
  const { title } = req.params;
  const { lang = "en" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  try {
    const page = await agent.newPage();
    const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
      title
    )}`;
    await page.goto(url);
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract the article title, a comprehensive summary of the first few paragraphs, main section headings, categories, and last modified date",
      ArticleSummarySchema
    );

    res.json({ success: true, language: lang, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/wiki/infobox/:title - Get article infobox data
app.get("/api/wiki/infobox/:title", async (req: Request, res: Response) => {
  const { title } = req.params;
  const { lang = "en" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
    // llm: { provider: "anthropic", model: "claude-sonnet-4-0" },

    browserProvider: "Hyperbrowser",
    hyperbrowserConfig: {
      sessionConfig: {
        useUltraStealth: true,
        useProxy: true,
        adblock: true,
        ...videoSessionConfig,
      },
    },
  });

  try {
    const page = await agent.newPage();
    const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
      title
    )}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const result = await page.extract(
      "Extract the article title, all key-value pairs from the infobox sidebar, and the main image URL if present",
      ArticleInfoboxSchema
    );

    res.json({ success: true, language: lang, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/wiki/search - Search Wikipedia
app.get("/api/wiki/search", async (req: Request, res: Response) => {
  const { q, lang = "en" } = req.query;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!q) {
    return res
      .status(400)
      .json({ success: false, error: "Query parameter 'q' required" });
  }

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    const url = `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(
      q as string
    )}`;
    await page.goto(url);
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract up to ${limit} search results with title, snippet/description, and article URL`,
      SearchResultsSchema
    );

    res.json({
      success: true,
      query: q,
      language: lang,
      data: result.results.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/wiki/random - Get random article
app.get("/api/wiki/random", async (req: Request, res: Response) => {
  const { lang = "en" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://${lang}.wikipedia.org/wiki/Special:Random`);
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract the article title, a summary of the content, main sections, and categories",
      ArticleSummarySchema
    );

    res.json({ success: true, language: lang, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/wiki/today - Get today's featured article
app.get("/api/wiki/today", async (req: Request, res: Response) => {
  const { lang = "en" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://${lang}.wikipedia.org/wiki/Main_Page`);
    await page.waitForTimeout(2000);

    const TodaySchema = z.object({
      featuredArticle: z.object({
        title: z.string(),
        summary: z.string(),
        url: z.string(),
      }),
      onThisDay: z.array(
        z.object({
          year: z.string(),
          event: z.string(),
        })
      ),
      inTheNews: z.array(z.string()),
    });

    const result = await page.extract(
      "Extract today's featured article (title, summary, URL), 'On this day' events with years, and 'In the news' items",
      TodaySchema
    );

    res.json({ success: true, language: lang, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

app.listen(PORT, () => {
  console.log(`Wikipedia API server running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET /api/wiki/summary/:title?lang=en  - Article summary");
  console.log("  GET /api/wiki/infobox/:title?lang=en  - Article infobox data");
  console.log("  GET /api/wiki/search?q=query&lang=en  - Search articles");
  console.log("  GET /api/wiki/random?lang=en          - Random article");
  console.log(
    "  GET /api/wiki/today?lang=en           - Today's featured content"
  );
});
