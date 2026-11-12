# Casey portfolio: handoff notes (for a fresh Claude session)

Paste this file's contents, or tell Claude to read it, at the start of a new session in the `casey-portfolio` folder.

## Project
- Astro 5 static site, story-driven portfolio. Live preview: http://next.caseyflood.design (GitHub Pages). Casey runs git manually.
- Main file: `src/pages/work/dandy-design-editor.astro` (Impact case study). Styles: `src/styles/global.css` (new rules are appended at the end; later rules win). Scroll engine: `src/scripts/takeover.ts`. Media map: `src/data/dde-media.ts`.
- Phone changes are gated behind `.cx--mob` (max-width 899px). Desktop must stay full. Never let a phone fix change desktop.
- Scenes are driven by the `scenes` array in the .astro file. Each beat can have: `title`, `titleHtml`, `text`, `friction` (callout), `measures` (chips), `metric`, `imp` (panel: `big`, `sub`, `rows`, `chips`, `swim`, `shots`), a quote, a link. Phone-only short copy lives in `mtexts`. Dash hover labels are in `shortNames`.

## Preview and deploy
- Local: `npm install && npm run dev` (or `npm run build && npx astro preview`).
- Publish: `git add -A && git commit -m "..." && git push origin main`. If GitHub Actions/Pages is down: `npm run build && touch dist/.nojekyll && npx gh-pages -d dist --dotfiles` (Pages source was switched to branch `gh-pages`). Workflow concurrency group is `pages-2`.

## Case study structure now (DDE, Impact project)
Hero + animated scan, short version, journey, then scenes:
02 problem and reframe (handoff/14.5 min, baseline 46% and 6.9 vs 9.1) > 03 how I found it (Cairo, shadowing and reviews, competitors) > 04 Moment 1 starting a crown (ML crown, choose-crown, result + friction) > 05 Moment 2 one flow (before/after people visual, automated prep, result + friction) > 06 Moment 3 guided editor (buried tools, stages, tagging, result + friction with cycling flag screenshots) > 07 how I led it (design system, prototype + weekly testing, ideal version + releases, hub) > 08 impact (Goal 1, Goal 2) > 09 reflections (hard, where I was wrong, differently, next) > 10 try the prototype (optional) > 11 phone concept > closing.
Feedback this follows: Karim (intro, background with data, three key problems each with before/after, wrap-up), Monica (be ready for friction, assumptions that were off, pushback), original prompt (Impact + Craft case studies; "seek truth through facts").

## Decisions and content rules
- First person ("I"). Say "dental designers". Avoid the word "handoff" (jargon); say "transfers" or "passing between people and tools".
- Do not invent facts. Friction and process lines were confirmed by Casey via multiple choice: designers distrusted the crown shape and wanted control; engineering scope (sliced into releases) and designer trust in automation for prep; designers feared intrusive blockers and wanted familiar tools and hotkeys; her wrong assumptions (ML and prep alone would fix speed, more automation is always better, the old tools were the problem).
- Automated prep: she decided to show what Dandy did, allow revert/edit, add context on what the model did.

## OPEN: metrics are unverified (Casey chose to defer)
A TextQL/Hex run on BigQuery could NOT reproduce: 6.4 -> 5.6 min designer time (-11.5%), 14.5 -> 11.8 min process time, 57% or 54% volume growth, or the 3,200 hours estimate. Its cohort showed per-order active time rising (partly case-mix) and Q1 2025 editor data covering only ~2 weeks. Possible sources: `DANDY_PORTAL_PREP` Q1 2025 was 5.61 active / 6.41 total min (looks like the 5.6 and 6.4); closest volume match is +60% from Q3 2025 to Q2 2026. Not tested: order-to-shipped 7.4 -> 5.9 days, refab 6.3-6.5%, ML 5.8% vs 6.6%, adoption 70% -> 88% (baseline definition unclear: the old editor may be logged under another `design_source`). Next step: find where each number first came from and ask the data team (which `design_source` is the old editor, where "process time incl. waits" is computed, the right baseline). These numbers still appear in: hero short-version cards, Goal 1 impact slide, the 14.5 min slide, `mtexts`.

## Other open items
- Amwell (Craft project) needs the same restructure: about 30 beats down to about 3 moments with before/after UI, verified or labeled metrics (45% -> 82% task completion, 30%, 34%, 25%), sketches/wireframes, and the pre-AI craft story.
- Not done: shrink the journey into a single graphic (only its scroll length was reduced); real before/after UI screenshots for Moments 1 and 2; Moment 2 friction beyond what is on the page; clickable flag pills; remove dead storyboard CSS (`.jm__chain`, `.jm__node`, `.jm__shots`, `.jm__zoom`, `.jm__sub`, `.jm__one`, `.jm__caps`, `.jm__dots`) and unused media (`leads-room.webp`, `figjam.mp4`).
- Check "Audit . built in" wording (Moment 2 visual) matches reality; the separate auditor review may still be outside the editor.
- Site-wide: placeholders (timeline photos, Amwell highlights, How I Work visuals, My Trips image), LinkedIn URL, anonymize patient data in videos/stills, confirm permission to publish Dandy metrics, private one-page fact sheet for the Career Deep Dive, optional "Enforce HTTPS" and switching Pages source back to GitHub Actions.
- Persona photos in the Moment 2 visual (`public/work/dde/persona-*.webp`) are small crops of AI-generated portraits.
