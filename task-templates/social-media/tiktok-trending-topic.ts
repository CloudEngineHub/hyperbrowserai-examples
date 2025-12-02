/**
 * Template: TikTok Video Downloader
 * Category: Social Media
 * Use Case: Download a trending video from TikTok explore page
 * Target Site: tiktok.com/explore
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import https from "https";
// uncomment to view the video recording if you run with hyperbrowser
// import {
//   videoSessionConfig,
//   waitForVideoAndDownload,
//   getSessionId,
// } from "../utils/video-recording";

config();

const DOWNLOADS_DIR = path.join(__dirname, "..", "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

/**
 * Downloads a file from a URL to a local path
 */
async function downloadVideo(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https
      .get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(destPath);
            downloadVideo(redirectUrl, destPath).then(resolve).catch(reject);
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
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });
  });
}

async function downloadTikTokVideo(): Promise<string | null> {
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

  console.log("=".repeat(60));
  console.log("TIKTOK VIDEO DOWNLOADER");
  console.log("=".repeat(60));

  let sessionId: string | null = null;

  try {
    const page = await agent.newPage();
    // sessionId = getSessionId(agent);

    // 1. Navigate to TikTok explore page
    console.log("\n📱 Navigating to TikTok explore page...");
    await page.goto("https://www.tiktok.com/explore");

    // 2. Click on the first video
    console.log("🎬 Clicking on the first video...");
    await page.aiAction("click on the first video in the list");

    // 3. Pause the video
    console.log("⏸️  Pausing the video...");
    await page.aiAction("click on the video to pause it");
    await page.waitForTimeout(1000);

    // 4. Get the video source URL using Playwright selector
    console.log("🔍 Finding video element...");

    const videoSrc = await page.evaluate(() => {
      // Find the video player container
      const container = document.querySelector(
        ".xgplayer-container.tiktok-web-player"
      );
      if (!container) {
        // Try alternative selector
        const altContainer = document.querySelector('[class*="xgplayer"]');
        if (altContainer) {
          const video = altContainer.querySelector("video");
          return video?.src || null;
        }
        return null;
      }

      const video = container.querySelector("video");
      return video?.src || null;
    });

    if (!videoSrc) {
      console.log("❌ Could not find video source URL");

      // Try to get it from the video tag directly
      const altVideoSrc = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll("video"));
        for (const video of videos) {
          if (video.src && video.src.includes("tiktok")) {
            return video.src;
          }
        }
        // Check source elements
        for (const video of videos) {
          const source = video.querySelector("source");
          if (source?.src && source.src.includes("tiktok")) {
            return source.src;
          }
        }
        return null;
      });

      if (!altVideoSrc) {
        console.log("❌ No video source found in any video element");
        return null;
      }

      console.log("✅ Found video source (alternative method)");
      console.log(`   URL: ${altVideoSrc.substring(0, 100)}...`);

      // Download the video
      const filename = `tiktok-${Date.now()}.mp4`;
      const destPath = path.join(DOWNLOADS_DIR, filename);

      console.log(`\n📥 Downloading video to: downloads/${filename}`);
      await downloadVideo(altVideoSrc, destPath);
      console.log(`✅ Video saved: downloads/${filename}`);

      return destPath;
    }

    console.log("✅ Found video source");
    console.log(`   URL: ${videoSrc.substring(0, 100)}...`);

    // 5. Download the video
    const filename = `tiktok-${Date.now()}.mp4`;
    const destPath = path.join(DOWNLOADS_DIR, filename);

    console.log(`\n📥 Downloading video to: downloads/${filename}`);
    await downloadVideo(videoSrc, destPath);
    console.log(`✅ Video saved: downloads/${filename}`);

    return destPath;
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  } finally {
    await agent.closeAgent();

    // uncomment to download the video recording if you run with hyperbrowser
    // if (sessionId) {
    //   await waitForVideoAndDownload(
    //     sessionId,
    //     "social-media",
    //     "tiktok-video-download"
    //   );
    // }
  }
}

// Run the downloader
downloadTikTokVideo();
