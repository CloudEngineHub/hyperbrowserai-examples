/**
 * Template: Threads Post Extractor
 * Category: Social Media
 * Use Case: Extract posts from Threads profiles
 * Target Site: threads.net
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ThreadsProfileSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  isVerified: z.boolean(),
  followerCount: z.string(),
  profilePictureUrl: z.string().nullable(),
});

const ThreadsPostsSchema = z.object({
  posts: z.array(
    z.object({
      content: z.string(),
      timestamp: z.string(),
      likes: z.string().nullable(),
      replies: z.string().nullable(),
      reposts: z.string().nullable(),
      hasMedia: z.boolean(),
      mediaType: z.string().nullable(),
      isRepost: z.boolean(),
      originalAuthor: z.string().nullable(),
    })
  ),
});

interface ThreadsExtraction {
  profile: z.infer<typeof ThreadsProfileSchema>;
  posts: z.infer<typeof ThreadsPostsSchema>["posts"];
  stats: {
    totalPosts: number;
    postsWithMedia: number;
    reposts: number;
    avgEngagement: number;
  };
}

function parseEngagement(str: string | null): number {
  if (!str) return 0;
  const match = str.toLowerCase().match(/([\d.]+)\s*([km])?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1000;
  if (match[2] === "m") num *= 1000000;
  return Math.round(num);
}

async function extractThreadsProfile(username: string): Promise<ThreadsExtraction> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`🧵 Extracting Threads profile: @${username}\n`);

  try {
    const page = await agent.newPage();

    // Navigate to Threads profile
    await page.goto(`https://www.threads.net/@${username}`);
    await page.waitForTimeout(4000);

    // Handle any popups
    await page.aiAction("close any login popup or modal if present");
    await page.waitForTimeout(1000);

    // Extract profile info
    console.log("  👤 Extracting profile...");
    const profile = await page.extract(
      "Extract profile information: username, display name, bio, verification status, follower count, and profile picture URL",
      ThreadsProfileSchema
    );

    // Scroll to load more posts
    console.log("  📜 Loading posts...");
    for (let i = 0; i < 3; i++) {
      await page.aiAction("scroll down to load more posts");
      await page.waitForTimeout(1500);
    }

    // Extract posts
    console.log("  📝 Extracting posts...");
    const postsData = await page.extract(
      "Extract posts/threads with content text, timestamp, like count, reply count, repost count, whether it has media (image/video), media type, whether it's a repost, and original author if reposted",
      ThreadsPostsSchema
    );

    // Calculate stats
    const posts = postsData.posts;
    const totalEngagement = posts.reduce((sum, post) => {
      return sum + parseEngagement(post.likes) + parseEngagement(post.replies);
    }, 0);

    const stats = {
      totalPosts: posts.length,
      postsWithMedia: posts.filter((p) => p.hasMedia).length,
      reposts: posts.filter((p) => p.isRepost).length,
      avgEngagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
    };

    // Display results
    console.log("\n" + "=".repeat(50));
    console.log("THREADS PROFILE EXTRACTION");
    console.log("=".repeat(50));

    console.log(`\n👤 PROFILE`);
    console.log(`   Username: @${profile.username}`);
    console.log(`   Name: ${profile.displayName}`);
    console.log(`   Verified: ${profile.isVerified ? "✓ Yes" : "No"}`);
    console.log(`   Followers: ${profile.followerCount}`);
    if (profile.bio) {
      console.log(`   Bio: ${profile.bio.substring(0, 80)}${profile.bio.length > 80 ? "..." : ""}`);
    }

    console.log(`\n📊 STATS`);
    console.log(`   Posts extracted: ${stats.totalPosts}`);
    console.log(`   Posts with media: ${stats.postsWithMedia} (${Math.round((stats.postsWithMedia / stats.totalPosts) * 100)}%)`);
    console.log(`   Reposts: ${stats.reposts}`);
    console.log(`   Avg engagement: ${stats.avgEngagement.toLocaleString()}`);

    console.log(`\n📝 RECENT POSTS:`);
    posts.slice(0, 10).forEach((post, i) => {
      const mediaTag = post.hasMedia ? ` [${post.mediaType || "media"}]` : "";
      const repostTag = post.isRepost ? ` (repost from @${post.originalAuthor})` : "";
      const content = post.content.substring(0, 60) + (post.content.length > 60 ? "..." : "");

      console.log(`\n   ${i + 1}. "${content}"${mediaTag}${repostTag}`);
      console.log(`      ${post.timestamp} | ❤️ ${post.likes || 0} | 💬 ${post.replies || 0} | 🔄 ${post.reposts || 0}`);
    });

    // Content analysis
    console.log(`\n📈 CONTENT ANALYSIS`);
    const originalPosts = posts.filter((p) => !p.isRepost);
    const mediaRate = (posts.filter((p) => p.hasMedia).length / posts.length) * 100;

    console.log(`   Original content: ${originalPosts.length}/${posts.length} posts`);
    console.log(`   Media usage: ${Math.round(mediaRate)}% of posts include media`);

    // Top performing post
    const topPost = posts.reduce((best, post) => {
      const engagement = parseEngagement(post.likes) + parseEngagement(post.replies);
      const bestEngagement = parseEngagement(best.likes) + parseEngagement(best.replies);
      return engagement > bestEngagement ? post : best;
    }, posts[0]);

    if (topPost) {
      console.log(`\n🏆 TOP PERFORMING POST`);
      console.log(`   "${topPost.content.substring(0, 80)}..."`);
      console.log(`   ❤️ ${topPost.likes || 0} | 💬 ${topPost.replies || 0}`);
    }

    return { profile, posts, stats };
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
extractThreadsProfile("zuck");



