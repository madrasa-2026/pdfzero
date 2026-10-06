# PDF Tools Website — Complete Project Pack
**Goal:** an "I Love PDF"-style site — free browser-based PDF tools, 100% client-side, monetized with Google AdSense, $0 budget.
**Who builds:** you drive Google Antigravity in **agent mode** (it writes the code); Muse (me) handles research, SEO content, and weekly maintenance direction.
**Last updated:** 2026-10-05 · Based on web research conducted 2026-10-05 (figures cited inline; treat as research, not guarantees).

---

## PART 0 — The honest picture first

- **Demand is enormous.** iLovePDF alone got ~255M visits in August 2026, and 68% of that came from Google search. People constantly search for "merge pdf", "compress pdf", etc.
- **Bangladesh is iLovePDF's #2 market in the world (12.35% of its traffic).** You're sitting in one of the hungriest markets for this — a genuine advantage.
- **But:** you will NOT rank for "merge pdf" in year one. Giants (iLovePDF, Smallpdf, Adobe) own those keywords. Your path is **long-tail keywords** ("merge pdf online free no signup", "compress pdf below 1mb"), the **privacy angle** ("files never leave your device" — people are anxious about uploading documents), and later **Bengali-language pages** (no big player does this well).
- **Timeline:** Google indexes new pages in days–weeks; first real search traffic in 3–4 months; meaningful traffic in 6–7 months. This is a 6–12 month compounding project, not a 30-day win.
- **Money:** AdSense on tool sites typically earns a few dollars per 1,000 page views (conservatively model $3–10). No published revenue figures exist for independent PDF sites — anyone promising exact numbers is guessing.

---

## PART 1 — How to drive Antigravity in agent mode (your rules)

Antigravity's agent works across the editor, terminal, and browser by itself — it writes code, runs it, opens the site in Chrome, clicks through it, reads errors, and fixes them. Your job is **not** to code. Your job is to give it one clear task at a time and check its proof.

**The 7 rules:**

1. **One tool = one task.** Never say "build the whole site." Say "build the Merge PDF tool page." Small tasks = the agent stays on track and you can actually review the result.
2. **Plan first, code second.** Always ask for an implementation plan *before* any code is written. Ask it to explain the plan in plain language. Only approve when you understand it.
3. **Demand visual proof.** Every task ends with the agent showing you screenshots or a recording of the tool actually working: upload files → process → download result. No proof = not done.
4. **Use the prompt structure in Part 5** (Objective / Constraints / Validation). It prevents 90% of agent mistakes.
5. **Keep approval mode ON for terminal commands.** Never let it run destructive commands unsupervised. Never paste passwords or API keys into prompts (AdSense needs no secret keys anyway).
6. **One phase at a time, in this order:**
   - Phase 1: Project scaffold (structure, homepage, 3 flagship tools)
   - Phase 2: Remaining tools (one task per tool)
   - Phase 3: SEO content + technical SEO (sitemap, schema, Search Console)
   - Phase 4: AdSense application + ad placement
7. **After each phase, tell it to clean up** unused files and dependencies. Agent builds accumulate clutter.

**Common failure modes (watch for these):**
- You approve a plan you didn't read → wrong architecture gets baked in. Fix: make it explain in plain words first.
- It says "done" but nothing was tested → Fix: browser-test proof is mandatory (Rule 3).
- Vague mega-prompts → the agent drifts. Fix: Rule 1, always.

---

## PART 2 — Skills to use

Antigravity supports installable **skills** (from the `antigravity-awesome-skills` collection — tell the agent: "install skills from antigravity-awesome-skills"). Mention the skill name in your prompt to activate it. Install these before Phase 1:

| Skill | What it does | When to invoke |
|---|---|---|
| `frontend-design` | Professional UI/visual design guidance | Every tool page build |
| `tailwind-patterns` | Tailwind CSS component patterns | Scaffold + all pages (if Tailwind is the styling choice) |
| `react-best-practices` | React patterns | Only if React islands are used inside Astro |
| `seo-audit` | Audits pages against an SEO checklist | Phase 3, per page |
| `programmatic-seo` | Generating many similar high-quality pages from data | Phase 3 (the per-tool page strategy) |
| `schema-markup-generator` | JSON-LD structured data templates | Phase 3 (WebApplication schema per tool) |
| `pdf-lib-claude-skill-package` | pdf-lib recipes (merge, split, reorder via copyPages) | Phase 1–2 (every pdf-lib tool) |
| `browser-automation` / `e2e-testing-patterns` | Agent-driven browser testing | Every tool build (validation step) |
| `adsense-audit` | Audits the site for AdSense policy readiness | Phase 4, before applying |

---

