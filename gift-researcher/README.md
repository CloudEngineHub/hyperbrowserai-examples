**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# Deep Gift Research 🎁

An AI-powered gift research engine that scrapes Reddit and the web to find the perfect gift for anyone in seconds. Instead of generic lists, it reads real discussions to find authentic recommendations.

![Gift App](public/window.svg)

## Features
- **Deep Web Scraping**: Uses **Hyperbrowser** to browse Reddit threads and Google results live.
- **AI Analysis**: Claude 3.5 Sonnet reads the scraped content to extract hidden gems.
- **Personalized**: Tailors results to specific interests, age, and vibe.
- **Festive UI**: A clean, minimal interface with a touch of holiday magic.

## Get Started

### 1. Get API Keys
- **Hyperbrowser**: Get your key at [https://hyperbrowser.ai](https://hyperbrowser.ai) to enable web scraping.
- **Anthropic**: Get a Claude API key for the intelligence layer.

### 2. Setup

```bash
# Clone the repo
git clone https://github.com/hyperbrowserai/examples
cd gift-researcher

# Install dependencies
npm install

# Setup Environment Variables
# Create a .env.local file in the root directory with:
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here

# Run it
npm run dev
```

**Required API Keys:**
1. **Anthropic API Key** (Required): Get from [https://console.anthropic.com/](https://console.anthropic.com/)
   - Used for AI-powered gift analysis
2. **Hyperbrowser API Key** (Optional): Get from [https://hyperbrowser.ai](https://hyperbrowser.ai)
   - Used for web scraping (app will work without it using Claude's knowledge)

Create a `.env.local` file in the root directory:
```bash
ANTHROPIC_API_KEY=your_anthropic_key_here
HYPERBROWSER_API_KEY=your_hyperbrowser_key_here
```

### 3. Usage
1. Enter "My Dad", "55", "Woodworking, Coffee", "Practical".
2. Watch as the app scrapes Reddit r/woodworking and r/coffee threads.
3. Get 5 perfect tool or bean recommendations in 30 seconds.

## Use Case for Growth
This project demonstrates how to use **Hyperbrowser** to build "Research Agents" that go beyond static knowledge. You can adapt this pattern to:
- Scrape LinkedIn profiles to generate personalized cold emails.
- Research competitor pricing across e-commerce sites.
- Aggregate news for a specific niche daily.

## Stack
- Next.js 14
- Tailwind CSS + shadcn/ui
- Hyperbrowser Scrape API
- Anthropic Claude 3.5 Sonnet

Follow @hyperbrowser for updates.
