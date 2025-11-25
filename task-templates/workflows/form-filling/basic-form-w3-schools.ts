import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";

config();

async function automateForm() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  const page = await agent.newPage();

  await page.goto("https://www.w3schools.com/html/html_forms.asp");

  await page.aiAction("scroll down to find the form example");

  await page.aiAction("fill the first name field with John");
  await page.aiAction("fill the last name field with Doe");
  await page.aiAction("click the submit button");

  await page.waitForTimeout(2000);

  console.log("Form submitted successfully!");

  await agent.closeAgent();
}

automateForm();

