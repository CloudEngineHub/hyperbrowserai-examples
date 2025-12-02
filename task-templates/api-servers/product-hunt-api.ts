/**
 * Template: Product Hunt API Server
 * Category: API Servers
 * Use Case: Extract daily/weekly top products from Product Hunt
 * Target Site: producthunt.com
 */

import express, { Request, Response } from "express";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import { videoSessionConfig } from "../utils/video-recording";

config();

const app = express();
const PORT = process.env.PORT || 3001;

const ProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      tagline: z.string(),
      description: z.string().nullable(),
      votes: z.string(),
      url: z.string(),
      topics: z.array(z.string()),
    })
  ),
});

const ProductDetailSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  votes: z.string(),
  maker: z.string().nullable(),
  website: z.string().nullable(),
  topics: z.array(z.string()),
  features: z.array(z.string()),
});

// GET /api/ph/today - Get today's products
app.get("/api/ph/today", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://www.producthunt.com");

    // Scroll to load more products
    await page.aiAction("scroll down to load more products");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract up to ${limit} products with name, tagline, description, vote count, product URL, and topics/categories`,
      ProductSchema
    );

    res.json({
      success: true,
      date: new Date().toISOString().split("T")[0],
      data: result.products.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/ph/weekly - Get this week's top products
app.get("/api/ph/weekly", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://www.producthunt.com/");
    await await page.aiAction("scroll to Last Week's Top Products section");

    await page.aiAction("click See all of last week's top products");

    const result = await page.extract(
      `Extract the top ${limit} products from this week's leaderboard with name, tagline, vote count, URL, and topics`,
      ProductSchema
    );

    res.json({
      success: true,
      period: "weekly",
      data: result.products.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/ph/monthly - Get this month's top products
app.get("/api/ph/monthly", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
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
    await page.goto("https://www.producthunt.com", {
      waitUntil: "domcontentloaded",
    });
    await await page.aiAction("scroll to Last Month's Top Products section");

    await page.aiAction("click See all of last month's top products");

    const result = await page.extract(
      `Extract the top ${limit} products from this month with name, tagline, vote count, URL, and topics`,
      ProductSchema
    );

    res.json({
      success: true,
      period: "monthly",
      data: result.products.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/ph/categories/:category - Get products by topic
app.get("/api/ph/categories/:category", async (req: Request, res: Response) => {
  const { category } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.producthunt.com/categories/${category}`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      `Extract up to ${limit} products in this topic with name, tagline, vote count, URL, and topics`,
      ProductSchema
    );

    res.json({
      success: true,
      category,
      data: result.products.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/ph/product/:slug - Get product details
app.get("/api/ph/products/:detail", async (req: Request, res: Response) => {
  const { detail } = req.params;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.producthunt.com/posts/${detail}`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract product name, tagline, full description, vote count, maker name, website URL, topics, and key features",
      ProductDetailSchema
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

app.listen(PORT, () => {
  console.log(`Product Hunt API server running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET /api/ph/today?limit=20           - Today's products");
  console.log(
    "  GET /api/ph/weekly?limit=20          - This week's top products"
  );
  console.log(
    "  GET /api/ph/monthly?limit=20         - This month's top products"
  );
  console.log(
    "  GET /api/ph/categories/:category?limit=20   - Products by category"
  );
  console.log("  GET /api/ph/products/:detail            - Product details");
});
