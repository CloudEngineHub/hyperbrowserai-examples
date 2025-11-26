/**
 * Template: Dropdown Navigation
 * Category: Concepts
 * Use Case: Navigate and interact with complex dropdown menus
 * Target Sites: Various real sites with dropdown menus
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const DropdownOptionsSchema = z.object({
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      isSelected: z.boolean(),
      isDisabled: z.boolean(),
    })
  ),
});

const MenuStructureSchema = z.object({
  menuItems: z.array(
    z.object({
      label: z.string(),
      hasSubmenu: z.boolean(),
      subItems: z.array(z.string()),
    })
  ),
});

/**
 * Pattern 1: Standard Select Dropdown
 * Native HTML <select> element - using W3Schools form example
 */
async function selectFromStandardDropdown(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📋 Standard Select Dropdown - W3Schools Cars Example\n`);

  try {
    const page = await agent.newPage();
    await page.goto(
      "https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select"
    );
    await page.waitForTimeout(3000);

    // Switch to the result iframe
    await page.aiAction("click inside the result frame or iframe");
    await page.waitForTimeout(1000);

    // Get current options
    const options = await page.extract(
      "List all options in the cars dropdown with value, label, selected state, and disabled state",
      DropdownOptionsSchema
    );

    console.log("Available car options:");
    options.options.forEach((opt) => {
      const selected = opt.isSelected ? " ✓" : "";
      console.log(`  - ${opt.label}${selected}`);
    });

    // Select Audi
    await page.aiAction("click on the cars dropdown");
    await page.waitForTimeout(500);
    await page.aiAction('select "Audi" from the dropdown');
    await page.waitForTimeout(1000);

    console.log(`\n✅ Selected: Audi`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 2: Custom Styled Dropdown
 * JavaScript-based dropdown - using MUI demo
 */
async function selectFromCustomDropdown(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📋 Custom Styled Dropdown - Material UI Demo\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://mui.com/material-ui/react-select/");
    await page.waitForTimeout(3000);

    // Find the first demo select
    await page.aiAction("scroll to the first Select demo component");
    await page.waitForTimeout(1000);

    // Click to open the dropdown
    await page.aiAction("click on the Age dropdown to open it");
    await page.waitForTimeout(1000);

    // Get available options
    const options = await page.extract(
      "Extract all visible dropdown options in the open menu",
      z.object({
        options: z.array(z.string()),
      })
    );

    console.log("Available options:", options.options.join(", "));

    // Click an option
    await page.aiAction('click on "Twenty" option');
    await page.waitForTimeout(1000);

    console.log(`✅ Selected: Twenty`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 3: Autocomplete/Searchable Dropdown
 * Type to filter options - using Google Flights city selector
 */
async function selectFromSearchableDropdown(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🔍 Searchable Autocomplete - Google Flights\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.google.com/travel/flights");
    await page.waitForTimeout(3000);

    // Click on departure field
    await page.aiAction("click on the departure/from city input field");
    await page.waitForTimeout(1000);

    // Type search text
    await page.aiAction('type "Los Angeles" in the departure field');
    await page.waitForTimeout(2000);

    // Get suggestions
    const suggestions = await page.extract(
      "Extract all airport/city suggestions currently shown",
      z.object({
        suggestions: z.array(z.string()),
      })
    );

    console.log(
      "Airport suggestions:",
      suggestions.suggestions.slice(0, 5).join(", ")
    );

    // Select the first option
    await page.aiAction("click on the first Los Angeles airport suggestion");
    await page.waitForTimeout(1000);

    console.log(`✅ Selected: Los Angeles airport`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 4: Multi-Select Dropdown
 * Select multiple options - using Indeed job filters
 */
async function selectMultipleFromDropdown(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📋 Multi-select Filters - Indeed Job Search\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.indeed.com/jobs?q=software+engineer&l=");
    await page.waitForTimeout(4000);

    // Click on Job Type filter
    await page.aiAction("click on the search bar");
    await page.waitForTimeout(1000);

    // Get filter options
    const options = await page.extract(
      "Extract all filter options visible in the dropdown",
      z.object({
        options: z.array(z.string()),
      })
    );

    console.log("Available filters:", options.options.slice(0, 6).join(", "));

    // Select a filter option
    await page.aiAction("select or check Full-time option if available");
    await page.waitForTimeout(1000);

    console.log(`✅ Applied filter`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 5: Cascading/Dependent Dropdowns
 * Second dropdown depends on first - using UPS shipping form
 */
async function navigateCascadingDropdowns(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🔗 Cascading Dropdowns - Location Selection\n`);

  try {
    const page = await agent.newPage();
    // Using a demo form with country/state cascading
    await page.goto(
      "https://www.w3schools.com/howto/howto_js_cascading_dropdown.asp"
    );
    await page.waitForTimeout(3000);

    // Click Try it Yourself
    await page.aiAction("click the Try it Yourself button");
    await page.waitForTimeout(2000);

    // Work in the result frame
    await page.aiAction("click inside the result frame");
    await page.waitForTimeout(1000);

    // Select from first dropdown
    console.log("  Level 1: Selecting car brand...");
    await page.aiAction("click on the first/cars dropdown");
    await page.waitForTimeout(500);
    await page.aiAction('select "Audi" from the dropdown');
    await page.waitForTimeout(1500);

    // Select from dependent dropdown
    console.log("  Level 2: Selecting car model...");
    await page.aiAction("click on the second/models dropdown");
    await page.waitForTimeout(500);
    await page.aiAction("select the first model option");
    await page.waitForTimeout(1000);

    console.log(`\n✅ Cascading selection completed`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 6: Mega Menu / Hover Menu Navigation
 * Hover to reveal submenus - using Best Buy navigation
 */
async function navigateMegaMenu(): Promise<void> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📂 Mega Menu Navigation - Best Buy\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.bestbuy.com/");
    await page.waitForTimeout(3000);

    // Close any popups
    await page.aiAction("close any popup or modal if present");
    await page.waitForTimeout(1000);

    // Hover over main menu item
    console.log("  1. Hover: Computers & Tablets");
    await page.aiAction("hover over 'Computers & Tablets' in the main menu");
    await page.waitForTimeout(1500);

    // Extract submenu items
    const submenu = await page.extract(
      "Extract the submenu items that appeared",
      z.object({
        items: z.array(z.string()),
      })
    );

    console.log("  Submenu items:", submenu.items.slice(0, 5).join(", "));

    // Click on a submenu item
    console.log("  2. Click: Laptops");
    await page.aiAction("click on 'Laptops' in the submenu");
    await page.waitForTimeout(2000);

    console.log(`\n✅ Navigation completed - now on Laptops page`);
  } finally {
    await agent.closeAgent();
  }
}

