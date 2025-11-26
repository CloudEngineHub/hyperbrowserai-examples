/**
 * Template: YouTube Video Metadata Extractor
 * Category: Social Media
 * Use Case: Extract video info, description, and comments
 * Target Site: youtube.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const VideoMetadataSchema = z.object({
  title: z.string(),
  channelName: z.string(),
  channelSubscribers: z.string().nullable(),
  views: z.string(),
  likes: z.string().nullable(),
  uploadDate: z.string(),
  description: z.string(),
  duration: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  isLive: z.boolean(),
  isPremiere: z.boolean(),
});

const CommentsSchema = z.object({
  totalComments: z.string().nullable(),
  comments: z.array(
    z.object({
      author: z.string(),
      content: z.string(),
      likes: z.string().nullable(),
      timestamp: z.string(),
      isChannelOwner: z.boolean(),
      isPinned: z.boolean(),
      replyCount: z.string().nullable(),
    })
  ),
});

const RelatedVideosSchema = z.object({
  videos: z.array(
    z.object({
      title: z.string(),
      channelName: z.string(),
      views: z.string(),
      uploadDate: z.string(),
      duration: z.string().nullable(),
      url: z.string(),
    })
  ),
});

interface VideoAnalysis {
  metadata: z.infer<typeof VideoMetadataSchema>;
  comments: z.infer<typeof CommentsSchema>;
  relatedVideos: z.infer<typeof RelatedVideosSchema>["videos"];
  insights: {
    engagementRatio: string;
    commentSentiment: string;
    topKeywords: string[];
  };
}

function parseNumber(str: string): number {
  const clean = str.toLowerCase().replace(/[,\s]/g, "");
  const match = clean.match(/([\d.]+)\s*([kmb])?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1000;
  if (match[2] === "m") num *= 1000000;
  if (match[2] === "b") num *= 1000000000;
  return Math.round(num);
}

function extractKeywords(description: string, title: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  const frequency: Record<string, number> = {};

  words.forEach((word) => {
    if (!["this", "that", "with", "from", "have", "been", "were", "will"].includes(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

async function extractYouTubeVideo(videoUrl: string): Promise<VideoAnalysis> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🎬 Extracting YouTube video data...\n`);

  try {
    const page = await agent.newPage();

    await page.goto(videoUrl);
    await page.waitForTimeout(4000);

    // Handle consent/cookie popup if present
    await page.aiAction("accept cookies or close any popup if present");
    await page.waitForTimeout(1000);

    // Expand description
    await page.aiAction("click to expand the video description if collapsed");
    await page.waitForTimeout(1500);

    // Extract video metadata
    console.log("  📹 Extracting video metadata...");
    const metadata = await page.extract(
      "Extract video title, channel name, subscriber count, view count, like count, upload date, full description, duration, category, hashtags/tags, whether it's a live stream, and whether it's a premiere",
      VideoMetadataSchema
    );

    // Scroll to comments
    await page.aiAction("scroll down to the comments section");
    await page.waitForTimeout(2000);

    // Extract comments
    console.log("  💬 Extracting comments...");
    const commentsData = await page.extract(
      "Extract the total comment count and the top 15 comments with author name, comment text, like count, timestamp, whether author is the channel owner, whether it's pinned, and reply count",
      CommentsSchema
    );

    // Extract related videos
    console.log("  📺 Extracting related videos...");
    const relatedData = await page.extract(
      "Extract up to 10 related/recommended videos from the sidebar with title, channel name, view count, upload date, duration, and video URL",
      RelatedVideosSchema
    );

    // Calculate insights
    const views = parseNumber(metadata.views);
    const likes = parseNumber(metadata.likes || "0");
    const engagementRatio = views > 0 ? ((likes / views) * 100).toFixed(2) : "0";

    // Simple sentiment analysis based on comment keywords
    const commentText = commentsData.comments.map((c) => c.content).join(" ").toLowerCase();
    const positiveWords = ["love", "great", "amazing", "awesome", "best", "excellent", "perfect"];
    const negativeWords = ["hate", "bad", "worst", "terrible", "awful", "disappointing"];
    const positiveCount = positiveWords.filter((w) => commentText.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => commentText.includes(w)).length;
    const commentSentiment =
      positiveCount > negativeCount
        ? "Positive"
        : negativeCount > positiveCount
        ? "Negative"
        : "Neutral";

    const topKeywords = extractKeywords(metadata.description, metadata.title);

    const insights = {
      engagementRatio: `${engagementRatio}%`,
      commentSentiment,
      topKeywords,
    };

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("YOUTUBE VIDEO ANALYSIS");
    console.log("=".repeat(60));

    console.log(`\n🎬 VIDEO INFO`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel: ${metadata.channelName} (${metadata.channelSubscribers || "N/A"} subscribers)`);
    console.log(`   Duration: ${metadata.duration || "N/A"}`);
    console.log(`   Category: ${metadata.category || "N/A"}`);
    console.log(`   Upload Date: ${metadata.uploadDate}`);
    if (metadata.isLive) console.log(`   🔴 LIVE`);
    if (metadata.isPremiere) console.log(`   🎬 PREMIERE`);

    console.log(`\n📊 STATS`);
    console.log(`   Views: ${metadata.views}`);
    console.log(`   Likes: ${metadata.likes || "Hidden"}`);
    console.log(`   Comments: ${commentsData.totalComments || "N/A"}`);
    console.log(`   Engagement Ratio: ${insights.engagementRatio}`);

    console.log(`\n📝 DESCRIPTION (preview)`);
    console.log(`   ${metadata.description.substring(0, 200)}...`);

    if (metadata.tags.length > 0) {
      console.log(`\n🏷️ TAGS`);
      console.log(`   ${metadata.tags.slice(0, 10).join(", ")}`);
    }

    console.log(`\n💬 TOP COMMENTS (${commentsData.comments.length} extracted)`);
    console.log(`   Sentiment: ${insights.commentSentiment}`);
    commentsData.comments.slice(0, 5).forEach((comment, i) => {
      const pinned = comment.isPinned ? " 📌" : "";
      const owner = comment.isChannelOwner ? " ✓" : "";
      console.log(`\n   ${i + 1}. @${comment.author}${owner}${pinned}`);
      console.log(`      "${comment.content.substring(0, 80)}${comment.content.length > 80 ? "..." : ""}"`);
      console.log(`      👍 ${comment.likes || 0} | ${comment.timestamp}${comment.replyCount ? ` | ${comment.replyCount} replies` : ""}`);
    });

    console.log(`\n📺 RELATED VIDEOS`);
    relatedData.videos.slice(0, 5).forEach((video, i) => {
      console.log(`   ${i + 1}. ${video.title}`);
      console.log(`      ${video.channelName} | ${video.views} | ${video.duration || "N/A"}`);
    });

    console.log(`\n🔑 TOP KEYWORDS`);
    console.log(`   ${insights.topKeywords.join(", ")}`);

    return {
      metadata,
      comments: commentsData,
      relatedVideos: relatedData.videos,
      insights,
    };
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
extractYouTubeVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");



