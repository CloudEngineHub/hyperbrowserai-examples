/**
 * Template: Table Data Extraction
 * Category: Concepts
 * Use Case: Extract structured data from HTML tables with various complexity levels
 * Target Sites: Wikipedia, comparison sites, data portals
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

// Schema for simple key-value table (infobox style)
const InfoboxSchema = z.object({
  title: z.string().describe("The title or subject of the infobox"),
  data: z.array(
    z.object({
      label: z.string().describe("The property name/label"),
      value: z.string().describe("The property value"),
    })
  ),
});

// Schema for standard data table with headers
const DataTableSchema = z.object({
  headers: z.array(z.string()).describe("Column headers"),
  rows: z.array(
    z.object({
      cells: z.array(z.string()).describe("Cell values in order"),
    })
  ),
  totalRows: z.number(),
});

// Schema for ranked/ordered table (e.g., top 10 lists)
const RankedTableSchema = z.object({
  title: z.string().describe("Table title or caption"),
  entries: z.array(
    z.object({
      rank: z.number(),
      name: z.string(),
      value: z.string().describe("Primary metric value"),
      additionalInfo: z.string().nullable(),
    })
  ),
});

// Schema for comparison table
const ComparisonTableSchema = z.object({
  subjects: z
    .array(z.string())
    .describe("Items being compared (column headers)"),
  features: z.array(
    z.object({
      feature: z.string().describe("Feature/attribute name"),
      values: z.array(z.string()).describe("Values for each subject"),
    })
  ),
});

// Schema for nested/hierarchical table
const NestedTableSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string(),
      subcategories: z.array(
        z.object({
          name: z.string(),
          items: z.array(
            z.object({
              name: z.string(),
              value: z.string(),
            })
          ),
        })
      ),
    })
  ),
});

interface TableExtractionResult {
  type: string;
  url: string;
  extractedAt: string;
  data: unknown;
}

/**
 * Pattern 1: Extract Infobox/Key-Value Tables
 * Common on Wikipedia, product pages, profile cards
 */
async function extractInfobox(url: string): Promise<TableExtractionResult> {
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

  console.log("=".repeat(60));
  console.log("📊 INFOBOX EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    const infobox = await page.extract(
      `Extract the main infobox or summary table on this page.
       This is typically a vertical table on the right side with property-value pairs.
       Get the title/subject and all label-value pairs.`,
      InfoboxSchema
    );

    console.log(`✅ Extracted infobox for: ${infobox.title}`);
    console.log(`   Found ${infobox.data.length} properties:\n`);

    infobox.data.slice(0, 10).forEach((item) => {
      console.log(
        `   • ${item.label}: ${item.value.substring(0, 50)}${
          item.value.length > 50 ? "..." : ""
        }`
      );
    });

    if (infobox.data.length > 10) {
      console.log(`   ... and ${infobox.data.length - 10} more properties`);
    }

    return {
      type: "infobox",
      url,
      extractedAt: new Date().toISOString(),
      data: infobox,
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "concepts", "table-infobox");
    // }
  }
}

/**
 * Pattern 2: Extract Standard Data Tables
 * Tables with column headers and multiple data rows
 */
async function extractDataTable(
  url: string,
  tableDescription: string = "the main data table"
): Promise<TableExtractionResult> {
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

  console.log("=".repeat(60));
  console.log("📊 DATA TABLE EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    const table = await page.extract(
      `Extract ${tableDescription}. 
       Get all column headers and up to 10 data rows.
       Each row should have cells in the same order as the headers.`,
      DataTableSchema
    );

    console.log(`✅ Extracted table with ${table.totalRows} rows`);
    console.log(`   Headers: ${table.headers.join(" | ")}\n`);

    // Show first 5 rows
    table.rows.slice(0, 5).forEach((row, i) => {
      console.log(`   Row ${i + 1}: ${row.cells.join(" | ")}`);
    });

    if (table.rows.length > 5) {
      console.log(`   ... and ${table.rows.length - 5} more rows`);
    }

    return {
      type: "data-table",
      url,
      extractedAt: new Date().toISOString(),
      data: table,
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    //  if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "concepts", "table-data");
    // }
  }
}

