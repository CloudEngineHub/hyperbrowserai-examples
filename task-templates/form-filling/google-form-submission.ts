import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";

// if you want you can view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

interface FormResponse {
  name: string;
  email: string;
  feedback: string;
  rating: string;
}

async function submitGoogleForm(responses: FormResponse) {
  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "gpt-4o",
    },
    // uncomment to run with hyperbrowser provider
    //  browserProvider: "Hyperbrowser",
    // hyperbrowserConfig: {
    //   sessionConfig: {
    //     useUltraStealth: tr  ue,
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

    await page.goto(
      "https://docs.google.com/forms/d/e/1FAIpQLScPkE8wNLpPSkP2d__Ee7xx5Pj7_XDuZ0p16geYWrp73Nutmw/viewform?usp=dialog"
    );

    await page.waitForTimeout(2000);

    await page.aiAction(`fill the name field with ${responses.name}`);
    await page.aiAction(`fill the email field with ${responses.email}`);
    await page.aiAction(
      `fill the feedback text area with ${responses.feedback}`
    );
    await page.aiAction(`select ${responses.rating} rating option`);

    await page.aiAction("click the submit button");

    await page.waitForTimeout(2000);

    console.log("Google Form submitted successfully!");
  } finally {
    await agent.closeAgent();

    // Download video recording
    // uncomment to download the video recording if you run with hyperbrowser
    //  if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "form-filling",
    //     "google-form-submission"
    //   );
    // }
  }
}

const sampleResponses: FormResponse = {
  name: "John Doe",
  email: "john.doe@example.com",
  feedback: "This is a test feedback submission using HyperAgent automation.",
  rating: "5",
};

submitGoogleForm(sampleResponses);