/**
 * Pattern 7: Extract All Menu Options
 * Get complete menu structure - using Amazon
 */
async function extractMenuStructure(): Promise<
  z.infer<typeof MenuStructureSchema>
> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📋 Extracting Menu Structure - Amazon\n`);

  try {
    const page = await agent.newPage();
    await page.goto("https://www.amazon.com/");
    await page.waitForTimeout(3000);

    // Open the hamburger menu
    await page.aiAction("click on the 'All' hamburger menu button");
    await page.waitForTimeout(2000);

    // Extract main menu items
    const menuStructure = await page.extract(
      "Extract the main menu categories. For each, note if it has a submenu arrow and list any visible subcategories",
      MenuStructureSchema
    );

    console.log("=".repeat(50));
    console.log("AMAZON MENU STRUCTURE");
    console.log("=".repeat(50));

    menuStructure.menuItems.slice(0, 10).forEach((item) => {
      console.log(`\n📁 ${item.label}${item.hasSubmenu ? " ▶" : ""}`);
      if (item.subItems.length > 0) {
        item.subItems.slice(0, 3).forEach((sub) => console.log(`   └─ ${sub}`));
      }
    });

    return menuStructure;
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
console.log("=".repeat(60));
console.log("DROPDOWN NAVIGATION PATTERNS");
console.log("=".repeat(60));

console.log(`
Available patterns with real examples:

1. selectFromStandardDropdown()     
   → W3Schools <select> element demo

2. selectFromCustomDropdown()       
   → Material UI styled dropdown demo

3. selectFromSearchableDropdown()   
   → Google Flights city autocomplete

4. selectMultipleFromDropdown()     
   → Indeed job filters

5. navigateCascadingDropdowns()     
   → W3Schools cascading dropdown demo

6. navigateMegaMenu()               
   → Best Buy category navigation

7. extractMenuStructure()           
   → Amazon hamburger menu analysis
`);

// Run an example - Google Flights autocomplete
// selectFromSearchableDropdown();

// selectFromStandardDropdown();
selectMultipleFromDropdown();
// selectFromCustomDropdown();
// navigateCascadingDropdowns();
// navigateMegaMenu();
// extractMenuStructure();
