import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";

config();

interface OnboardingData {
  username: string;
  password: string;
}

async function completeOnboarding(data: OnboardingData) {
  const agent = new HyperAgent({
    // llm: {
    //   provider: "openai",
    //   model: "gpt-4o",
    // },
    llm: {
      provider: "anthropic",
      model: "claude-sonnet-4-0",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://multi-step-form-tawny.vercel.app/");

  console.log("Step 1: Your info");
  await page.aiAction("Fill John Smith in the name field");
  await page.aiAction("Fill John.Smith@example.com in the email field");
  await page.aiAction("Fill 1234567890 in the phone number field");
  await page.aiAction("Click the next step button");

  console.log("Step 2: Select plan");
  await page.aiAction("select the arcade plan");
  await page.aiAction("Click the next step button");

  console.log("Step 3: Add-ons");
  await page.aiAction("uncheck the Online Service option");
  await page.aiAction("check the Customizable Profile option");
  await page.aiAction("click the next step button");

  console.log("Step 4: Summary");
  await page.aiAction("click the confirm button");

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await agent.closeAgent();
}

const sampleData: OnboardingData = {
  username: "student",
  password: "Password123",
};

completeOnboarding(sampleData);
