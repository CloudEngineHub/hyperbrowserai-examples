/**
 * Template: Hacker News API Server
 * Category: API Servers
 * Use Case: Express server that proxies Hacker News posts and comments
 * Target Site: news.ycombinator.com
 */

import express, { Request, Response } from "express";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3001;

const HNPostSchema = z.object({
  posts: z.array(
    z.object({
      title: z.string(),
      url: z.string().nullable(),
      points: z.string(),
      author: z.string(),
      comments: z.string(),
      timeAgo: z.string(),
    })
  ),
});
// GET /api/hn/top - Get top stories
app.get("/api/hn/top", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 30;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://news.ycombinator.com");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract the top ${limit} posts with title, URL, points, author, comment count, and time posted`,
      HNPostSchema
    );

    res.json({ success: true, data: result.posts.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/hn/new - Get newest stories
app.get("/api/hn/new", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 30;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://news.ycombinator.com/newest");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract the newest ${limit} posts with title, URL, points, author, comment count, and time posted`,
      HNPostSchema
    );

    res.json({ success: true, data: result.posts.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/hn/ask - Get Ask HN stories
app.get("/api/hn/ask", async (req: Request, res: Response) => {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://news.ycombinator.com/ask");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract Ask HN posts with title, points, author, comment count, and time posted",
      HNPostSchema
    );

    res.json({ success: true, data: result.posts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/hn/show - Get Show HN stories
app.get("/api/hn/show", async (req: Request, res: Response) => {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://news.ycombinator.com/show");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract Show HN posts with title, URL, points, author, comment count, and time posted",
      HNPostSchema
    );

    res.json({ success: true, data: result.posts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

app.listen(PORT, () => {
  console.log(`Hacker News API server running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET /api/hn/top?limit=30  - Top stories");
  console.log("  GET /api/hn/new?limit=30  - Newest stories");
  console.log("  GET /api/hn/ask           - Ask HN");
  console.log("  GET /api/hn/show          - Show HN");
});