## PART 3 — Professional project structure (the decisions, already made)

- **Framework: Astro** (static output). Why: a 2026 benchmark built the same page in Astro vs Next.js — Astro shipped ~8KB of JavaScript vs ~85KB and scored a perfect Lighthouse performance score. For a content + tools site, Astro wins. Interactive tools run as lightweight "islands" that load only when used.
- **Styling:** Tailwind CSS.
- **Language:** TypeScript. All PDF processing code lives in plain framework-free modules so any UI can call them.
- **Hosting:** Cloudflare Pages (free) or Vercel (free), with a custom domain + HTTPS.
- **Version control:** Git + GitHub (required for the free hosting deploy flow).

**Folder structure the agent must create:**
```
src/
  content/tools/merge-pdf.md      # one file per tool: title, meta description, FAQs, feature list
  pages/tools/[slug].astro        # tool pages generated from the content files (unique title/meta/JSON-LD per page)
  components/layout/              # BaseLayout, Header, Footer, AdSlot
  components/tools/               # one interactive island per tool (upload → options → process → download)
  lib/pdf/                        # merge.ts, split.ts, compress.ts, images.ts — pdf-lib/pdf.js wrappers
public/
  robots.txt  sitemap.xml (generated)  ads.txt  llms.txt
```

**Per-tool page pattern (non-negotiable):** static SEO shell (H1, intro paragraph, how-to steps, FAQ, related-tools links) + ONE interactive island. The shell is what Google ranks and what AdSense approves; the island is what users use.

---

## PART 4 — Tool list: build / exclude

**Build (all 100% client-side):**

| Tool | Library |
|---|---|
| Merge PDF | pdf-lib |
| Split PDF / extract pages | pdf-lib |
| Rotate / reorder pages | pdf-lib |
| Protect (password) / unlock PDF | pdf-lib |
| Page numbers / watermark | pdf-lib |
| JPG → PDF | jsPDF |
| PDF → JPG/PNG images | pdf.js (render to canvas) |
| Compress PDF | pdf.js → downscale → rebuild (see honesty note below) |
| PDF → Word (basic) | pdf.js text extraction + docx lib |

**EXCLUDE — cannot be done without a server (and there is no server):**
- ❌ Word → PDF (no browser-only library renders Word faithfully)
- ❌ OCR / scanned-PDF text recognition (too slow and heavy in-browser)
- ❌ "Smart" lossless compression

**Honesty rules (also AdSense policy):**
- Compress PDF must be labeled **"image-based compression"** with a note: "pages are re-rendered as images — text won't be selectable." Never promise what it doesn't do.
- PDF → Word must be labeled **"basic conversion (text + images only)"** — layout won't match.
- Every tool page states: **"Files are processed in your browser and never uploaded."** This is your #1 differentiator — own it in copy.
- Set explicit limits: ~50–100MB per file, page-count caps on heavy operations, progress bars, clear error messages. Big files can crash phone browsers — caps prevent that.

**Build order:** Merge PDF → Compress PDF → Split PDF first (highest demand), then the rest one per task.

---

## PART 5 — Copy-paste prompts for Antigravity

### PROMPT 1 — Project scaffold (Phase 1, run once)

