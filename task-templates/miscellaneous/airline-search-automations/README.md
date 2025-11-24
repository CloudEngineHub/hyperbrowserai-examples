# Airline Search Automation

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Automate flight searches and extract pricing data across multiple airline and travel platforms using HyperAgent's `aiAction()` API.

## Features

- Search flights on Kayak and Google Flights
- Extract structured flight data with prices
- Compare prices across multiple sources
- Fast, reliable automation with `aiAction()`

## Prerequisites

Get an API key from [Hyperbrowser](https://hyperbrowser.ai) and an LLM provider key (OpenAI recommended).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and add your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
```

## Usage

Run individual platform searches:

```bash
npm run kayak
npm run google
```

Compare prices across platforms:

```bash
npm run compare
```

## How It Works

Each script uses HyperAgent's `aiAction()` for reliable single actions:

```typescript
await page.aiAction("click the origin input field");
await page.aiAction("type Miami into the origin field");
await page.aiAction("select Miami from the dropdown suggestions");
await page.aiAction("click the search flights button");
```

Then extracts structured data:

```typescript
const flights = await page.extract(
  "Extract flight results with airline, price, departure, arrival, duration, and stops",
  FlightResultSchema
);
```

## Growth Use Case

Build price comparison tools, flight deal alerts, or travel planning assistants that monitor multiple airline sources automatically.

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.

