# Life at Lakewood — Auto-Blogger

An SEO blog content planner and builder for the Life at Lakewood family of real estate websites:

- **Life at Lakewood** (Lakewood Ranch)
- **Life in Wellen Park**
- **Life at Parrish**
- **Life in Longboat Key**

## What It Does

This app gives you a dashboard to plan, generate, and manage blog posts across all four property websites. Key features:

- **Content Calendar** — see all scheduled, drafted, and published posts in a monthly view
- **Property Dashboards** — stats for each site (posts published, SEO gaps, keyword data)
- **Blog Workflow** — step-by-step process: pick an SEO keyword, match it to an article idea, generate the content, preview/edit, and approve
- **Dark Mode** — toggle in Account settings
- **Monthly Goals** — set per-property blog post targets

## How to Run It Locally

You'll need **Node.js** installed on your computer (version 18 or newer).
Download it from https://nodejs.org if you don't have it — choose the LTS version.

### Step-by-step

1. **Open a terminal** (Terminal on Mac, Command Prompt or PowerShell on Windows)

2. **Navigate to this project folder:**
   ```
   cd path/to/life-at-lakewood-auto-blogger
   ```

3. **Install dependencies** (only needed the first time, or after pulling updates):
   ```
   npm install
   ```

4. **Start the app:**
   ```
   npm run dev
   ```

5. **Open your browser** — it should open automatically, but if not, go to the URL shown in your terminal (usually `http://localhost:5173`)

### To stop the app

Press `Ctrl + C` in the terminal window where it's running.

## How to Test It

Once the app is running in your browser:

1. **Sign in** — enter any name and email (this is a local-only demo login, no real account needed)
2. **Content Calendar** — click the calendar icon in the sidebar to see the monthly blog schedule
3. **Property pages** — click any of the four properties in the sidebar (Lakewood Ranch, Wellen Park, Parrish, Longboat Key) to see their individual dashboards
4. **Start a blog workflow** — from any property dashboard, click the "New Post" or workflow button to walk through the keyword selection and article generation process
5. **Dark mode** — click the Account/gear area at the bottom of the sidebar, then toggle dark mode on
6. **Monthly goals** — in the same Account panel, adjust the blog post targets per property

## Building for Production

To create an optimized build you could deploy to a web server:

```
npm run build
```

The output goes into the `dist/` folder.

## Project Structure

```
life-at-lakewood-auto-blogger/
  index.html         — HTML entry point
  package.json       — project config and dependencies
  vite.config.js     — build tool configuration
  blog-builder.jsx   — original single-file source (kept for reference)
  src/
    main.jsx         — React startup code
    App.jsx          — the full application
```
