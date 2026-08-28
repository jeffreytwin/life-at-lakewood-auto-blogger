# Life at Lakewood Auto-Blogger — Testing Guide

This guide walks through testing every feature of the app end-to-end. Work through each section in order — later sections depend on earlier ones passing.

---

## 1. Prerequisites & Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

| Variable | Where to get it | Used by |
|----------|----------------|---------|
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL | Client (sign-in) |
| `VITE_SUPABASE_ANON_KEY` | Same page → `anon` / `public` key | Client (sign-in) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` key (keep secret) | Server (Google token storage) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Server (article generation) |
| `WIX_API_KEY` | Wix → Account Settings → API Keys (one key, Blog read/write) | Server (blog posts) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 | Server (GSC auth) |
| `GOOGLE_CLIENT_SECRET` | Same credential page | Server (GSC auth) |

**Vercel:** Add these same variables in your Vercel project → Settings → Environment Variables.

### Run locally

```bash
npm install
npm run dev
```

App opens at `http://localhost:5173`. API routes are served by Vercel CLI in dev or by the deployed Vercel functions.

---

## 2. Authentication (Supabase)

| # | Test | Expected Result |
|---|------|----------------|
| 2.1 | Open app → see Sign In page | Email and password fields shown |
| 2.2 | Enter invalid credentials → click Sign In | Error message appears (e.g., "Invalid login credentials") |
| 2.3 | Enter valid Supabase credentials → click Sign In | Dashboard loads, sidebar shows properties and user avatar |
| 2.4 | Check "Remember me" → sign in → close tab → reopen | Session persists, no sign-in required |
| 2.5 | Uncheck "Remember me" → sign in → close browser → reopen | Session cleared, sign-in page shown |
| 2.6 | Account → Profile tab → change password → sign out → sign in with new password | Password change succeeds |
| 2.7 | Click sign-out button (bottom of sidebar) | Returns to sign-in page |

---

## 3. Content Calendar

| # | Test | Expected Result |
|---|------|----------------|
| 3.1 | Click "Content Calendar" in sidebar | Calendar view loads with current month |
| 3.2 | Click prev/next arrows | Month changes, grid updates with correct days |
| 3.3 | Property filter dropdown → select "Lakewood Ranch" | Only Lakewood articles shown on calendar |
| 3.4 | Property filter → "All" | Articles from all 4 properties shown |
| 3.5 | Check KPI cards | "Total Posts" and "Published This Month" counts correct for displayed month |
| 3.6 | Click a day with articles | Article details shown below calendar |
| 3.7 | Click "Sync Wix" button | Spinner appears, articles refresh from Wix API |
| 3.8 | Verify no drafts on calendar | Only published articles appear on calendar days |
| 3.9 | Click "Needs Attention" on an article | Opens workflow at Review step (Step 4) for that article |

**With Wix connected:** Real published posts appear with correct dates and status pills.
**Without Wix:** Mock data or empty state loads — no errors.

---

## 4. Property Dashboard

| # | Test | Expected Result |
|---|------|----------------|
| 4.1 | Click each property in sidebar (Lakewood, Wellen, Parrish, Longboat) | Correct name, logo, and brand color shown |
| 4.2 | Article list loads | Published articles from Wix (or mock fallback) displayed |
| 4.3 | Type in search box | Articles filtered by title/keyword match |
| 4.4 | Click "Start New Article" | Workflow view opens at Step 0 (Keywords) |
| 4.5 | Check "Needs Attention" sidebar | Draft articles pending review shown |
| 4.6 | Article title links | Open correct Wix blog post URL in new tab |
| 4.7 | Draft "Open in Wix" link | Opens Wix dashboard filtered to drafts |
| 4.8 | Scheduled/Published section | Shows up to 4 articles, "See All" expands full list |
| 4.9 | "Published This Month" KPI | Counts only current month's published articles |
| 4.10 | Monthly Goal progress bar | Tracks only current month articles vs. goal |
| 4.11 | Recent Activity dates | Include the year (e.g., "Feb 26, 2026") |

