/**
 * Template: Multi-Site Unified API Server
 * Category: API Servers
 * Use Case: Single Express server with endpoints for IMDB, Weather, and TripAdvisor
 * Target Sites: imdb.com, weather.com, tripadvisor.com
 */

import express, { Request, Response } from "express";
import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ IMDB Schemas ============
const IMDBMovieSchema = z.object({
  movies: z.array(
    z.object({
      title: z.string(),
      year: z.string(),
      rating: z.string().nullable(),
      runtime: z.string().nullable(),
      genre: z.string().nullable(),
    })
  ),
});

const IMDBMovieDetailSchema = z.object({
  title: z.string(),
  year: z.string(),
  rating: z.string(),
  runtime: z.string(),
  genre: z.string(),
  director: z.string(),
  cast: z.array(z.string()),
  plot: z.string(),
  metascore: z.string().nullable(),
});

// ============ Weather Schemas ============
const WeatherSchema = z.object({
  location: z.string(),
  currentTemp: z.string(),
  condition: z.string(),
  humidity: z.string(),
  wind: z.string(),
  feelsLike: z.string(),
  forecast: z.array(
    z.object({
      day: z.string(),
      high: z.string(),
      low: z.string(),
      condition: z.string(),
    })
  ),
});

// ============ TripAdvisor Schemas ============
const TripAdvisorSchema = z.object({
  places: z.array(
    z.object({
      name: z.string(),
      rating: z.string(),
      reviewCount: z.string(),
      priceLevel: z.string().nullable(),
      cuisine: z.string().nullable(),
      address: z.string().nullable(),
    })
  ),
});

// ============ IMDB Endpoints ============

// GET /api/imdb/top250 - Get IMDB Top 250 movies
app.get("/api/imdb/top250", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 25;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto("https://www.imdb.com/chart/top/");
    await page.waitForTimeout(3000);

    const result = await page.extract(
      `Extract the top ${limit} movies with title, year, rating, runtime, and genre`,
      IMDBMovieSchema
    );

    res.json({ success: true, data: result.movies.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/imdb/movie/:id - Get movie details
app.get("/api/imdb/movie/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.imdb.com/title/${id}/`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract movie title, year, rating, runtime, genre, director, main cast (top 5), plot summary, and metascore",
      IMDBMovieDetailSchema
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/imdb/search - Search movies
app.get("/api/imdb/search", async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: "Query parameter 'q' required" });
  }

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.imdb.com/find/?q=${encodeURIComponent(q as string)}&s=tt`);
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract movie search results with title, year, and any available info",
      IMDBMovieSchema
    );

    res.json({ success: true, query: q, data: result.movies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// ============ Weather Endpoints ============

// GET /api/weather/:location - Get weather for location
app.get("/api/weather/:location", async (req: Request, res: Response) => {
  const { location } = req.params;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://weather.com/weather/today/l/${encodeURIComponent(location)}`);
    await page.waitForTimeout(3000);

    // Try searching if direct URL doesn't work
    await page.aiAction(`search for ${location} weather if not already showing`);
    await page.waitForTimeout(2000);

    const result = await page.extract(
      "Extract current weather: location name, temperature, condition, humidity, wind speed, feels like temperature, and 5-day forecast with day, high, low, and condition",
      WeatherSchema
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// ============ TripAdvisor Endpoints ============

// GET /api/tripadvisor/restaurants/:location - Get restaurants
app.get("/api/tripadvisor/restaurants/:location", async (req: Request, res: Response) => {
  const { location } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.tripadvisor.com/Search?q=${encodeURIComponent(location)}+restaurants`);
    await page.waitForTimeout(3000);

    await page.aiAction("click on the first restaurant search result or restaurants tab");
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Extract up to ${limit} restaurants with name, rating, review count, price level, cuisine type, and address`,
      TripAdvisorSchema
    );

    res.json({ success: true, location, data: result.places.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/tripadvisor/hotels/:location - Get hotels
app.get("/api/tripadvisor/hotels/:location", async (req: Request, res: Response) => {
  const { location } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.tripadvisor.com/Search?q=${encodeURIComponent(location)}+hotels`);
    await page.waitForTimeout(3000);

    await page.aiAction("click on the hotels tab or first hotel result");
    await page.waitForTimeout(2000);

    const HotelSchema = z.object({
      hotels: z.array(
        z.object({
          name: z.string(),
          rating: z.string(),
          reviewCount: z.string(),
          priceRange: z.string().nullable(),
          amenities: z.array(z.string()),
        })
      ),
    });

    const result = await page.extract(
      `Extract up to ${limit} hotels with name, rating, review count, price range, and key amenities`,
      HotelSchema
    );

    res.json({ success: true, location, data: result.hotels.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

// GET /api/tripadvisor/attractions/:location - Get attractions
app.get("/api/tripadvisor/attractions/:location", async (req: Request, res: Response) => {
  const { location } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  try {
    const page = await agent.newPage();
    await page.goto(`https://www.tripadvisor.com/Search?q=${encodeURIComponent(location)}+things+to+do`);
    await page.waitForTimeout(3000);

    await page.aiAction("click on things to do or attractions");
    await page.waitForTimeout(2000);

    const AttractionSchema = z.object({
      attractions: z.array(
        z.object({
          name: z.string(),
          rating: z.string(),
          reviewCount: z.string(),
          category: z.string().nullable(),
          description: z.string().nullable(),
        })
      ),
    });

    const result = await page.extract(
      `Extract up to ${limit} attractions with name, rating, review count, category, and brief description`,
      AttractionSchema
    );

    res.json({ success: true, location, data: result.attractions.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await agent.closeAgent();
  }
});

app.listen(PORT, () => {
  console.log(`Multi-Site API server running on http://localhost:${PORT}`);
  console.log("\n=== IMDB Endpoints ===");
  console.log("  GET /api/imdb/top250?limit=25     - Top 250 movies");
  console.log("  GET /api/imdb/movie/:id           - Movie details (e.g., tt0111161)");
  console.log("  GET /api/imdb/search?q=query      - Search movies");
  console.log("\n=== Weather Endpoints ===");
  console.log("  GET /api/weather/:location        - Current weather & forecast");
  console.log("\n=== TripAdvisor Endpoints ===");
  console.log("  GET /api/tripadvisor/restaurants/:location?limit=20");
  console.log("  GET /api/tripadvisor/hotels/:location?limit=20");
  console.log("  GET /api/tripadvisor/attractions/:location?limit=20");
});

