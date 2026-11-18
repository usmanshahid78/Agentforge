# AgentForge

Frontend prototype for building and managing an AI workforce. There is no backend: every screen runs on a typed mock data layer.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build
npm run lint
npm test             # unit tests (interview machine, trust ladder, backtest, portfolio story)
npm run test:e2e     # Playwright: Mission control -> Build -> Hire, and Portfolio -> Team -> Canvas
```

## Local AI model (Ollama)

Open **AI Chat** in the navigation (or `/chat`) for a dedicated chatbot with streamed Ollama replies, model selection, stop/retry controls and a new-chat button. This page always calls the local model, even if other demo features use scripted replies. Conversation history lasts until you leave or reload the page.

Agent chat ("Talk to ..."), the Core assistant and the Build interview can run on a small model on your own machine. Everything else stays on mock data.

In Build, a free-form problem (not the weather demo or a template) is framed by the model: title, mission, duties, data sources, KPI options and names. Typed answers that match no quick reply are read by the model, which picks the matching reply, writes the acknowledgement and rewords the mission and duties. Limits, spending cap, schedule and data sources are still set by the rules in `src/features/builder/interview.ts`; the model code is in `src/features/builder/ai.ts`.

1. Install Ollama from https://ollama.com. It runs in the background on port 11434.
2. Pull a model: `ollama pull qwen3:4b-instruct` (recommended; plain `qwen3:4b` always reasons first and takes minutes per reply on a CPU).
3. `npm run dev`, then open **Settings > AI model**: check that Ollama shows as running, pick the model and press **Run test** to see its speed.

How it works: `src/ai/` is the AI layer. `generate()` in `src/ai/index.ts` sends a system prompt and the chat history to Ollama and streams the reply back. The Vite dev and preview servers proxy `/ollama` to `http://127.0.0.1:11434` (set `OLLAMA_URL` to use another machine). If Ollama is off or the model is missing, the app falls back to the scripted replies and shows a warning. Prompts live in `src/ai/prompts.ts`; an agent's own system prompt (Agent > Settings) replaces the default one.

The proxy only exists in `npm run dev` and `npm run preview`. A static deploy of `dist/` needs a server that forwards `/ollama`.

## Back office (home page)

`/` is the back office: every organization people have created, with stats on what they are making (by industry, agents by role, most-requested features, organizations per month, creators, compliance breaches) and a searchable list.

1. **New organization** (`/orgs/new`): write a description such as "Thor is the CEO of a portfolio management company. Under him there is an investment manager, fund manager, trader, audit...". A live preview shows what was understood: the head (a person), the AI agents under them, the mission, what was asked for, the return periods (ITD, YTD, MTD, MoM) and the industry's compliance rules. The built-in rules in `src/lib/orgs.ts` always read it; with Ollama on, the local model can improve the wording (`src/features/backoffice/ai.ts`).
2. **Organization page** (`/orgs/:id`): **Dashboard**, **Organization** (who reports to whom and who works with whom) and **Details** (the original description, requests, rules, creator).
3. **Investment dashboard**: three simulated portfolios (fictional stocks, seeded prices, rebalanced on a schedule). It shows return per period against the market, growth of £100, month-on-month returns, the contribution of each stock, the return of each stock per period, weights against the 10% / 5/10/40 / 35% sector / 2% cash limits, recommendations from each agent (trades are checked against the limits before you approve them), the agents' discussion and AI suggestions ("Ask the local model"). Other industries get an activity dashboard per agent.

Maths and rules: `src/lib/investing.ts` (contributions add up exactly to the period return; see `src/lib/orgs.test.ts`). State: `src/store/orgs.ts`; seeds: `src/mocks/organizations.ts`.

## The story: Portfolio → Team → Canvas

1. **Portfolio** (`/portfolio`): one box per industry (Retail, Stock Trading, Auto Industry, Banking), one tile per use case. Tile colour is status: grey not started, amber configuring, green live, red issue. Click a tile to see its lead agent, job description, parameters and integrations in the side panel.
2. **Team** (`/projects/:id?tab=team`): the org structure for the use case. The lead agent (e.g. James) sits on top, with his assistant and specialists underneath. The panel on the right recommends agents the team is missing ("Create agent"), and you can create a custom one. The job description, parameters and integrations can be edited here.
3. **Canvas** (`/projects/:id?tab=canvas`): **Cockpit** (run, pause, parameters, escalate), **Observability** (the agents talking to each other and to systems, plus runs, time and cost) and **Outcome** (the lead's plain-language result, trend and fixes to approve).

Try it: open Retail → Inv. Recon., add the Vendor Liaison in Team, run it from the Canvas, then approve both fixes. The outcome changes to "no open inventory problems" and the tile turns green.

Portfolio data lives in `src/mocks/portfolio.ts` (add a `Spec` to add a use case), story logic in `src/lib/portfolio.ts`, state in `src/store/portfolio.ts`.

## Demo walkthrough (Nova Mart)

1. Mission control (`/mission`): click "Analyse how weather affects my shop sales".
2. Build: answer the six questions (chips, text or voice). Name the agent Atlas.
3. Connect the weather and events feeds (in the panel, or on Data sources), then Build.
4. Run backtest: review recommendations, then Promote to shadow mode.
5. Hire Atlas, then "Hire both" to add Stock Planner (Vega) and Promo Strategist (Pulse).
6. Company shows the handoffs; Briefings shows Atlas's 08:00 briefing.

Reset at any time from Settings > Demo controls, the account menu, or Ctrl/Cmd+K.

## Where things live

| Concern | Location |
| --- | --- |
| Product name | `src/lib/constants.ts` (`APP_NAME`) |
| Design tokens | `src/styles/tokens.css` + `tailwind.config.ts` (no hardcoded colours in components) |
| Types | `src/types/index.ts` |
| Fixtures | `src/mocks/` |
| Data access | `src/api/` (latency 300–900 ms, 5% simulated failures, toggle in Settings) |
| Mutable demo state | `src/store/db.ts` (Zustand, persisted to localStorage) |
| Interview state machine | `src/features/builder/interview.ts` (add a `Script` to extend) |
| Trust ladder rules | `src/lib/trust.ts` |
| Avatar system | `src/components/avatar/` (`<Avatar agent size state level />`) |

Going live: replace the function bodies in `src/api/index.ts` with real requests. The types stay the same and no component reads fixtures directly. `src/store/db.ts` then becomes a client cache, or goes away.

## Notes

- 3D: the hero Core and the avatar stage are lazy-loaded React Three Fiber scenes, with 2D fallbacks when WebGL is unavailable or reduced motion is on. To use your own VRM or GLB model, see `public/models/README.md`.
- Lip-sync is an approximation. Browser speech synthesis exposes no audio stream, so mouth movement is driven by word-boundary events (see `src/lib/speech.ts`).
- Voice input uses the Web Speech API (Chrome, Edge and Safari). The mic button hides itself where the API is unsupported.
- Chart series colours use a palette validated for colour-vision deficiency (`--series-*` tokens). Brand accents are reserved for UI chrome.
