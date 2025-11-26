/**
 * Template: TikTok Trending Sounds
 * Category: Social Media
 * Use Case: Extract trending sounds/music data from TikTok
 * Target Site: tiktok.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const TrendingSoundsSchema = z.object({
  sounds: z.array(
    z.object({
      title: z.string(),
      artist: z.string().nullable(),
      videosUsing: z.string(),
      duration: z.string().nullable(),
      isOriginal: z.boolean(),
      coverImageUrl: z.string().nullable(),
    })
  ),
});

const SoundDetailSchema = z.object({
  title: z.string(),
  artist: z.string().nullable(),
  totalVideos: z.string(),
  duration: z.string().nullable(),
  albumName: z.string().nullable(),
  isOriginal: z.boolean(),
  topVideos: z.array(
    z.object({
      creator: z.string(),
      likes: z.string(),
      views: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
});

const CreatorSoundsSchema = z.object({
  creator: z.string(),
  sounds: z.array(
    z.object({
      title: z.string(),
      videosUsing: z.string(),
      isOriginal: z.boolean(),
    })
  ),
});

interface TrendingSoundsAnalysis {
  sounds: z.infer<typeof TrendingSoundsSchema>["sounds"];
  analysis: {
    totalSounds: number;
    originalSounds: number;
    mostUsed: string;
    averageUsage: number;
  };
}

function parseUsageCount(str: string): number {
  const clean = str.toLowerCase().replace(/[,\s]/g, "");
  const match = clean.match(/([\d.]+)\s*([kmb])?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1000;
  if (match[2] === "m") num *= 1000000;
  if (match[2] === "b") num *= 1000000000;
  return Math.round(num);
}

async function extractTrendingSounds(): Promise<TrendingSoundsAnalysis> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("🎵 Extracting TikTok Trending Sounds...\n");

  try {
    const page = await agent.newPage();

    // Navigate to TikTok discover/trending
    await page.goto("https://www.tiktok.com/discover");
    await page.waitForTimeout(4000);

    // Handle any popups
    await page.aiAction("close any popup or cookie consent if present");
    await page.waitForTimeout(1000);

    // Look for trending sounds section
    await page.aiAction("click on music or sounds tab if available");
    await page.waitForTimeout(2000);

    // Scroll to load more
    for (let i = 0; i < 2; i++) {
      await page.aiAction("scroll down to load more trending sounds");
      await page.waitForTimeout(1500);
    }

    // Extract trending sounds
    console.log("  🎶 Extracting trending sounds...");
    const soundsData = await page.extract(
      "Extract trending sounds/music with title, artist name, number of videos using the sound, duration, whether it's an original sound, and cover image URL",
      TrendingSoundsSchema
    );

    // Calculate analysis
    const sounds = soundsData.sounds;
    const usageCounts = sounds.map((s) => parseUsageCount(s.videosUsing));
    const totalUsage = usageCounts.reduce((a, b) => a + b, 0);

    const mostUsedIndex = usageCounts.indexOf(Math.max(...usageCounts));
    const mostUsed = sounds[mostUsedIndex]?.title || "N/A";

    const analysis = {
      totalSounds: sounds.length,
      originalSounds: sounds.filter((s) => s.isOriginal).length,
      mostUsed,
      averageUsage: sounds.length > 0 ? Math.round(totalUsage / sounds.length) : 0,
    };

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("TIKTOK TRENDING SOUNDS");
    console.log("=".repeat(60));

    console.log(`\n📊 OVERVIEW`);
    console.log(`   Total sounds tracked: ${analysis.totalSounds}`);
    console.log(`   Original sounds: ${analysis.originalSounds}`);
    console.log(`   Licensed music: ${analysis.totalSounds - analysis.originalSounds}`);
    console.log(`   Most used: "${analysis.mostUsed}"`);
    console.log(`   Average usage: ${analysis.averageUsage.toLocaleString()} videos`);

    console.log(`\n🎵 TOP TRENDING SOUNDS`);
    sounds.slice(0, 15).forEach((sound, i) => {
      const originalTag = sound.isOriginal ? " [Original]" : "";
      const artistTag = sound.artist ? ` - ${sound.artist}` : "";
      console.log(`\n   ${i + 1}. "${sound.title}"${artistTag}${originalTag}`);
      console.log(`      📹 ${sound.videosUsing} videos | ⏱️ ${sound.duration || "N/A"}`);
    });

    // Categorize by type
    const originalSounds = sounds.filter((s) => s.isOriginal);
    const licensedMusic = sounds.filter((s) => !s.isOriginal);

    if (originalSounds.length > 0) {
      console.log(`\n🎤 TOP ORIGINAL SOUNDS`);
      originalSounds.slice(0, 5).forEach((sound, i) => {
        console.log(`   ${i + 1}. "${sound.title}" - ${sound.videosUsing} videos`);
      });
    }

    if (licensedMusic.length > 0) {
      console.log(`\n🎶 TOP LICENSED MUSIC`);
      licensedMusic.slice(0, 5).forEach((sound, i) => {
        console.log(`   ${i + 1}. "${sound.title}" by ${sound.artist || "Unknown"} - ${sound.videosUsing} videos`);
      });
    }

    // Group by artist (for licensed music)
    const artistCounts: Record<string, number> = {};
    licensedMusic.forEach((sound) => {
      if (sound.artist) {
        artistCounts[sound.artist] = (artistCounts[sound.artist] || 0) + 1;
      }
    });

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topArtists.length > 0) {
      console.log(`\n👨‍🎤 TRENDING ARTISTS`);
      topArtists.forEach(([artist, count], i) => {
        console.log(`   ${i + 1}. ${artist} (${count} trending sounds)`);
      });
    }

    return { sounds, analysis };
  } finally {
    await agent.closeAgent();
  }
}

async function extractSoundDetails(soundUrl: string) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`\n🎵 Extracting sound details...\n`);

  try {
    const page = await agent.newPage();

    await page.goto(soundUrl);
    await page.waitForTimeout(4000);

    await page.aiAction("close any popup if present");
    await page.waitForTimeout(1000);

    // Scroll to load videos
    await page.aiAction("scroll down to load more videos using this sound");
    await page.waitForTimeout(2000);

    const details = await page.extract(
      "Extract sound title, artist, total videos using this sound, duration, album name if shown, whether it's original, and top 10 videos using this sound with creator name, likes, views, and description",
      SoundDetailSchema
    );

    console.log("=".repeat(50));
    console.log("SOUND DETAILS");
    console.log("=".repeat(50));

    console.log(`\n🎵 "${details.title}"`);
    console.log(`   Artist: ${details.artist || "Original Sound"}`);
    console.log(`   Album: ${details.albumName || "N/A"}`);
    console.log(`   Duration: ${details.duration || "N/A"}`);
    console.log(`   Total videos: ${details.totalVideos}`);
    console.log(`   Type: ${details.isOriginal ? "Original Sound" : "Licensed Music"}`);

    console.log(`\n📹 TOP VIDEOS USING THIS SOUND`);
    details.topVideos.slice(0, 5).forEach((video, i) => {
      console.log(`\n   ${i + 1}. @${video.creator}`);
      console.log(`      ❤️ ${video.likes} likes${video.views ? ` | 👀 ${video.views} views` : ""}`);
      if (video.description) {
        console.log(`      "${video.description.substring(0, 60)}..."`);
      }
    });

    return details;
  } finally {
    await agent.closeAgent();
  }
}

// Run trending sounds extraction
extractTrendingSounds();

// To get details about a specific sound:
// extractSoundDetails("https://www.tiktok.com/music/original-sound-1234567890");



