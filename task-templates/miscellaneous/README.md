# HyperAgent Template Examples

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Production-ready examples showcasing HyperAgent's `aiAction()` API for browser automation across various use cases.

## Prerequisites

1. Get an API key from [Hyperbrowser](https://hyperbrowser.ai)
2. Get an OpenAI API key (or Anthropic/Gemini/DeepSeek)

## Installation

```bash
npm install
```

Create a `.env` file in the root with your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
```

## Usage

Each example is a standalone TypeScript file. Run any example using npm scripts:

```bash
# Single-file examples
npm run airbnb
npm run calendar
npm run competitor
npm run crm
npm run form
npm run google-form
npm run infinite-scroll
npm run links
npm run onboarding
npm run reddit
npm run seo
npm run slow-loading
npm run youtube

# Airline search automation (multi-file project)
npm run airline:kayak
npm run airline:google
npm run airline:united
npm run airline:delta
npm run airline:compare
```

## Examples

### 🛫 airline-search-automation/
Multi-file project: Extract and compare flight prices from Kayak, Google Flights, United, and Delta.

```bash
cd airline-search-automation
npm install
npm run compare
```

### 🏠 airbnb-property-extraction.ts
Search and extract Airbnb property listings with prices, ratings, and amenities.

### 📅 calendar-booking.ts
Automate calendar bookings and appointment scheduling.

### 🏆 competitor-feature-comparison.ts
Compare features across competitor websites.

### 👥 crm-automation.ts
Automate CRM tasks like creating contacts in HubSpot.

### 📝 form-automation.ts
Automate web form filling with single `aiAction()` calls per field.

### 📋 google-form-submission.ts
Submit Google Forms programmatically.

### 🔄 infinite-scroll-items.ts
Handle infinite scroll pages (Twitter, Hacker News, etc.) and extract all loaded items.

### 🔗 link-extraction.ts
Extract all links from any webpage with structured output.

### 🚀 multi-step-onboarding.ts
Automate complex multi-step signup and onboarding flows.

### 💬 reddit-research.ts
Research Reddit topics, extract posts and comments.

### 🔍 seo-content-structure.ts
Extract SEO metadata, headings, and content structure.

### ⏳ slow-loading-ui-elements.ts
Handle slow-loading and lazy-loaded UI elements.

### 🎥 youtube-research.ts
Research YouTube videos and channels, extract metadata.

## How It Works

All examples use HyperAgent's `aiAction()` for fast, reliable single actions:

```typescript
import { HyperAgent } from "@hyperbrowser/agent";

const agent = new HyperAgent({
  llm: { provider: "openai", model: "gpt-4o" }
});

const page = await agent.newPage();
await page.goto("https://example.com");

await page.aiAction("click the search button");
await page.aiAction("type laptop into search");

const data = await page.extract("extract results", schema);

await agent.closeAgent();
```

## Growth Use Cases

These templates demonstrate real-world automation that drives business value:
- Price monitoring and comparison
- Lead generation and CRM enrichment
- Content research and SEO analysis
- Competitive intelligence
- Automated testing and QA

## Documentation

Full HyperAgent docs: [https://docs.hyperbrowser.ai](https://docs.hyperbrowser.ai)

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.
