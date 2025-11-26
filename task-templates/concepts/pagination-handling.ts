/**
 * Template: Pagination Handling
 * Category: Concepts
 * Use Case: Extract data across multiple pages with various pagination patterns
 * Target Site: Example sites with different pagination types
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ItemSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      price: z.string().nullable(),
      url: z.string().nullable(),
    })
  ),
});

const PaginationInfoSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number().nullable(),
  totalItems: z.string().nullable(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

interface PaginationOptions {
  maxPages?: number;
  delayBetweenPages?: number;
}

/**
 * Pattern 1: Click "Next" Button Pagination
 * Common on e-commerce sites, search results
 */
async function extractWithNextButton(
  url: string,
  options: PaginationOptions = {}
): Promise<any[]> {
  const { maxPages = 5, delayBetweenPages = 2000 } = options;
  const allItems: any[] = [];

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📄 Extracting with Next Button pagination\n`);

  try {
    const page = await agent.newPage();
    await page.goto(url);
    await page.waitForTimeout(3000);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`  Page ${pageNum}...`);

      // Extract items on current page
      const items = await page.extract(
        "Extract all items/products with title, description, price, and URL",
        ItemSchema
      );

      allItems.push(...items.items);
      console.log(`    Found ${items.items.length} items (Total: ${allItems.length})`);

      // Check if there's a next page
      const paginationInfo = await page.extract(
        "Check pagination: is there a next page button that is clickable?",
        z.object({ hasNextPage: z.boolean() })
      );

      if (!paginationInfo.hasNextPage || pageNum >= maxPages) {
        console.log(`    Reached last page or max pages limit`);
        break;
      }

      // Click next and wait
      await page.aiAction("click the Next page button or arrow");
      await page.waitForTimeout(delayBetweenPages);
    }

    console.log(`\n✅ Total items extracted: ${allItems.length}`);
    return allItems;
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 2: Page Number Pagination
 * Click specific page numbers (1, 2, 3, etc.)
 */
async function extractWithPageNumbers(
  url: string,
  options: PaginationOptions = {}
): Promise<any[]> {
  const { maxPages = 5, delayBetweenPages = 2000 } = options;
  const allItems: any[] = [];

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📄 Extracting with Page Number pagination\n`);

  try {
    const page = await agent.newPage();
    await page.goto(url);
    await page.waitForTimeout(3000);

    // Get total pages info
    const paginationInfo = await page.extract(
      "Extract pagination info: current page number, total pages if shown, total items count if shown",
      PaginationInfoSchema
    );

    const totalPages = Math.min(
      paginationInfo.totalPages || maxPages,
      maxPages
    );

    console.log(`  Total pages to extract: ${totalPages}`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`  Page ${pageNum}/${totalPages}...`);

      // Extract items on current page
      const items = await page.extract(
        "Extract all items/products with title, description, price, and URL",
        ItemSchema
      );

      allItems.push(...items.items);
      console.log(`    Found ${items.items.length} items`);

      if (pageNum < totalPages) {
        // Click the next page number
        await page.aiAction(`click on page number ${pageNum + 1} in the pagination`);
        await page.waitForTimeout(delayBetweenPages);
      }
    }

    console.log(`\n✅ Total items extracted: ${allItems.length}`);
    return allItems;
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 3: Load More Button Pagination
 * Single page with "Load More" to reveal additional content
 */