---

## 5. Workflow — Step 0: Keyword Selection

| # | Test | Expected Result |
|---|------|----------------|
| 5.1 | Enter workflow → scanning animation plays | Progress bar fills 0→100%, keyword list appears |
| 5.2 | Keywords shown | List includes keyword, volume, difficulty, intent |
| 5.3 | **If GSC connected:** check for "GSC Connected" badge | Badge appears, real keyword data from Google Search Console shown first |
| 5.4 | **If GSC not connected:** keywords still appear | Mock keyword suggestions load as fallback |
| 5.5 | Click "Load More" | Spinner shown, `/api/claude/keywords` called, 6 new keywords added to list |
| 5.6 | Check/uncheck individual keywords | Selection toggles correctly |
| 5.7 | Click "Select All" | All keywords checked |
| 5.8 | Click "Clear All" | All keywords unchecked |
| 5.9 | Sort by column header (Vol / Diff) | Clickable to sort ascending/descending |
| 5.10 | Intent filter dropdown | Filters by Informational, Commercial, Transactional |
| 5.11 | Keyword search box | Filters keywords by text match |
| 5.12 | Select 1+ keywords → click floating button | Advances to Step 1 |
| 5.13 | Click floating button with no keywords selected | Button is disabled or shows warning |
| 5.14 | Floating "Select Keywords" bar | Sticky at bottom, shows count of selected keywords |

---

## 6. Workflow — Step 1: Article Matching

| # | Test | Expected Result |
|---|------|----------------|
| 6.1 | First keyword shown with article suggestions | Suggestion cards display for the keyword |
| 6.2 | Click "Choose Existing" | Published articles from that property's Wix blog shown |
| 6.3 | Select an article suggestion | Advances to next keyword page |
| 6.4 | Click Back | Returns to previous keyword or Step 0 |
| 6.5 | Complete all keywords | Advances to Step 2 |

---

## 7. Workflow — Step 2: Article Generation

| # | Test | Expected Result |
|---|------|----------------|
| 7.1 | Generation starts | Progress animation plays through stages (Scanning → Researching → Writing → Polishing) |
| 7.2 | Open browser Network tab | POST requests to `/api/claude/generate` for each article |
| 7.3 | Final stage text | Shows "So close! Adding polish and the finishing touches…" |
| 7.4 | Generation completes | Progress hits 100%, auto-advances to Step 3 |
| 7.5 | Check response data | Each article has `seoTitle`, `metaDescription`, `slug`, and `sections` array |
| 7.6 | Article length | 800–1000 words, concise with no filler |
| 7.7 | Writing style applied | If set in Account settings, style instructions sent to Claude |
| 7.8 | Timeout (2 min) | Generation auto-stops and falls back to mock content |
| 7.9 | **If Claude API fails:** | Mock article content used as fallback, no crash |

---

## 8. Workflow — Step 3: Preview & Edit

| # | Test | Expected Result |
|---|------|----------------|
| 8.1 | Articles display | SEO title, meta description, slug, and body sections visible |
| 8.2 | Check character counts | SEO title shows count (target: <60), meta description (target: <160) |
| 8.3 | Click edit on any field | Field becomes editable, changes save |
| 8.4 | Click "Revise" on an article | Text input appears, enter revision request (e.g., "Make it more casual") |
| 8.5 | Submit revision | `/api/claude/revise` called, article updates with revised content |
| 8.6 | Floating approve bar (desktop) | Sticky bar at top with article title and approve button |
| 8.7 | Click "Approve All" | Advances to Step 4, creates Wix drafts, triggers article refresh |

---

## 9. Workflow — Step 4: Final Review & Publish

