/**
 * Template: Job Match Scorer
 * Category: AI Pipelines
 * Use Case: Extract job listings, score against resume with OpenAI
 * Target Sites: LinkedIn, Indeed
 */

import { HyperAgent } from "@hyperbrowser/agent";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "dotenv";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const JobListingSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      salary: z.string().nullable(),
      description: z.string(),
      requirements: z.array(z.string()),
      benefits: z.array(z.string()),
      postedDate: z.string().nullable(),
      jobType: z.string().nullable(),
      url: z.string(),
    })
  ),
});

interface CandidateProfile {
  name: string;
  currentRole: string;
  yearsExperience: number;
  skills: string[];
  education: string;
  preferredLocations: string[];
  salaryExpectation: string;
  summary: string;
}

async function extractJobListings(
  agent: HyperAgent,
  searchQuery: string,
  location: string
) {
  const page = await agent.newPage();

  await page.goto("https://www.linkedin.com/jobs");
  await page.waitForTimeout(3000);

  // Search for jobs
  await page.aiAction(`type "${searchQuery}" in the job search field`);
  await page.aiAction(`type "${location}" in the location field`);
  await page.aiAction("click the search button");
  await page.waitForTimeout(4000);

  // Scroll to load more
  await page.aiAction("scroll down to load more job listings");
  await page.waitForTimeout(2000);

  const result = await page.extract(
    "Extract job listings with title, company, location, salary range if shown, job description, requirements list, benefits, posted date, job type (full-time/contract), and application URL",
    JobListingSchema
  );

  return result.jobs;
}

async function scoreJobMatch(job: any, candidate: CandidateProfile) {
  const prompt = `You are a career advisor. Score how well this job matches the candidate's profile.

CANDIDATE PROFILE:
${JSON.stringify(candidate, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

Provide a detailed match analysis:

1. OVERALL MATCH SCORE: X/100

2. BREAKDOWN:
   - Skills Match: X/100 (list matching and missing skills)
   - Experience Match: X/100 (too junior/senior/just right)
   - Location Match: X/100 (consider remote options)
   - Salary Match: X/100 (if salary info available)
   - Culture Fit: X/100 (based on company/role signals)

3. STRENGTHS:
   - Why the candidate IS a good fit

4. GAPS:
   - What skills/experience the candidate lacks
   - How significant are these gaps?

5. PREPARATION TIPS:
   - Key points to emphasize in application
   - Skills to highlight
   - Potential interview topics to prepare

6. RED FLAGS:
   - Any concerns about this role for this candidate

7. RECOMMENDATION:
   - APPLY NOW / WORTH CONSIDERING / SKIP
   - Brief reasoning

Return the score as a number at the end: SCORE=XX`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  const content = completion.choices[0].message.content || "";
  const scoreMatch = content.match(/SCORE=(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

  return {
    job: job.title,
    company: job.company,
    score,
    analysis: content,
  };
}

async function generateApplicationStrategy(scoredJobs: any[], candidate: CandidateProfile) {
  const topJobs = scoredJobs.filter((j) => j.score >= 70).slice(0, 5);
  const maybeJobs = scoredJobs.filter((j) => j.score >= 50 && j.score < 70).slice(0, 5);

  const prompt = `Based on these job match scores, create an application strategy for the candidate.

CANDIDATE: ${candidate.name} - ${candidate.currentRole}

TOP MATCHES (Score 70+):
${JSON.stringify(topJobs.map((j) => ({ title: j.job, company: j.company, score: j.score })), null, 2)}

WORTH CONSIDERING (Score 50-69):
${JSON.stringify(maybeJobs.map((j) => ({ title: j.job, company: j.company, score: j.score })), null, 2)}

Create an action plan:

1. PRIORITY APPLICATIONS (apply this week):
   - Which jobs and why
   - Order of application

2. RESUME TWEAKS:
   - Key modifications for each top role
   - Skills to emphasize

3. COVER LETTER THEMES:
   - Main narrative to use
   - Company-specific angles

4. NETWORKING ACTIONS:
   - Companies to research
   - People to connect with

5. SKILL GAPS TO ADDRESS:
   - Short-term (can learn quickly)
   - Long-term (need courses/projects)

6. TIMELINE:
   - Week 1 priorities
   - Week 2-4 plan`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

async function jobMatchScorer(
  searchQuery: string,
  location: string,
  candidate: CandidateProfile
) {
  const agent = new HyperAgent({
    llm: { provider: "openai", model: "gpt-4o-mini" },
  });

  console.log("🎯 Job Match Scorer\n");
  console.log(`Searching for: "${searchQuery}" in ${location}\n`);

  try {
    // Step 1: Extract job listings
    console.log("📡 Extracting job listings...");
    const jobs = await extractJobListings(agent, searchQuery, location);
    console.log(`✅ Found ${jobs.length} jobs\n`);

    // Step 2: Score each job
    console.log("🤖 Scoring job matches...\n");
    const scoredJobs: any[] = [];

    for (const job of jobs.slice(0, 10)) {
      // Limit to 10 for demo
      console.log(`  Analyzing: ${job.title} at ${job.company}`);
      const scored = await scoreJobMatch(job, candidate);
      scoredJobs.push(scored);
      console.log(`    Score: ${scored.score}/100`);
    }

    // Sort by score
    scoredJobs.sort((a, b) => b.score - a.score);

    // Step 3: Generate strategy
    console.log("\n📋 Generating application strategy...\n");
    const strategy = await generateApplicationStrategy(scoredJobs, candidate);

    // Output results
    console.log("=".repeat(60));
    console.log("JOB MATCH RANKINGS");
    console.log("=".repeat(60));
    scoredJobs.forEach((job, i) => {
      const emoji = job.score >= 70 ? "🟢" : job.score >= 50 ? "🟡" : "🔴";
      console.log(`${emoji} ${i + 1}. ${job.job} @ ${job.company} - ${job.score}/100`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("APPLICATION STRATEGY");
    console.log("=".repeat(60));
    console.log(strategy);

    // Show top match details
    if (scoredJobs.length > 0) {
      console.log("\n" + "=".repeat(60));
      console.log("TOP MATCH DETAILED ANALYSIS");
      console.log("=".repeat(60));
      console.log(scoredJobs[0].analysis);
    }

    return { scoredJobs, strategy };
  } finally {
    await agent.closeAgent();
  }
}

// Example candidate profile
const candidate: CandidateProfile = {
  name: "Alex Chen",
  currentRole: "Senior Software Engineer",
  yearsExperience: 6,
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
    "GraphQL",
    "Python",
  ],
  education: "BS Computer Science, UC Berkeley",
  preferredLocations: ["San Francisco", "Remote"],
  salaryExpectation: "$180,000 - $220,000",
  summary:
    "Full-stack engineer with focus on scalable web applications. Led teams of 3-5 developers. Experience with startups and enterprise.",
};

jobMatchScorer("Senior Software Engineer", "San Francisco Bay Area", candidate);

