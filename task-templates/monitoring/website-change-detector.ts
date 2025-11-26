/**
 * Template: Website Change Detector
 * Category: Monitoring
 * Use Case: Detect content changes on any webpage, diff output
 * Target Sites: Any website
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import * as fs from "fs";
import * as crypto from "crypto";

config();

const PageContentSchema = z.object({
  title: z.string(),
  mainContent: z.string(),
  lastUpdated: z.string().nullable(),
  links: z.array(z.string()),
  importantSections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
    })
  ),
});

interface MonitoredPage {
  id: string;
  url: string;
  name: string;
  checkInterval: number; // minutes
  lastChecked?: string;
  lastHash?: string;
  lastContent?: z.infer<typeof PageContentSchema>;
}

interface ChangeDetection {
  page: MonitoredPage;
  changeType: "new" | "modified" | "no_change";
  changes?: {
    titleChanged: boolean;
    contentChanged: boolean;
    newSections: string[];
    removedSections: string[];
    modifiedSections: string[];
  };
  previousContent?: z.infer<typeof PageContentSchema>;
  currentContent: z.infer<typeof PageContentSchema>;
  timestamp: string;
}

const DATA_FILE = "./website-monitor-data.json";

function loadMonitoredPages(): MonitoredPage[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return [];
}

function saveMonitoredPages(pages: MonitoredPage[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(pages, null, 2));
}

function hashContent(content: any): string {
  return crypto
    .createHash("md5")
    .update(JSON.stringify(content))
    .digest("hex");
}

function detectChanges(
  previous: z.infer<typeof PageContentSchema>,
  current: z.infer<typeof PageContentSchema>
): ChangeDetection["changes"] {
  const previousSections = new Set(previous.importantSections.map((s) => s.heading));
  const currentSections = new Set(current.importantSections.map((s) => s.heading));

  const newSections = [...currentSections].filter((s) => !previousSections.has(s));
  const removedSections = [...previousSections].filter((s) => !currentSections.has(s));

  const modifiedSections: string[] = [];
  current.importantSections.forEach((section) => {
    const prevSection = previous.importantSections.find(
      (s) => s.heading === section.heading
    );
    if (prevSection && prevSection.content !== section.content) {
      modifiedSections.push(section.heading);
    }
  });

  return {
    titleChanged: previous.title !== current.title,
    contentChanged: previous.mainContent !== current.mainContent,
    newSections,
    removedSections,
    modifiedSections,
  };
}

async function checkPage(
  agent: HyperAgent,
  page: MonitoredPage
): Promise<ChangeDetection> {
  const browserPage = await agent.newPage();

  try {
    await browserPage.goto(page.url);
    await browserPage.waitForTimeout(3000);

    const content = await browserPage.extract(
      "Extract the page title, main content text, last updated date if shown, all links, and important sections with their headings and content",
      PageContentSchema
    );

    const currentHash = hashContent(content);
    const timestamp = new Date().toISOString();

    if (!page.lastHash) {
      // First time checking this page
      return {
        page,
        changeType: "new",
        currentContent: content,
        timestamp,
      };
    }

    if (currentHash === page.lastHash) {
      return {
        page,
        changeType: "no_change",
        currentContent: content,
        timestamp,
      };
    }

    // Content changed
    const changes = page.lastContent
      ? detectChanges(page.lastContent, content)
      : undefined;

    return {
      page,
      changeType: "modified",
      changes,
      previousContent: page.lastContent,
      currentContent: content,
      timestamp,
    };
  } catch (error) {
    console.error(`Error checking ${page.url}:`, error);
    throw error;
  }
}

function formatChangeReport(detection: ChangeDetection): string {
  if (detection.changeType === "no_change") {
    return `✓ ${detection.page.name}: No changes detected`;
  }

  if (detection.changeType === "new") {
    return `📝 ${detection.page.name}: Initial snapshot captured`;
  }

  let report = `\n🔔 CHANGE DETECTED: ${detection.page.name}\n`;
  report += `${"━".repeat(50)}\n`;
  report += `URL: ${detection.page.url}\n`;
  report += `Time: ${new Date(detection.timestamp).toLocaleString()}\n\n`;

  if (detection.changes) {
    if (detection.changes.titleChanged) {
      report += `📌 Title changed:\n`;
      report += `   Old: ${detection.previousContent?.title}\n`;
      report += `   New: ${detection.currentContent.title}\n\n`;
    }

    if (detection.changes.newSections.length > 0) {
      report += `➕ New sections:\n`;
      detection.changes.newSections.forEach((s) => {
        report += `   • ${s}\n`;
      });
      report += "\n";
    }

    if (detection.changes.removedSections.length > 0) {
      report += `➖ Removed sections:\n`;
      detection.changes.removedSections.forEach((s) => {
        report += `   • ${s}\n`;
      });
      report += "\n";
    }

    if (detection.changes.modifiedSections.length > 0) {
      report += `✏️ Modified sections:\n`;
      detection.changes.modifiedSections.forEach((s) => {
        report += `   • ${s}\n`;
      });
      report += "\n";
    }

    if (detection.changes.contentChanged) {
      report += `📄 Main content was modified\n`;
    }
  }

  report += `${"━".repeat(50)}`;
  return report;
}

async function runChangeDetector(pages?: MonitoredPage[]) {
  console.log("🔍 Website Change Detector\n");

  let monitoredPages = pages || loadMonitoredPages();

  // Add sample pages if none exist
  if (monitoredPages.length === 0) {
    console.log("No pages configured. Adding sample pages...\n");
    monitoredPages = [
      {
        id: "1",
        url: "https://openai.com/blog",
        name: "OpenAI Blog",
        checkInterval: 60,
      },
      {
        id: "2",
        url: "https://github.com/trending",
        name: "GitHub Trending",
        checkInterval: 30,
      },
      {
        id: "3",
        url: "https://news.ycombinator.com",
        name: "Hacker News",
        checkInterval: 15,
      },
    ];
  }

  console.log(`Checking ${monitoredPages.length} pages...\n`);

  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  const results: ChangeDetection[] = [];

  try {
    for (const page of monitoredPages) {
      console.log(`  🌐 Checking: ${page.name}...`);

      try {
        const detection = await checkPage(agent, page);
        results.push(detection);

        // Update page state
        page.lastChecked = detection.timestamp;
        page.lastHash = hashContent(detection.currentContent);
        page.lastContent = detection.currentContent;

        const statusIcon =
          detection.changeType === "no_change"
            ? "✓"
            : detection.changeType === "new"
            ? "📝"
            : "🔔";
        console.log(`     ${statusIcon} ${detection.changeType}`);
      } catch (error) {
        console.log(`     ❌ Error checking page`);
      }
    }

    // Save updated state
    saveMonitoredPages(monitoredPages);

    // Display results
    console.log("\n" + "=".repeat(50));
    console.log("CHANGE DETECTION REPORT");
    console.log("=".repeat(50));

    const changes = results.filter((r) => r.changeType === "modified");
    const noChanges = results.filter((r) => r.changeType === "no_change");
    const newPages = results.filter((r) => r.changeType === "new");

    console.log(`\n📊 Summary:`);
    console.log(`   🔔 Changes detected: ${changes.length}`);
    console.log(`   ✓ No changes: ${noChanges.length}`);
    console.log(`   📝 New snapshots: ${newPages.length}`);

    if (changes.length > 0) {
      console.log("\n" + "🔔".repeat(20));
      console.log("\n*** DETECTED CHANGES ***");
      changes.forEach((change) => {
        console.log(formatChangeReport(change));
      });
    }

    return results;
  } finally {
    await agent.closeAgent();
  }
}

// Run the detector
runChangeDetector();



