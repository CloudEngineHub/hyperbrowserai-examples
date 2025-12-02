import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

async function automateForm() {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
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

  // let sessionId: string | null = null;

  try {
    const page = await agent.newPage();

    // Get session ID after browser is initialized
    // sessionId = getSessionId(agent);

    await page.goto("https://www.w3schools.com/html/html_forms.asp");
    await page.waitForTimeout(2000);

    await page.aiAction("scroll down to find the form example");

    await page.aiAction("fill the first name field with Lorem");
    await page.aiAction("fill the last name field with Ipsum");
    await page.aiAction("click the submit button");

    await page.waitForTimeout(2000);

    console.log("Form submitted successfully!");
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "form-filling",
    //     "basic-form-w3-schools"
    //   );
  }
}

automateForm();
