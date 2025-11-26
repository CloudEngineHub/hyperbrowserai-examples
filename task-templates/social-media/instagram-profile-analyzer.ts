/**
 * Template: Instagram Profile Analyzer
 * Category: Social Media
 * Use Case: Extract public profile stats and recent posts metadata
 * Target Site: instagram.com
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { config } from "dotenv";

config();

const ProfileSchema = z.object({
  username: z.string(),
  fullName: z.string(),
  bio: z.string(),
  isVerified: z.boolean(),
  followerCount: z.string(),
  followingCount: z.string(),
  postCount: z.string(),
  profilePictureUrl: z.string().nullable(),
  externalUrl: z.string().nullable(),
  category: z.string().nullable(),
});

const PostsSchema = z.object({
  posts: z.array(
    z.object({
      type: z.string(), // image, video, carousel
      likes: z.string().nullable(),
      comments: z.string().nullable(),
      caption: z.string().nullable(),
      timestamp: z.string().nullable(),
      isSponsored: z.boolean(),
    })
  ),
});

interface ProfileAnalysis {
  profile: z.infer<typeof ProfileSchema>;
  recentPosts: z.infer<typeof PostsSchema>["posts"];
  metrics: {
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
    postFrequency: string;
  };
}

function parseCount(countStr: string): number {
  const str = countStr.toLowerCase().trim();
  const match = str.match(/([\d.]+)\s*([kmb])?/);
  if (!match) return 0;

  let num = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "k") num *= 1000;
  else if (suffix === "m") num *= 1000000;
  else if (suffix === "b") num *= 1000000000;

  return Math.round(num);
}

function calculateMetrics(
  profile: z.infer<typeof ProfileSchema>,
  posts: z.infer<typeof PostsSchema>["posts"]
) {
  const followers = parseCount(profile.followerCount);
  const totalPosts = parseCount(profile.postCount);

  let totalLikes = 0;
  let totalComments = 0;
  let validPosts = 0;

  posts.forEach((post) => {
    if (post.likes) {
      totalLikes += parseCount(post.likes);
      validPosts++;
    }
    if (post.comments) {
      totalComments += parseCount(post.comments);
    }
  });

  const avgLikes = validPosts > 0 ? totalLikes / validPosts : 0;
  const avgComments = validPosts > 0 ? totalComments / validPosts : 0;
  const engagementRate =
    followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;

  return {
    engagementRate: Math.round(engagementRate * 100) / 100,
    avgLikes: Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    postFrequency: totalPosts > 0 ? `${totalPosts} total posts` : "Unknown",
  };
}

async function analyzeInstagramProfile(
  username: string
): Promise<ProfileAnalysis> {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log(`📸 Analyzing Instagram profile: @${username}\n`);

  try {
    const page = await agent.newPage();

    // Navigate to profile
    await page.goto(`https://www.instagram.com/${username}/`);
    await page.waitForTimeout(4000);

    // Handle login prompt if it appears
    await page.waitForTimeout(1000);

    // Extract profile info
    console.log("  📊 Extracting profile information...");
    const profile = await page.extract(
      "Extract profile information: username, full name, bio text, verification status, follower count, following count, post count, profile picture URL, external website URL, and account category if shown",
      ProfileSchema
    );

    // Scroll to load posts
    await page.aiAction("scroll down to see recent posts");
    await page.waitForTimeout(2000);

    // Extract recent posts
    console.log("  📷 Extracting recent posts...");
    const postsData = await page.extract(
      "Extract the most recent 12 posts with their type (image/video/carousel), like count, comment count, caption preview, posting timestamp, and whether they are sponsored",
      PostsSchema
    );

    // Calculate metrics
    console.log("  📈 Calculating metrics...\n");
    const metrics = calculateMetrics(profile, postsData.posts);

    const result: ProfileAnalysis = {
      profile,
      recentPosts: postsData.posts,
      metrics,
    };

    // Display results
    console.log("=".repeat(50));
    console.log("INSTAGRAM PROFILE ANALYSIS");
    console.log("=".repeat(50));

    console.log(`\n👤 PROFILE INFO`);
    console.log(`   Username: @${profile.username}`);
    console.log(`   Name: ${profile.fullName}`);
    console.log(`   Bio: ${profile.bio.substring(0, 100)}${profile.bio.length > 100 ? "..." : ""}`);
    console.log(`   Verified: ${profile.isVerified ? "✓ Yes" : "No"}`);
    console.log(`   Category: ${profile.category || "N/A"}`);
    console.log(`   Website: ${profile.externalUrl || "N/A"}`);

    console.log(`\n📊 STATS`);
    console.log(`   Followers: ${profile.followerCount}`);
    console.log(`   Following: ${profile.followingCount}`);
    console.log(`   Posts: ${profile.postCount}`);

    console.log(`\n📈 ENGAGEMENT METRICS`);
    console.log(`   Engagement Rate: ${metrics.engagementRate}%`);
    console.log(`   Avg Likes: ${metrics.avgLikes.toLocaleString()}`);
    console.log(`   Avg Comments: ${metrics.avgComments.toLocaleString()}`);

    console.log(`\n📷 RECENT POSTS (${postsData.posts.length})`);
    postsData.posts.slice(0, 5).forEach((post, i) => {
      const sponsored = post.isSponsored ? " [SPONSORED]" : "";
      console.log(`   ${i + 1}. ${post.type}${sponsored} - ${post.likes || "?"} likes, ${post.comments || "?"} comments`);
    });

    // Content breakdown
    const postTypes = postsData.posts.reduce((acc, post) => {
      acc[post.type] = (acc[post.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📊 CONTENT MIX`);
    Object.entries(postTypes).forEach(([type, count]) => {
      const percentage = Math.round((count / postsData.posts.length) * 100);
      console.log(`   ${type}: ${count} posts (${percentage}%)`);
    });

    const sponsoredCount = postsData.posts.filter((p) => p.isSponsored).length;
    if (sponsoredCount > 0) {
      console.log(`\n💰 SPONSORED CONTENT`);
      console.log(`   ${sponsoredCount} of ${postsData.posts.length} recent posts are sponsored (${Math.round((sponsoredCount / postsData.posts.length) * 100)}%)`);
    }

    return result;
  } finally {
    await agent.closeAgent();
  }
}

// Example usage
analyzeInstagramProfile("cristiano");