async function extractWithLoadMore(
  url: string,
  options: PaginationOptions = {}
): Promise<any[]> {
  const { maxPages: maxClicks = 5, delayBetweenPages: delayBetweenClicks = 2000 } = options;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📄 Extracting with Load More button\n`);

  try {
    const page = await agent.newPage();
    await page.goto(url);
    await page.waitForTimeout(3000);

    let previousCount = 0;
    let noNewItemsCount = 0;

    for (let click = 0; click < maxClicks; click++) {
      // Count current items
      const items = await page.extract(
        "Extract all visible items with title, description, price, and URL",
        ItemSchema
      );

      console.log(`  After ${click} clicks: ${items.items.length} items`);

      if (items.items.length === previousCount) {
        noNewItemsCount++;
        if (noNewItemsCount >= 2) {
          console.log(`    No new items loaded, stopping`);
          break;
        }
      } else {
        noNewItemsCount = 0;
      }

      previousCount = items.items.length;

      // Check for Load More button
      const hasLoadMore = await page.extract(
        "Is there a visible and clickable 'Load More', 'Show More', or similar button?",
        z.object({ hasButton: z.boolean() })
      );

      if (!hasLoadMore.hasButton) {
        console.log(`    No more 'Load More' button found`);
        break;
      }

      // Click Load More
      await page.aiAction("click the 'Load More' or 'Show More' button");
      await page.waitForTimeout(delayBetweenClicks);
    }

    // Final extraction
    const finalItems = await page.extract(
      "Extract all items with title, description, price, and URL",
      ItemSchema
    );

    console.log(`\n✅ Total items extracted: ${finalItems.items.length}`);
    return finalItems.items;
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 4: Infinite Scroll Pagination
 * Scroll to bottom to load more content
 */
async function extractWithInfiniteScroll(
  url: string,
  options: PaginationOptions = {}
): Promise<any[]> {
  const { maxPages: maxScrolls = 10, delayBetweenPages: delayBetweenScrolls = 2000 } = options;

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📄 Extracting with Infinite Scroll\n`);

  try {
    const page = await agent.newPage();
    await page.goto(url);
    await page.waitForTimeout(3000);

    let previousCount = 0;
    let noNewItemsCount = 0;

    for (let scroll = 0; scroll < maxScrolls; scroll++) {
      // Scroll to bottom
      await page.aiAction("scroll to the bottom of the page");
      await page.waitForTimeout(delayBetweenScrolls);

      // Count items
      const items = await page.extract(
        "Count all visible items/products on the page",
        z.object({ count: z.number() })
      );

      console.log(`  Scroll ${scroll + 1}: ${items.count} items visible`);

      if (items.count === previousCount) {
        noNewItemsCount++;
        if (noNewItemsCount >= 3) {
          console.log(`    No new items after multiple scrolls, stopping`);
          break;
        }
      } else {
        noNewItemsCount = 0;
      }

      previousCount = items.count;
    }

    // Final extraction
    const finalItems = await page.extract(
      "Extract all items with title, description, price, and URL",
      ItemSchema
    );

    console.log(`\n✅ Total items extracted: ${finalItems.items.length}`);
    return finalItems.items;
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 5: URL-Based Pagination
 * Change URL parameters to navigate pages
 */
async function extractWithUrlPagination(
  baseUrl: string,
  pageParam: string = "page",
  options: PaginationOptions = {}
): Promise<any[]> {
  const { maxPages = 5, delayBetweenPages = 2000 } = options;
  const allItems: any[] = [];

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📄 Extracting with URL-based pagination\n`);

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`  Page ${pageNum}...`);

      const page = await agent.newPage();
      const url = baseUrl.includes("?")
        ? `${baseUrl}&${pageParam}=${pageNum}`
        : `${baseUrl}?${pageParam}=${pageNum}`;

      await page.goto(url);
      await page.waitForTimeout(delayBetweenPages);

      // Extract items
      const items = await page.extract(
        "Extract all items with title, description, price, and URL",
        ItemSchema
      );

      if (items.items.length === 0) {
        console.log(`    No items found, stopping`);
        break;
      }

      allItems.push(...items.items);
      console.log(`    Found ${items.items.length} items (Total: ${allItems.length})`);
    }

    console.log(`\n✅ Total items extracted: ${allItems.length}`);
    return allItems;
  } finally {
    await agent.closeAgent();
  }
}

// Example usage - choose the appropriate pattern for your target site
console.log("=".repeat(60));
console.log("PAGINATION HANDLING PATTERNS");
console.log("=".repeat(60));

console.log(`
Available patterns:
1. extractWithNextButton()    - Click "Next" button
2. extractWithPageNumbers()   - Click page numbers (1, 2, 3...)
3. extractWithLoadMore()      - Click "Load More" button
4. extractWithInfiniteScroll() - Scroll to load more
5. extractWithUrlPagination() - Change URL parameters

Usage example:
`);

// Example: Extract with Next button
extractWithNextButton("https://example.com/products", {
  maxPages: 3,
  delayBetweenPages: 2000,
});

