/**
 * Template: Craigslist API Server
 * Category: API Servers
 * Use Case: Search and retrieve Craigslist listings by category and location
 * Target Site: craigslist.org
 */

import express, { Request, Response } from "express";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3002;

const ListingSchema = z.object({
  listings: z.array(
    z.object({
      title: z.string(),
      price: z.string().nullable(),
      location: z.string().nullable(),
      date: z.string(),
      url: z.string(),
      hasImage: z.boolean(),
    })
  ),
});

// GET /api/craigslist/search - Search listings
app.get("/api/craigslist/search", async (req: Request, res: Response) => {
  const { city = "sfbay", category = "sss", query } = req.query;
  const limit = parseInt(req.query.limit as string) || 25;

  if (!query) {
    return res
      .status(400)
      .json({ success: false, error: "Query parameter required" });
  }

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    const url = `https://${city}.craigslist.org/search/${category}?query=${encodeURIComponent(
      query as string
    )}`;
    await page.goto(url);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      `Extract up to ${limit} listings with title, price, location, posting date, listing URL, and whether it has images`,
      ListingSchema
    );

    res.json({
      success: true,
      query: { city, category, search: query },
      data: result.listings.slice(0, limit),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/craigslist/housing - Housing listings
app.get("/api/craigslist/housing", async (req: Request, res: Response) => {
  const { city = "sfbay", type = "apa" } = req.query; // apa = apartments, hou = housing
  const minPrice = req.query.min_price || "";
  const maxPrice = req.query.max_price || "";

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    let url = `https://${city}.craigslist.org/search/${type}`;
    const params = new URLSearchParams();
    if (minPrice) params.append("min_price", minPrice as string);
    if (maxPrice) params.append("max_price", maxPrice as string);
    if (params.toString()) url += `?${params.toString()}`;

    await page.goto(url);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract housing listings with title, price, location, posting date, URL, and image availability",
      ListingSchema
    );

    res.json({
      success: true,
      query: { city, type, minPrice, maxPrice },
      data: result.listings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/craigslist/jobs - Job listings
app.get("/api/craigslist/jobs", async (req: Request, res: Response) => {
  const { city = "sfbay", query = "" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    let url = `https://${city}.craigslist.org/search/jjj`;
    if (query) url += `?query=${encodeURIComponent(query as string)}`;

    await page.goto(url);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract job listings with title, location, posting date, and URL",
      ListingSchema
    );

    res.json({
      success: true,
      query: { city, search: query },
      data: result.listings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/craigslist/free - Free items
app.get("/api/craigslist/free", async (req: Request, res: Response) => {
  const { city = "sfbay" } = req.query;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://${city}.craigslist.org/search/zip`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract free item listings with title, location, posting date, URL, and image availability",
      ListingSchema
    );

    res.json({ success: true, city, data: result.listings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

app.listen(PORT, () => {
  console.log(`Craigslist API server running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log(
    "  GET /api/craigslist/search?city=sfbay&category=sss&query=iphone"
  );
  console.log(
    "  GET /api/craigslist/housing?city=sfbay&type=apa&min_price=1000&max_price=3000"
  );
  console.log("  GET /api/craigslist/jobs?city=sfbay&query=engineer");
  console.log("  GET /api/craigslist/free?city=sfbay");
});
