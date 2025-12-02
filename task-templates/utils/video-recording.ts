/**
 * Shared utility for handling video recordings from HyperAgent sessions
 */

import { Hyperbrowser } from "@hyperbrowser/sdk";
import * as fs from "fs";
import * as path from "path";
import https from "https";
import http from "http";

const VIDEOS_DIR = path.join(__dirname, "..", "videos");

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

/**
 * Common HyperAgent session configuration for video recording
 */
export const videoSessionConfig = {
  enableVideoWebRecording: true,
  screen: {
    width: 1920,
    height: 1080,
  },
};

/**
 * Downloads a file from a URL to a local path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(destPath);
            downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

/**
 * Waits for video recording to be ready and downloads it locally
 * @param sessionId - The Hyperbrowser session ID
 * @param category - Category folder name (e.g., "ai-pipelines", "booking")
 * @param exampleName - Name of the example (used for filename)
 * @param maxWaitMs - Maximum time to wait for video processing (default: 5 minutes)
 * @param pollIntervalMs - Interval between status checks (default: 5 seconds)
 * @returns Path to the downloaded video file, or null if failed
 */
export async function waitForVideoAndDownload(
  sessionId: string,
  category: string,
  exampleName: string,
  maxWaitMs: number = 300000,
  pollIntervalMs: number = 5000
): Promise<string | null> {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  const startTime = Date.now();

  // Ensure category directory exists
  const categoryDir = path.join(VIDEOS_DIR, category);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  console.log(`\n🎬 Waiting for video recording to be ready...`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const videoResponse = await client.sessions.getVideoRecordingURL(
        sessionId
      );

      if (videoResponse.status === "completed" && videoResponse.recordingUrl) {
        console.log(`✅ Video ready!`);

        // Simple filename without timestamp (overwrites previous)
        const filename = `${exampleName}.mp4`;
        const destPath = path.join(categoryDir, filename);

        console.log(`📥 Downloading video to: videos/${category}/${filename}`);

        await downloadFile(videoResponse.recordingUrl, destPath);

        console.log(`✅ Video saved: videos/${category}/${filename}`);
        return destPath;
      } else if (videoResponse.status === "failed") {
        console.error(
          `❌ Video recording failed: ${videoResponse.error || "Unknown error"}`
        );
        return null;
      } else {
        console.log(`   Status: ${videoResponse.status}...`);
      }
    } catch (error) {
      console.error(`   Error checking video status:`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.error(`❌ Timeout waiting for video recording`);
  return null;
}

/**
 * Gets the session ID from a HyperAgent instance
 * Must be called AFTER the browser has been initialized (after newPage() or initBrowser())
 */
export function getSessionId(agent: any): string | null {
  const session = agent.getSession();
  return session?.id || null;
}
