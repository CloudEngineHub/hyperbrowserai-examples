/**
 * Template: Stock Availability Checker
 * Category: Monitoring
 * Use Case: Check if out-of-stock items are back (GPU, PS5, etc.)
 * Target Sites: Various retailers
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

// uncomment to view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const StockStatusSchema = z.object({
  productName: z.string(),
  inStock: z.boolean(),
  price: z.string().nullable(),
  stockQuantity: z.string().nullable(),
  estimatedDelivery: z.string().nullable(),
  seller: z.string().nullable(),
  condition: z.string().nullable(),
});

interface TrackedItem {
  name: string;
  url: string;
  retailer: string;
  notifyEmail?: string;
}

interface StockAlert {
  item: TrackedItem;
  status: z.infer<typeof StockStatusSchema>;
  previouslyOutOfStock: boolean;
  timestamp: string;
}

// Items to track
const TRACKED_ITEMS: TrackedItem[] = [
  {
    name: "NVIDIA RTX 4090",
    url: "https://www.bestbuy.com/product/nvidia-geforce-rtx-5090-32gb-gddr7-founders-edition-graphics-card-dark-gun-metal/J3GWYHGPCP",
    retailer: "BestBuy",
  },
  {
    name: "PlayStation 5",
    url: "https://www.amazon.com/dp/B0BCNKKZ91",
    retailer: "Amazon",
  },
  {
    name: "Steam Deck OLED 1TB",
    url: "https://store.steampowered.com/steamdeck",
    retailer: "Steam",
  },
  {
    name: "AMD Ryzen 9 9950X",
    url: "https://www.newegg.com/amd-ryzen-9-9950x/p/N82E16819113843",
    retailer: "Newegg",
  },
];

// Simulated previous stock state (in real usage, load from file/db)
const previousStockState: Map<string, boolean> = new Map();

async function checkAllItems(items: TrackedItem[]): Promise<{
  alerts: StockAlert[];
  statuses: Array<{
    item: TrackedItem;
    status: z.infer<typeof StockStatusSchema> | null;
  }>;
}> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o" },
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

  const alerts: StockAlert[] = [];
  const statuses: Array<{ item: TrackedItem; status: any }> = [];
  let sessionId: string | null = null;

  try {
    for (const item of items) {
      console.log(`  📦 Checking ${item.name} at ${item.retailer}...`);

      const page = await agent.newPage();

      // Get session ID after first page is initialized
      // if (!sessionId) {
      //   sessionId = getSessionId(agent);
      // }

      try {
        await page.goto(item.url);
        await page.waitForTimeout(20000);

        const status = await page.extract(
          "Extract product name, stock availability (in stock or out of stock), current price, quantity available if shown, estimated delivery date, seller name, and condition (new/used)",
          StockStatusSchema
        );

        statuses.push({ item, status });

        const wasOutOfStock = previousStockState.get(item.url) === false;
        previousStockState.set(item.url, status.inStock);

        if (status.inStock) {
          console.log(`     ✅ IN STOCK - ${status.price || "Price N/A"}`);
          if (wasOutOfStock) {
            alerts.push({
              item,
              status,
              previouslyOutOfStock: true,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          console.log(`     ❌ OUT OF STOCK`);
        }
      } catch (error) {
        console.log(`     ⚠️ Error checking item`);
        statuses.push({ item, status: null });
      }
    }

    return { alerts, statuses };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "monitoring",
    //     "stock-availability-checker"
    //   );
    // }
  }
}

function formatStockAlert(alert: StockAlert): string {
  return `
🚨 BACK IN STOCK ALERT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━
Product: ${alert.item.name}
Retailer: ${alert.item.retailer}
Price: ${alert.status.price || "Check website"}
Quantity: ${alert.status.stockQuantity || "Limited"}
Delivery: ${alert.status.estimatedDelivery || "Check website"}
URL: ${alert.item.url}
Time: ${new Date(alert.timestamp).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

async function runStockChecker(items?: TrackedItem[]) {
  const itemsToCheck = items || TRACKED_ITEMS;

  console.log("🔍 Stock Availability Checker\n");
  console.log(`Monitoring ${itemsToCheck.length} items...\n`);

  const { alerts, statuses } = await checkAllItems(itemsToCheck);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("STOCK CHECK SUMMARY");
  console.log("=".repeat(50));

  const inStockCount = statuses.filter((s) => s.status?.inStock).length;
  const outOfStockCount = statuses.filter(
    (s) => s.status && !s.status.inStock
  ).length;
  const errorCount = statuses.filter((s) => !s.status).length;

  console.log(`\n📊 Results:`);
  console.log(`   ✅ In Stock: ${inStockCount}`);
  console.log(`   ❌ Out of Stock: ${outOfStockCount}`);
  console.log(`   ⚠️ Errors: ${errorCount}`);

  // Display alerts
  if (alerts.length > 0) {
    console.log("\n" + "🚨".repeat(20));
    console.log("\n*** NEW STOCK ALERTS ***\n");
    alerts.forEach((alert) => {
      console.log(formatStockAlert(alert));
    });
  }

  // Detailed status
  console.log("\n📋 Detailed Status:");
  statuses.forEach(({ item, status }) => {
    if (status) {
      const icon = status.inStock ? "✅" : "❌";
      const price = status.price || "N/A";
      console.log(
        `   ${icon} ${item.name} (${item.retailer}): ${
          status.inStock ? `IN STOCK - ${price}` : "OUT OF STOCK"
        }`
      );
    } else {
      console.log(`   ⚠️ ${item.name} (${item.retailer}): Error checking`);
    }
  });

  return { alerts, statuses };
}

// Run the checker
runStockChecker();

// For continuous monitoring, you could schedule this script