> **Objective:** Scaffold a static PDF tools website using Astro (static output) + Tailwind CSS + TypeScript, deployed-ready for Cloudflare Pages.
>
> **Constraints:**
> - Use the `frontend-design` and `tailwind-patterns` skills.
> - Create the folder structure: `src/content/tools/`, `src/pages/tools/[slug].astro`, `src/components/layout/`, `src/components/tools/`, `src/lib/pdf/`, `public/`.
> - Homepage lists all planned tools with a clean, professional design (think iLovePDF's clarity, but original design — do not copy their branding).
> - Include `public/robots.txt` (allow all), generated `sitemap.xml`, `ads.txt` (placeholder), `llms.txt`.
> - BaseLayout must include slots for JSON-LD structured data and per-page title/meta description.
> - No backend, no database, no user accounts, no API keys. Everything static.
> - Mobile-first responsive design.
>
> **Validation:**
> - `npm run build` completes with zero errors.
> - Open the homepage in the browser, take a screenshot, and confirm no console errors.
>
> First, present me an implementation plan in plain language and wait for my approval before writing code.

### PROMPT 2 — One tool build (repeat per tool, e.g. Merge PDF)

> **Objective:** Build the "Merge PDF" tool at `/tools/merge-pdf`, following the approved project structure.
>
> **Constraints:**
> - Use the `pdf-lib-claude-skill-package` skill for the merge implementation.
> - Page = static SEO shell (unique H1, intro paragraph, 4–6 how-to steps, 4–6 FAQs, related-tools links) + one Astro island containing the tool UI.
> - Tool UI flow: upload multiple PDFs (drag & drop + file picker) → reorder list → Merge button with progress → download merged PDF.
> - All processing with pdf-lib, 100% in-browser. Display the privacy note: "Files are processed in your browser and never uploaded."
> - Enforce a 100MB per-file cap with a friendly error message.
> - Add `WebApplication` JSON-LD structured data (use the `schema-markup-generator` skill): name, URL, description, applicationCategory, operatingSystem "Any", isAccessibleForFree true, offers price 0, featureList.
> - Unique `<title>` and meta description for this page (no duplicated boilerplate).
>
> **Validation:**
> - `npm run build` passes with zero errors.
> - Browser test: upload 3 sample PDFs, merge, download the result — provide screenshots/recording and confirm no console errors.
> - Run the `seo-audit` skill on this page and fix any issues it flags.

### PROMPT 3 — SEO content per tool page (Phase 3)

> **Objective:** Using the `programmatic-seo` skill, review every tool page (`/tools/*`) and ensure each has: unique title tag (include the primary keyword + brand), unique meta description (150–160 chars, with a call to action), one H1 matching search intent, 150+ words of original intro/how-to text (no duplicated boilerplate across pages), 4–6 FAQs with `FAQPage` schema, and 3+ related-tool internal links.
>
> **Validation:** Provide a table of every page with its title, meta description, and H1 for my review. Flag any duplicate content.

### PROMPT 4 — AdSense readiness (Phase 4, before applying)

> **Objective:** Using the `adsense-audit` skill, audit the entire site for Google AdSense approval readiness.
>
> **Constraints to verify:**
> - About, Contact, Privacy Policy (must disclose third-party advertising cookies), and Terms pages exist and are linked in the footer.
> - Every tool page has substantial original content (not widget-only).
> - No ad placements mimic download/upload buttons; ad units are visually separated from tool controls.
> - `ads.txt` is in `public/` with our publisher ID placeholder.
> - No broken links, HTTPS works, mobile-friendly, no login walls.
>
> **Validation:** Give me a pass/fail checklist. Fix every fail before I apply.

---

## PART 6 — How Google finds your website (do this in Phase 3)

You (the human) do these in your Google account — the agent can't do them for you:

1. **Google Search Console:** add the site as a property, verify ownership (DNS record or HTML file — your hosting dashboard explains how).
2. **Submit the sitemap:** in Search Console → Sitemaps → enter `sitemap.xml`. This is literally handing Google the map of your site.
3. **Request indexing:** in Search Console → URL Inspection → paste each tool page URL → "Request indexing". Do this for the homepage + every tool page at launch.
4. **Watch Coverage:** Search Console shows errors (pages Google couldn't read). Tell Antigravity about any error and it will fix it.

What the agent handles (via Prompts 1–3): `robots.txt`, sitemap generation, unique titles/metas, JSON-LD schema, internal linking (homepage → all tools, every tool page → related tools), fast page loads (lazy-load the heavy PDF libraries only when a tool is opened — this keeps Google's speed scores green).

**Ongoing (your weekly routine with me):** submit new tool pages for indexing, check Search Console for errors and for which queries bring impressions, publish one short "how to" article per tool cluster, list the site on AlternativeTo / Product Hunt / relevant directories.

---

## PART 7 — AdSense rules that matter for this site

1. **Don't apply on day one.** Get indexed first, get some organic traffic flowing (even small), then apply. Review takes days to ~4 weeks. Rejection is normal — fix what's flagged and reapply.
2. **Content per page is the #1 approval factor.** A bare tool widget gets rejected as "low value." Every page needs the intro + steps + FAQs (Prompt 3 covers this).
3. **Never let ads look like your buttons.** An ad styled like a "Download" button = policy violation and possible ban. Keep ads visually separated from upload/download controls.
4. **Placement that works:** one leaderboard below the header, one unit after the intro/how-to text, one below the download/result area. Start with Auto Ads + 2–3 manual units. Never more ads than content; never popups blocking the tool.
5. **Honest disclaimers** (Part 4's honesty rules) aren't just ethics — they're policy compliance.

---

## PART 8 — What I (Muse) do in this project

- **Now:** keyword research — which long-tail PDF keywords to target first (including Bengali opportunities).
- **Phase 3:** review the SEO table from Prompt 3, write/improve page content and FAQs.
- **Weekly (once live):** check Search Console data with you, decide which tool page to strengthen next, track what's getting impressions.
- **Phase 4:** walk you through the AdSense application and the haram-category ad blocks (gambling, alcohol).

Say the word and I'll start the keyword research — that's the true step one, before Antigravity writes a line of code.
