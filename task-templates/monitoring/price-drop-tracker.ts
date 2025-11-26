/**
 * Template: Price Drop Tracker
 * Category: Monitoring
 * Use Case: Monitor product prices on Amazon/BestBuy, detect drops
 * Target Sites: amazon.com, bestbuy.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import * as fs from "fs";

config();

const PriceSchema = z.object({
  productName: z.string(),
  currentPrice: z.string(),
  originalPrice: z.string().nullable(),
  discount: z.string().nullable(),
  inStock: z.boolean(),
  seller: z.string().nullable(),
  lastUpdated: z.string().optional(),
});

interface TrackedProduct {
  id: string;
  name: string;
  url: string;
  targetPrice: number;
  priceHistory: Array<{ price: number; timestamp: string }>;
  lowestPrice: number;
  highestPrice: number;
}

interface PriceAlert {
  productId: string;
  productName: string;
  previousPrice: number;
  currentPrice: number;
  changePercent: number;
  url: string;
  alertType: "drop" | "target_reached" | "back_in_stock";
}

const DATA_FILE = "./price-tracker-data.json";

function loadTrackedProducts(): TrackedProduct[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return [];
}

function saveTrackedProducts(products: TrackedProduct[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ""));
  }
  return 0;
}

async function checkPrice(agent: HyperAgent, url: string): Promise<any> {
  const page = await agent.newPage();

  try {
    await page.goto(url);
    await page.waitForTimeout(3000);

    const priceData = await page.extract(
      "Extract the product name, current price, original price if on sale, discount percentage, stock status, and seller name",
      PriceSchema
    );

    return {
      ...priceData,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error checking price for ${url}:`, error);
    return null;
  }
}

async function checkAllProducts(products: TrackedProduct[]): Promise<PriceAlert[]> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const alerts: PriceAlert[] = [];

  try {
    for (const product of products) {
      console.log(`  Checking: ${product.name}...`);
      const priceData = await checkPrice(agent, product.url);

      if (!priceData) continue;

      const currentPrice = parsePrice(priceData.currentPrice);
      const previousPrice =
        product.priceHistory.length > 0
          ? product.priceHistory[product.priceHistory.length - 1].price
          : currentPrice;

      // Update price history
      product.priceHistory.push({
        price: currentPrice,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 100 entries
      if (product.priceHistory.length > 100) {
        product.priceHistory = product.priceHistory.slice(-100);
      }

      // Update lowest/highest
      product.lowestPrice = Math.min(product.lowestPrice || currentPrice, currentPrice);
      product.highestPrice = Math.max(product.highestPrice || currentPrice, currentPrice);

      // Check for alerts
      const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

      if (currentPrice < previousPrice && Math.abs(changePercent) >= 5) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          previousPrice,
          currentPrice,
          changePercent,
          url: product.url,
          alertType: "drop",
        });
      }

      if (currentPrice <= product.targetPrice && previousPrice > product.targetPrice) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          previousPrice,
          currentPrice,
          changePercent,
          url: product.url,
          alertType: "target_reached",
        });
      }

      console.log(`    Current: $${currentPrice} (Target: $${product.targetPrice})`);
    }

    return alerts;
  } finally {
    await agent.closeAgent();
  }
}

function formatAlert(alert: PriceAlert): string {
  const emoji = alert.alertType === "target_reached" ? "🎯" : "📉";
  const changeStr =
    alert.changePercent < 0
      ? `${alert.changePercent.toFixed(1)}%`
      : `+${alert.changePercent.toFixed(1)}%`;

  return `${emoji} ${alert.alertType === "target_reached" ? "TARGET REACHED" : "PRICE DROP"}
Product: ${alert.productName}
Previous: $${alert.previousPrice.toFixed(2)}
Current: $${alert.currentPrice.toFixed(2)} (${changeStr})
URL: ${alert.url}`;
}

async function runPriceTracker() {
  console.log("💰 Price Drop Tracker\n");
  console.log("Loading tracked products...");

  let products = loadTrackedProducts();

  // Add sample products if none exist
  if (products.length === 0) {
    console.log("No products found. Adding sample products...\n");
    products = [
      {
        id: "1",
        name: "Sony WH-1000XM5 Headphones",
        url: "https://www.amazon.com/dp/B0BSHF7WHW",
        targetPrice: 300,
        priceHistory: [],
        lowestPrice: Infinity,
        highestPrice: 0,
      },
      {
        id: "2",
        name: "Apple AirPods Pro",
        url: "https://www.amazon.com/dp/B0D1XD1ZV3",
        targetPrice: 200,
        priceHistory: [],
        lowestPrice: Infinity,
        highestPrice: 0,
      },
      {
        id: "3",
        name: "Samsung 65\" OLED TV",
        url: "https://www.bestbuy.com/site/samsung-65-class-s90d-series-oled-4k/6576614.p",
        targetPrice: 1500,
        priceHistory: [],
        lowestPrice: Infinity,
        highestPrice: 0,
      },
    ];
  }

  console.log(`Tracking ${products.length} products\n`);

  // Check all prices
  console.log("Checking prices...\n");
  const alerts = await checkAllProducts(products);

  // Save updated data
  saveTrackedProducts(products);

  // Display results
  console.log("\n" + "=".repeat(50));
  console.log("PRICE CHECK COMPLETE");
  console.log("=".repeat(50));

  if (alerts.length > 0) {
    console.log(`\n🚨 ${alerts.length} ALERT(S):\n`);
    alerts.forEach((alert) => {
      console.log(formatAlert(alert));
      console.log("-".repeat(40));
    });
  } else {
    console.log("\n✓ No significant price changes detected.");
  }

  // Summary
  console.log("\n📊 PRODUCT SUMMARY:");
  products.forEach((p) => {
    const latest = p.priceHistory[p.priceHistory.length - 1];
    const price = latest ? `$${latest.price.toFixed(2)}` : "Unknown";
    const status = latest && latest.price <= p.targetPrice ? "✓ At target!" : "Watching...";
    console.log(`  • ${p.name}: ${price} (Target: $${p.targetPrice}) - ${status}`);
  });

  return { products, alerts };
}

// Run the tracker
runPriceTracker();