| # | Test | Expected Result |
|---|------|----------------|
| 9.1 | Checklist items display | SEO, keyword usage, tone, CTAs items shown |
| 9.2 | Final preview shows all articles | Content matches what was approved in Step 3 |
| 9.3 | Click "Publish to Wix" | Loading state shown, POST to `/api/wix/posts` for each article |
| 9.4 | Success response | Message with draft post IDs displayed |
| 9.5 | "Open in Wix" link | Opens Wix dashboard filtered to drafts for that property |
| 9.6 | "Generate More" button | Resets workflow back to Step 0 |
| 9.7 | **Verify in Wix:** go to Wix dashboard → Blog → Drafts | New draft posts appear with correct titles and content |

---

## 10. Account Settings

Open via the gear/avatar button at bottom of sidebar.

### Profile tab
| # | Test | Expected Result |
|---|------|----------------|
| 10.1 | Name and email displayed | Matches Supabase user data |
| 10.2 | Change password | New password, confirm password, submit → success message |

### Monthly Goals tab
| # | Test | Expected Result |
|---|------|----------------|
| 10.3 | Adjust per-property targets (1-20 posts/month) | Slider/input updates value |
| 10.4 | Close and reopen modal | Goals persisted (localStorage `lal_goals`) |

### Writing Style tab
| # | Test | Expected Result |
|---|------|----------------|
| 10.5 | Enter custom writing instructions | Text saves (localStorage `lal_writingStyle`) |
| 10.6 | Generate an article → check tone matches instructions | Claude receives writing style in prompt |

### Connections tab
| # | Test | Expected Result |
|---|------|----------------|
| 10.7 | Google Search Console → click "Connect" | Redirects to Google OAuth consent screen |
| 10.8 | Complete Google OAuth flow | Returns to app, GSC shows "Connected" |
| 10.9 | Wix status | Shows "Connected" if `WIX_API_KEY` is set, instructions otherwise |
| 10.10 | Claude AI status | Shows "Connected" (always, if `ANTHROPIC_API_KEY` set) |

### Display tab
| # | Test | Expected Result |
|---|------|----------------|
| 10.11 | Toggle dark mode | UI switches to dark theme |
| 10.12 | Refresh page | Dark mode persists (localStorage `lal_darkMode`) |

---

## 11. API Endpoint Smoke Tests

Test endpoints directly with curl (replace `YOUR_URL` with your Vercel deployment URL or `http://localhost:5173`):

### Wix Posts
```bash
# Fetch all posts from all 4 sites
curl -s YOUR_URL/api/wix/posts | jq '.posts | length'

# Fetch posts for one property
curl -s YOUR_URL/api/wix/posts?site=lakewood | jq '.posts | length'
```
**Expected:** JSON with `posts` array. If `WIX_API_KEY` not set, returns `{ posts: [], message: "WIX_API_KEY not configured" }`.

### Claude Keywords
```bash
curl -s -X POST YOUR_URL/api/claude/keywords \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Generate 6 SEO keyword ideas for real estate blogs about Lakewood Ranch Florida"}' | jq
```
**Expected:** JSON with `keywords` array.

### Claude Generate
```bash
curl -s -X POST YOUR_URL/api/claude/generate \
  -H "Content-Type: application/json" \
  -d '{"title":"Best Neighborhoods in Lakewood Ranch","keyword":"lakewood ranch neighborhoods","property":"Lakewood Ranch","propertyUrl":"lifeatlakewood.com","blogUrl":"lifeatlakewood.com/blog"}' | jq
```
**Expected:** JSON with `seoTitle`, `metaDescription`, `slug`, `sections[]`.

### Claude Revise
```bash
curl -s -X POST YOUR_URL/api/claude/revise \
  -H "Content-Type: application/json" \
  -d '{"articleContent":{"seoTitle":"Best Parks in Lakewood Ranch","metaDescription":"Discover top parks.","slug":"best-parks","sections":[{"heading":"Introduction","body":"Lakewood Ranch has amazing parks."}]},"revisionRequest":"Make the intro more engaging","property":"Lakewood Ranch"}' | jq
```
**Expected:** JSON with revised `seoTitle`, `metaDescription`, `slug`, `sections[]`.