/**
 * Pattern 3: Extract Ranked/Leaderboard Tables
 * Lists with rankings, scores, or ordered data
 */
async function extractRankedTable(
  url: string,
  tableDescription: string = "the ranked list or leaderboard"
): Promise<TableExtractionResult> {
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

  console.log("=".repeat(60));
  console.log("📊 RANKED TABLE EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    const table = await page.extract(
      `Extract ${tableDescription}.
       Get the table title, and for each entry: rank, name, primary value/score, and any additional info.`,
      RankedTableSchema
    );

    console.log(`✅ Extracted: ${table.title}`);
    console.log(`   Found ${table.entries.length} ranked entries:\n`);

    table.entries.slice(0, 10).forEach((entry) => {
      console.log(
        `   #${entry.rank} ${entry.name}: ${entry.value}${
          entry.additionalInfo ? ` (${entry.additionalInfo})` : ""
        }`
      );
    });

    return {
      type: "ranked-table",
      url,
      extractedAt: new Date().toISOString(),
      data: table,
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "concepts", "table-ranked");
    // }
  }
}

/**
 * Pattern 4: Extract Comparison Tables
 * Feature comparison matrices (products, services, plans)
 */
async function extractComparisonTable(
  url: string,
  tableDescription: string = "the comparison table"
): Promise<TableExtractionResult> {
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

  console.log("=".repeat(60));
  console.log("📊 COMPARISON TABLE EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    const table = await page.extract(
      `Extract ${tableDescription}.
       Identify the items being compared (usually column headers).
       For each feature/row, get the feature name and the value for each item.
       Convert checkmarks to "Yes", X marks to "No", etc.`,
      ComparisonTableSchema
    );

    console.log(`✅ Comparing: ${table.subjects.join(" vs ")}`);
    console.log(`   Found ${table.features.length} comparison points:\n`);

    // Create a formatted comparison view
    const maxFeatureLen = Math.max(
      ...table.features.map((f) => f.feature.length),
      15
    );

    table.features.slice(0, 8).forEach((feature) => {
      const paddedFeature = feature.feature.padEnd(maxFeatureLen);
      const values = feature.values.map((v) => v.substring(0, 15)).join(" | ");
      console.log(`   ${paddedFeature}: ${values}`);
    });

    if (table.features.length > 8) {
      console.log(`   ... and ${table.features.length - 8} more features`);
    }

    return {
      type: "comparison-table",
      url,
      extractedAt: new Date().toISOString(),
      data: table,
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    // await waitForVideoAndDownload(sessionId, "concepts", "table-comparison");
    // }
  }
}

/**
 * Pattern 5: Extract Multiple Tables from a Page
 * When a page has several tables of interest
 */
async function extractAllTables(url: string): Promise<TableExtractionResult> {
  const MultiTableSchema = z.object({
    tables: z.array(
      z.object({
        tableIndex: z.number(),
        title: z
          .string()
          .nullable()
          .describe("Table caption or nearby heading"),
        type: z
          .enum(["data", "infobox", "comparison", "ranked", "layout"])
          .describe("Type of table"),
        headers: z.array(z.string()).nullable(),
        rowCount: z.number(),
        sampleData: z
          .array(z.array(z.string()))
          .describe("First 3 rows of data"),
      })
    ),
  });

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

  console.log("=".repeat(60));
  console.log("📊 MULTI-TABLE EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    const result = await page.extract(
      `Find ALL tables on this page (excluding navigation/layout tables).
       For each table, identify:
       - Its position/index on the page
       - Title or nearby heading
       - Type of table (data, infobox, comparison, ranked, layout)
       - Column headers if present
       - Row count
       - First 3 rows of actual data`,
      MultiTableSchema
    );

    console.log(`✅ Found ${result.tables.length} tables:\n`);

    result.tables.forEach((table) => {
      console.log(
        `   Table #${table.tableIndex}: ${table.title || "(untitled)"}`
      );
      console.log(`   Type: ${table.type} | Rows: ${table.rowCount}`);
      if (table.headers) {
        console.log(
          `   Headers: ${table.headers.slice(0, 5).join(", ")}${
            table.headers.length > 5 ? "..." : ""
          }`
        );
      }
      console.log();
    });

    return {
      type: "multi-table",
      url,
      extractedAt: new Date().toISOString(),
      data: result,
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "concepts", "table-multi");
    // }
  }
}

