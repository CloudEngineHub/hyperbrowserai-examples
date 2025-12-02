/**
 * Template: Currency Exchange Rates
 * Category: Finance
 * Use Case: Extract multi-currency exchange rates
 * Target Sites: xe.com, google.com/finance
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

const ExchangeRateSchema = z.object({
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.string(),
  inverseRate: z.string(),
  lastUpdated: z.string().nullable(),
  change24h: z.string().nullable(),
  changePercent: z.string().nullable(),
});

const MultiRateSchema = z.object({
  baseCurrency: z.string(),
  rates: z.array(
    z.object({
      currency: z.string(),
      currencyName: z.string(),
      rate: z.string(),
      change: z.string().nullable(),
    })
  ),
  lastUpdated: z.string().nullable(),
});

const HistoricalRateSchema = z.object({
  fromCurrency: z.string(),
  toCurrency: z.string(),
  currentRate: z.string(),
  history: z.array(
    z.object({
      date: z.string(),
      rate: z.string(),
    })
  ),
  stats: z.object({
    high30Day: z.string().nullable(),
    low30Day: z.string().nullable(),
    average30Day: z.string().nullable(),
  }),
});

const MAJOR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "CNY",
];

interface ConversionResult {
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  rate: number;
  timestamp: string;
}

async function getExchangeRate(
  from: string,
  to: string
): Promise<z.infer<typeof ExchangeRateSchema>> {
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

  console.log(
    `💱 Getting exchange rate: ${from.toUpperCase()} → ${to.toUpperCase()}\n`
  );

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto(
      `https://www.xe.com/currencyconverter/convert/?Amount=1&From=${from.toUpperCase()}&To=${to.toUpperCase()}`
    );
    await page.waitForTimeout(3000);

    const result = await page.extract(
      "Extract exchange rate information: from currency, to currency, exchange rate, inverse rate, last updated time, 24h change amount, and 24h change percentage",
      ExchangeRateSchema
    );

    // Display results
    console.log("=".repeat(50));
    console.log(`EXCHANGE RATE: ${from.toUpperCase()}/${to.toUpperCase()}`);
    console.log("=".repeat(50));

    console.log(`\n💰 CURRENT RATE`);
    console.log(
      `   1 ${result.fromCurrency} = ${result.rate} ${result.toCurrency}`
    );
    console.log(
      `   1 ${result.toCurrency} = ${result.inverseRate} ${result.fromCurrency}`
    );

    if (result.change24h || result.changePercent) {
      const isPositive = result.change24h && !result.change24h.includes("-");
      const arrow = isPositive ? "📈" : "📉";
      console.log(`\n${arrow} 24H CHANGE`);
      if (result.change24h) console.log(`   Amount: ${result.change24h}`);
      if (result.changePercent)
        console.log(`   Percent: ${result.changePercent}`);
    }

    if (result.lastUpdated) {
      console.log(`\n🕐 Last Updated: ${result.lastUpdated}`);
    }

    return result;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    //  if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "finance",
    //     "currency-exchange-rate"
    //   );
    // }
  }
}

async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<ConversionResult> {
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

  console.log(
    `💱 Converting ${amount} ${from.toUpperCase()} to ${to.toUpperCase()}\n`
  );

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto(
      `https://www.xe.com/currencyconverter/convert/?Amount=${amount}&From=${from.toUpperCase()}&To=${to.toUpperCase()}`
    );
    await page.waitForTimeout(3000);

    const ConversionSchema = z.object({
      fromAmount: z.string(),
      fromCurrency: z.string(),
      toAmount: z.string(),
      toCurrency: z.string(),
      rate: z.string(),
    });

    const result = await page.extract(
      "Extract the conversion result: from amount, from currency, converted amount, to currency, and exchange rate used",
      ConversionSchema
    );

    const rate = parseFloat(result.rate.replace(/[^0-9.]/g, ""));
    const toAmount = parseFloat(result.toAmount.replace(/[^0-9.]/g, ""));

    // Display
    console.log("=".repeat(50));
    console.log("CURRENCY CONVERSION");
    console.log("=".repeat(50));

    console.log(`\n   ${amount.toLocaleString()} ${from.toUpperCase()}`);
    console.log(`   ↓`);
    console.log(
      `   ${toAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${to.toUpperCase()}`
    );
    console.log(
      `\n   Rate: 1 ${from.toUpperCase()} = ${rate} ${to.toUpperCase()}`
    );

    return {
      from: { currency: from.toUpperCase(), amount },
      to: { currency: to.toUpperCase(), amount: toAmount },
      rate,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "finance",
    //     "currency-conversion"
    //   );
    // }
  }
}

async function getMajorRates(
  baseCurrency: string = "USD"
): Promise<z.infer<typeof MultiRateSchema>> {
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

  console.log(
    `💱 Getting major currency rates for ${baseCurrency.toUpperCase()}\n`
  );

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto(
      `https://www.xe.com/currencytables/?from=${baseCurrency.toUpperCase()}`
    );
    await page.waitForTimeout(3000);

    await page.aiAction("close cookie banner if present");
    await page.waitForTimeout(1000);

    const result = await page.extract(
      "Extract currency rates table: base currency, and for each currency extract the code, name, exchange rate, and 24h change if shown",
      MultiRateSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`EXCHANGE RATES - BASE: ${baseCurrency.toUpperCase()}`);
    console.log("=".repeat(60));

    console.log(
      "\nCurrency | Name                    | Rate           | Change"
    );
    console.log("-".repeat(60));

    // Filter to show major currencies first
    const majorRates = result.rates.filter((r) =>
      MAJOR_CURRENCIES.includes(r.currency.toUpperCase())
    );
    const otherRates = result.rates.filter(
      (r) => !MAJOR_CURRENCIES.includes(r.currency.toUpperCase())
    );

    [...majorRates, ...otherRates.slice(0, 10)].forEach((rate) => {
      const curr = rate.currency.padEnd(8);
      const name = rate.currencyName.padEnd(23).substring(0, 23);
      const rateStr = rate.rate.padEnd(14);
      const change = rate.change || "N/A";
      console.log(`${curr} | ${name} | ${rateStr} | ${change}`);
    });

    if (result.lastUpdated) {
      console.log(`\n🕐 Last Updated: ${result.lastUpdated}`);
    }

    return result;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //      await waitForVideoAndDownload(
    //     sessionId,
    //     "finance",
    //     "currency-major-rates"
    //   );
    // }
  }
}

async function getHistoricalRates(
  from: string,
  to: string
): Promise<z.infer<typeof HistoricalRateSchema>> {
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

  console.log(
    `📈 Getting historical rates: ${from.toUpperCase()}/${to.toUpperCase()}\n`
  );

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto(
      `https://www.xe.com/currencycharts/?from=${from.toUpperCase()}&to=${to.toUpperCase()}`
    );
    await page.waitForTimeout(3000);

    await page.aiAction("close cookie banner if present");
    await page.waitForTimeout(1000);

    // Look for 30-day chart data
    await page.aiAction("click on 30 day view if available");
    await page.waitForTimeout(1500);

    const result = await page.extract(
      "Extract historical rate data: from/to currencies, current rate, historical data points with date and rate, and 30-day statistics (high, low, average)",
      HistoricalRateSchema
    );

    // Display results
    console.log("=".repeat(60));
    console.log(`HISTORICAL RATES: ${from.toUpperCase()}/${to.toUpperCase()}`);
    console.log("=".repeat(60));

    console.log(`\n💰 CURRENT RATE: ${result.currentRate}`);

    console.log(`\n📊 30-DAY STATS`);
    console.log(`   High: ${result.stats.high30Day || "N/A"}`);
    console.log(`   Low: ${result.stats.low30Day || "N/A"}`);
    console.log(`   Average: ${result.stats.average30Day || "N/A"}`);

    if (result.history.length > 0) {
      console.log(`\n📈 RECENT HISTORY`);
      result.history.slice(0, 7).forEach((point) => {
        console.log(`   ${point.date}: ${point.rate}`);
      });
    }

    return result;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    // await waitForVideoAndDownload(
    //   sessionId,
    //   "finance",
    //   "currency-historical-rates"
    // );
    // }
  }
}

async function createRateMatrix(
  currencies: string[]
): Promise<Map<string, Map<string, string>>> {
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

  const matrix = new Map<string, Map<string, string>>();
  // let sessionId: string | null = null;

  console.log(
    `💱 Creating exchange rate matrix for ${currencies.length} currencies...\n`
  );

  try {
    for (const base of currencies) {
      console.log(`  Fetching rates for ${base}...`);
      matrix.set(base, new Map());

      const page = await agent.newPage();

      // Get session ID after first page is initialized
      // if (!sessionId) {
      // sessionId = getSessionId(agent);
      //  }

      await page.goto(`https://www.xe.com/currencytables/?from=${base}`);
      await page.waitForTimeout(2500);

      const RatesSchema = z.object({
        rates: z.array(
          z.object({
            currency: z.string(),
            rate: z.string(),
          })
        ),
      });

      const result = await page.extract(
        "Extract currency rates with currency code and rate",
        RatesSchema
      );

      result.rates.forEach((r) => {
        if (currencies.includes(r.currency.toUpperCase())) {
          matrix.get(base)!.set(r.currency.toUpperCase(), r.rate);
        }
      });
    }

    // Display matrix
    console.log("\n" + "=".repeat(70));
    console.log("EXCHANGE RATE MATRIX");
    console.log("=".repeat(70));

    // Header
    let header = "      ";
    currencies.forEach((c) => {
      header += c.padEnd(10);
    });
    console.log(header);
    console.log("-".repeat(70));

    // Rows
    currencies.forEach((base) => {
      let row = base.padEnd(6);
      currencies.forEach((target) => {
        if (base === target) {
          row += "1.0000".padEnd(10);
        } else {
          const rate = matrix.get(base)?.get(target) || "N/A";
          row += rate.substring(0, 8).padEnd(10);
        }
      });
      console.log(row);
    });

    return matrix;
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "finance",
    //     "currency-rate-matrix"
    //   );
    // }
  }
}

// Example: Get single exchange rate
getExchangeRate("USD", "EUR");

// Example: Convert amount
// convertCurrency(1000, "USD", "EUR");

// Example: Get major rates
// getMajorRates("USD");

// Example: Get historical rates
// getHistoricalRates("USD", "EUR");

// Example: Create rate matrix
// createRateMatrix(["USD", "EUR", "GBP", "JPY"]);
