import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";

config();

interface OnboardingData {
  username: string;
  password: string;
}

async function completeOnboarding(data: OnboardingData) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://practicetestautomation.com/practice-test-login/");

  await page.aiAction("click the get started button");

  await page.waitForTimeout(2000);

  console.log("Step 1: Personal Information");
  await page.aiAction(`fill the full name field with ${data.username}`);
  await page.aiAction(`fill the password field with ${data.password}`);
  await page.aiAction("click the next button");

  await page.waitForTimeout(2000);

  console.log("Step 2: Company Information");
  await page.aiAction("click the next button");

  await page.waitForTimeout(2000);

  console.log("Step 3: Team Details");
  await page.aiAction("click the complete setup button");

  await page.waitForTimeout(2000);

  console.log("Onboarding completed successfully!");

  await agent.closeAgent();
}

const sampleData: OnboardingData = {
  username: "student",
  password: "Password123",
};

completeOnboarding(sampleData);