### Create Wix Draft
```bash
curl -s -X POST YOUR_URL/api/wix/posts \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"lakewood","title":"Test Draft Post","sections":[{"heading":"Introduction","body":"This is a test."}],"seoTitle":"Test Draft","metaDescription":"A test draft post","slug":"test-draft-post"}' | jq
```
**Expected:** `{ success: true, draftPostId: "..." }`.

### Google Keywords
```bash
curl -s YOUR_URL/api/google/keywords?property=lakewood | jq
```
**Expected:** `{ keywords: [...], connected: true }` if Google authenticated, or `{ keywords: [], connected: false }` if not.

---

## 12. Graceful Degradation

Test that the app works with missing API keys by temporarily removing env vars:

| Scenario | Expected Behavior |
|----------|-------------------|
| No `WIX_API_KEY` | Dashboard loads with empty/mock article data. No errors. |
| No `ANTHROPIC_API_KEY` | Keyword "Load More" fails gracefully. Article generation uses mock content. |
| No Google tokens | Keywords page shows mock data. No "GSC Connected" badge. |
| All API keys removed | App is fully navigable — sign in works (Supabase only), all views load with mock/empty data, no console errors |

---

## 13. Mobile Responsiveness

Test at viewport width < 768px (use browser DevTools device toolbar):

| # | Test | Expected Result |
|---|------|----------------|
| 13.1 | Sidebar | Collapses to hamburger menu icon |
| 13.2 | Open hamburger | Sidebar slides in as overlay |
| 13.3 | Content Calendar | Switches from grid to agenda/list view |
| 13.4 | Workflow steps | All inputs and buttons usable, no horizontal overflow |
| 13.5 | Account modal | Tabs stack or scroll, all content accessible |

---

## Quick Reference: All API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wix/posts` | GET | Fetch published + draft posts (all sites or `?site=lakewood`) |
| `/api/wix/posts` | POST | Create draft post on specific Wix site |
| `/api/claude/generate` | POST | Generate full article with Claude |
| `/api/claude/revise` | POST | Revise article based on feedback |
| `/api/claude/keywords` | POST | Generate keyword suggestions |
| `/api/claude/articles` | POST | Generate article title suggestions |
| `/api/google/auth` | GET | Google OAuth flow (redirect to consent screen + callback) |
| `/api/google/keywords` | GET | Fetch real keyword data from Google Search Console |

---

## 14. Going Live

### Deploy to Vercel

1. **If GitHub repo is connected to Vercel:** Pushing `main` triggers auto-deploy
2. **Manual deploy:** Run `vercel --prod` from the project root
3. **Verify all 7 env vars** are set in Vercel → Settings → Environment Variables

### Post-Deploy Checklist

- [ ] All env vars set on Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `WIX_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Sign in works on production URL
- [ ] Wix posts load on calendar and property dashboards
- [ ] Article generation completes successfully
- [ ] Generated drafts appear in Wix dashboard
- [ ] Google OAuth redirect URI updated in Google Cloud Console to match production URL (e.g., `https://your-app.vercel.app/api/google/auth`)
- [ ] Dark mode toggle works and persists
- [ ] Mobile layout renders correctly (test on real device or DevTools)

---

## Wix Site IDs (hardcoded in `api/wix/posts.js`)

