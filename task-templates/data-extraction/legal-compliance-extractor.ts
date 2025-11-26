/**
 * Template: Legal Compliance Extractor
 * Category: Data Extraction
 * Use Case: Extract TOS/Privacy sections for data retention and sub-processors
 * Target Sites: Legal pages, privacy policies, terms of service
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";
import * as fs from "fs";

config();

const PrivacyPolicySchema = z.object({
  dataCollected: z.array(z.string()).describe("Types of data collected from users"),
  dataUsage: z.array(z.string()).describe("How the collected data is used"),
  dataRetention: z.string().describe("How long data is retained, use 'Not specified' if not found"),
  dataSharing: z.array(z.string()).describe("Third parties data is shared with"),
  subProcessors: z.array(
    z.object({
      name: z.string().describe("Name of the sub-processor"),
      purpose: z.string().describe("Purpose of sub-processor, use 'Not specified' if not found"),
      location: z.string().describe("Location of sub-processor, use 'Not specified' if not found"),
    })
  ).describe("List of sub-processors, use empty array if none found"),
  userRights: z.array(z.string()).describe("User rights like access, deletion, portability"),
  securityMeasures: z.array(z.string()).describe("Security measures described in the policy"),
});

const TermsOfServiceSchema = z.object({
  serviceLimitations: z.array(z.string()).describe("Service limitations and restrictions"),
  userObligations: z.array(z.string()).describe("User obligations and responsibilities"),
  terminationClauses: z.array(z.string()).describe("Termination clauses"),
  liabilityLimitations: z.string().describe("Liability limitations, use 'Not specified' if not found"),
  disputeResolution: z.string().describe("Dispute resolution process, use 'Not specified' if not found"),
  dataOwnership: z.string().describe("Data ownership clauses, use 'Not specified' if not found"),
});

interface ComplianceData {
  company: string;
  url: string;
  lastUpdated: string;
  privacyPolicy: z.infer<typeof PrivacyPolicySchema>;
  termsOfService: z.infer<typeof TermsOfServiceSchema>;
}

async function extractPrivacyPolicy(
  agent: HyperAgent,
  company: string,
  privacyUrl: string
): Promise<z.infer<typeof PrivacyPolicySchema>> {
  console.log(`  🔒 Extracting privacy policy for: ${company}\n`);

  const page = await agent.newPage();

  try {
    await page.goto(privacyUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    await page.aiAction("accept or close any cookie banners");
    await page.waitForTimeout(2000);

    await page.aiAction("scroll down to see privacy policy content");
    await page.waitForTimeout(3000);

    const privacyData = await page.extract(
      "Extract from this privacy policy: types of data collected, how data is used, data retention period, third parties data is shared with, list of sub-processors with their purpose and location, user rights, and security measures. Use 'Not specified' for missing text fields and empty arrays for missing lists.",
      PrivacyPolicySchema,
      { maxSteps: 3 }
    );

    console.log(`     ✓ Extracted privacy policy sections\n`);
    return privacyData;
  } catch (error) {
    console.error(`Error extracting privacy policy for ${company}:`, error);
    return {
      dataCollected: [],
      dataUsage: [],
      dataRetention: "Not specified",
      dataSharing: [],
      subProcessors: [],
      userRights: [],
      securityMeasures: [],
    };
  }
}

async function extractTermsOfService(
  agent: HyperAgent,
  company: string,
  tosUrl: string
): Promise<z.infer<typeof TermsOfServiceSchema>> {
  console.log(`  📄 Extracting terms of service for: ${company}\n`);

  const page = await agent.newPage();

  try {
    await page.goto(tosUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    await page.aiAction("accept or close any cookie banners");
    await page.waitForTimeout(2000);

    await page.aiAction("scroll down to see terms of service content");
    await page.waitForTimeout(3000);

    const tosData = await page.extract(
      "Extract from these terms of service: service limitations and restrictions, user obligations and responsibilities, termination clauses, liability limitations, dispute resolution process, and data ownership clauses. Use 'Not specified' for missing text fields and empty arrays for missing lists.",
      TermsOfServiceSchema,
      { maxSteps: 3 }
    );

    console.log(`     ✓ Extracted terms of service sections\n`);
    return tosData;
  } catch (error) {
    console.error(`Error extracting TOS for ${company}:`, error);
    return {
      serviceLimitations: [],
      userObligations: [],
      terminationClauses: [],
      liabilityLimitations: "Not specified",
      disputeResolution: "Not specified",
      dataOwnership: "Not specified",
    };
  }
}

function generateComplianceReport(data: ComplianceData[]): void {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `compliance-report-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`\n💾 Full compliance data saved to: ${filename}\n`);

  // Also generate CSV for sub-processors
  const csvFilename = `sub-processors-${timestamp}.csv`;
  let csvContent = "Company,Sub-Processor,Purpose,Location\n";

  data.forEach((company) => {
    company.privacyPolicy.subProcessors.forEach((sp) => {
      csvContent += `"${company.company}","${sp.name}","${sp.purpose || "N/A"}","${sp.location || "N/A"}"\n`;
    });
  });

  fs.writeFileSync(csvFilename, csvContent);
  console.log(`📊 Sub-processors CSV saved to: ${csvFilename}\n`);
}

async function extractComplianceData(companies: Array<{ name: string; privacyUrl: string; tosUrl: string }>) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("⚖️  Legal Compliance Extractor\n");
  console.log("=".repeat(70) + "\n");

  const allComplianceData: ComplianceData[] = [];

  try {
    for (const company of companies) {
      console.log(`🏢 Processing: ${company.name}\n`);

      const privacyPolicy = await extractPrivacyPolicy(agent, company.name, company.privacyUrl);
      const termsOfService = await extractTermsOfService(agent, company.name, company.tosUrl);

      allComplianceData.push({
        company: company.name,
        url: company.privacyUrl,
        lastUpdated: new Date().toISOString(),
        privacyPolicy,
        termsOfService,
      });
    }

    // Display summary
    console.log("\n" + "=".repeat(70));
    console.log("COMPLIANCE SUMMARY");
    console.log("=".repeat(70) + "\n");

    allComplianceData.forEach((data, i) => {
      console.log(`${i + 1}. ${data.company}\n`);

      console.log("   📊 DATA COLLECTION & USAGE:");
      console.log(`      Data Types Collected: ${data.privacyPolicy.dataCollected.length}`);
      data.privacyPolicy.dataCollected.slice(0, 3).forEach((item) => {
        console.log(`        • ${item}`);
      });

      console.log(`\n   ⏱️  DATA RETENTION:`);
      console.log(`      ${data.privacyPolicy.dataRetention || "Not specified"}`);

      console.log(`\n   🤝 SUB-PROCESSORS (${data.privacyPolicy.subProcessors.length}):`);
      data.privacyPolicy.subProcessors.slice(0, 5).forEach((sp) => {
        console.log(`      • ${sp.name}${sp.location ? ` (${sp.location})` : ""}`);
        if (sp.purpose) console.log(`        Purpose: ${sp.purpose}`);
      });

      console.log(`\n   🔐 SECURITY MEASURES:`);
      data.privacyPolicy.securityMeasures.slice(0, 3).forEach((measure) => {
        console.log(`      • ${measure}`);
      });

      console.log(`\n   👤 USER RIGHTS:`);
      data.privacyPolicy.userRights.slice(0, 3).forEach((right) => {
        console.log(`      • ${right}`);
      });

      console.log(`\n   ⚠️  KEY TOS ITEMS:`);
      console.log(`      Service Limitations: ${data.termsOfService.serviceLimitations.length} clauses`);
      console.log(`      User Obligations: ${data.termsOfService.userObligations.length} items`);
      console.log(`      Data Ownership: ${data.termsOfService.dataOwnership || "Not specified"}`);

      console.log("\n" + "-".repeat(70) + "\n");
    });

    // Generate reports
    generateComplianceReport(allComplianceData);

    // Compliance insights
    console.log("💡 COMPLIANCE INSIGHTS:\n");

    const totalSubProcessors = allComplianceData.reduce(
      (sum, d) => sum + d.privacyPolicy.subProcessors.length,
      0
    );
    console.log(`   • Total Sub-Processors Across All Companies: ${totalSubProcessors}`);

    const companiesWithRetention = allComplianceData.filter(
      (d) => d.privacyPolicy.dataRetention
    ).length;
    console.log(`   • Companies with Clear Retention Policy: ${companiesWithRetention}/${allComplianceData.length}`);

    const avgUserRights = (
      allComplianceData.reduce((sum, d) => sum + d.privacyPolicy.userRights.length, 0) /
      allComplianceData.length
    ).toFixed(1);
    console.log(`   • Average User Rights Listed: ${avgUserRights}`);

    console.log("\n✓ Compliance extraction complete!\n");

    return allComplianceData;
  } finally {
    await agent.closeAgent();
  }
}

// Example: Extract compliance data from a single company
extractComplianceData([
  {
    name: "Stripe",
    privacyUrl: "https://stripe.com/privacy",
    tosUrl: "https://stripe.com/legal/ssa",
  },
]);

// Example: Extract for multiple companies
// extractComplianceData([
//   {
//     name: "Notion",
//     privacyUrl: "https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091",
//     tosUrl: "https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac",
//   },
//   {
//     name: "Slack",
//     privacyUrl: "https://slack.com/privacy-policy",
//     tosUrl: "https://slack.com/terms-of-service",
//   },
// ]);