/**
 * Pattern 6: Interactive Table with Sorting/Filtering
 * Tables that require interaction before extraction
 */
async function extractSortedTable(
  url: string,
  sortColumn: string,
  sortOrder: "ascending" | "descending" = "descending"
): Promise<TableExtractionResult> {
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

  console.log("=".repeat(60));
  console.log("📊 INTERACTIVE TABLE EXTRACTION");
  console.log("=".repeat(60));
  console.log(`\n🔍 Target: ${url}`);
  console.log(`   Sorting by: ${sortColumn} (${sortOrder})\n`);

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    await page.goto(url);
    await page.waitForTimeout(2000);

    // Sort the table by clicking the column header
    await page.aiAction(
      `Click on the "${sortColumn}" column header to sort the table. 
       If already sorted ${sortOrder}, click again if needed to ensure ${sortOrder} order.`
    );
    await page.waitForTimeout(1500);

    // For descending, might need to click again
    if (sortOrder === "descending") {
      const sortState = await page.extract(
        `Check if the table is currently sorted by ${sortColumn} in ${sortOrder} order.
         Look for sort indicators (arrows, highlighted headers).`,
        z.object({
          isCorrectOrder: z.boolean(),
          currentOrder: z.string().nullable(),
        })
      );

      if (!sortState.isCorrectOrder) {
        await page.aiAction(
          `Click the "${sortColumn}" header again to reverse sort order`
        );
        await page.waitForTimeout(1000);
      }
    }

    // Now extract the sorted table
    const table = await page.extract(
      `Extract the data table with all its rows.
       Get headers and all cell values.`,
      DataTableSchema
    );

    console.log(`✅ Extracted table sorted by ${sortColumn} (${sortOrder})`);
    console.log(`   Headers: ${table.headers.join(" | ")}\n`);

    table.rows.slice(0, 10).forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.cells.join(" | ")}`);
    });

    return {
      type: "sorted-table",
      url,
      extractedAt: new Date().toISOString(),
      data: {
        sortedBy: sortColumn,
        sortOrder,
        ...table,
      },
    };
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(sessionId, "concepts", "table-sorted");
    // }
  }
}

/**
 * Convert extracted table to CSV format
 */
function tableToCSV(table: z.infer<typeof DataTableSchema>): string {
  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerRow = table.headers.map(escapeCSV).join(",");
  const dataRows = table.rows.map((row) => row.cells.map(escapeCSV).join(","));

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Convert extracted table to JSON format
 */
function tableToJSON(table: z.infer<typeof DataTableSchema>): object[] {
  return table.rows.map((row) => {
    const obj: Record<string, string> = {};
    table.headers.forEach((header, i) => {
      obj[header] = row.cells[i] || "";
    });
    return obj;
  });
}

// Example usage
console.log(`
╔════════════════════════════════════════════════════════════╗
║          TABLE DATA EXTRACTION PATTERNS                    ║
╠════════════════════════════════════════════════════════════╣
║  1. extractInfobox()        - Key-value infobox tables     ║
║  2. extractDataTable()      - Standard data tables         ║
║  3. extractRankedTable()    - Ranked lists/leaderboards    ║
║  4. extractComparisonTable() - Feature comparison matrices ║
║  5. extractAllTables()      - Find all tables on a page    ║
║  6. extractSortedTable()    - Sort before extraction       ║
╚════════════════════════════════════════════════════════════╝

Helper functions:
  - tableToCSV()  - Convert to CSV format
  - tableToJSON() - Convert to JSON objects
`);

// Run example: Extract country data from Wikipedia
extractDataTable(
  "https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)",
  "the table showing countries ranked by population"
);