| Property | Site ID |
|----------|---------|
| Lakewood Ranch | `4fbabb96-2d6c-4f20-a240-9223153498b5` |
| Wellen Park | `1a8c2755-823e-4882-ae32-e6c108a30e39` |
| Parrish | `a704cfe5-dd9b-44ff-a017-9d637d8c6fdc` |
| Longboat Key | `8b20e921-5b70-4428-8fcd-8c8ef3bad3ab` |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `api/wix/posts.js` | Wix GET (fetch posts) / POST (create draft) |
| `api/claude/generate.js` | Article generation via Claude |
| `api/claude/keywords.js` | Keyword suggestions via Claude |
| `api/claude/revise.js` | Article revision via Claude |
| `api/google/auth.js` | Google OAuth 2.0 flow |
| `api/google/keywords.js` | Google Search Console keyword data |
| `src/components/SignInPage.jsx` | Auth UI |
| `src/components/AccountModal.jsx` | Settings (5 tabs: Profile, Goals, Writing Style, Connections, Display) |
| `src/components/CalendarView.jsx` | Content calendar with month navigation |
| `src/components/PropertyDashboard.jsx` | Property view with articles, KPIs, search |
| `src/components/workflow/WorkflowView.jsx` | Workflow orchestrator (routes between steps) |
| `src/components/workflow/StepKeywords.jsx` | Step 0: Keyword selection with sort/filter |
| `src/components/workflow/KeywordArticlePage.jsx` | Step 1: Article matching per keyword |
| `src/components/workflow/StepGenerating.jsx` | Step 2: AI article generation |
| `src/components/workflow/StepPreviewEdit.jsx` | Step 3: Preview, edit, revise |
| `src/components/workflow/StepReview.jsx` | Step 4: Final review & publish to Wix |
| `src/data/properties.js` | Property configs (URLs, Wix site IDs, dashboard links) |
| `src/data/constants.js` | Month data, date utilities |
| `src/data/mock-articles.js` | Fallback mock article data |
| `.env.example` | Environment variable template |

---

## August 2026 Platform Update

### What changed

| Area | Before | Now |
|------|--------|-----|
| AI model | `claude-sonnet-4-20250514` (deprecated → API calls failed with a swallowed error) | `claude-opus-5` via the official `@anthropic-ai/sdk`, with structured JSON output (no more parse crashes) |
| Keyword metrics | Claude invented volume/difficulty numbers | Real volume, difficulty, CPC & intent from **SEMrush**; live rankings from GSC; AI ideas show "—" until validated by SEMrush |
| Keyword table | Sorted by invented volume | **Opportunity score** (volume + ease + intent value + striking-distance bonus) with per-source badges (GSC / SEMrush / AI) |
| Article ideas | Generic prompt per keyword | Grounded in per-property **Business Goals** (Account → Business Goals), published Wix articles (anti-cannibalization + internal links), real keyword data, funnel stage + CTA per idea |
| Errors | Silent failures, fake sample content on API errors | Every failure shows the real cause with a Retry button; generation never substitutes sample content |
| Images | Not supported | Cover + per-section images in the editor; uploaded into the **Wix Media Manager** (Wix-hosted) and embedded in the draft's rich content with alt text + captions |
| Settings | localStorage only (per browser) | Business Goals + Writing Style sync via Supabase (`app_settings` table, service-role only) |
| GSC | Longboat Key returned 403 | Domain-property 403s automatically retry as URL-prefix properties |

### New environment variable (required for SEMrush)

In Vercel → Project → Settings → Environment Variables, add:

```
SEMRUSH_API_KEY=<your key from semrush.com/api-documentation>
```

Note: the SEMrush **Analytics API** requires an API-enabled subscription (Business plan) or purchased API units. If your plan doesn't include it, the app shows the exact SEMrush error and everything else keeps working — the key status appears as a chip on the keyword step.

### How to test the new features

1. **Keyword step** — open any property → New Post. Expect: GSC rows with position data, a "SEMrush ✓" chip once synced (cached 24h per property, "Refresh metrics" to force), Opportunity column sorted high→low, source badges per keyword.
2. **Find keywords** — try all three sources in the dropdown: SEMrush Related, SEMrush Questions, Claude Brainstorm. AI ideas get real SEMrush numbers filled in when the key is configured.
3. **Business goals** — Account → Business Goals, write one per property, Save. Then generate ideas for a keyword: each card should show a funnel stage and a CTA tied to your goal.
4. **Images** — in Preview & Edit, add a cover image and a section image, give them alt text, approve, Send to Wix Drafts. Open the draft in Wix: images should live in the Media Manager and appear in the post + as the cover.
5. **Failure visibility** — temporarily break something (e.g. remove an env var in a preview) and confirm the UI shows the real error instead of sample content.
