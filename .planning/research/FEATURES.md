# Feature Research

**Domain:** AI-powered 1:1 meeting management SaaS
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH

## Feature Landscape

This analysis draws from the competitive landscape (Fellow, 15Five, Lattice, Windmill, Leapsome, Hypercontext/Spinach, Culture Amp), the project's existing design documents, and the stated product vision of "AI as the core experience, not a bolt-on."

The key insight: most competitors treat AI as an add-on layer (transcription, summarization) applied to unstructured meetings. The 1on1 product's structured questionnaire approach creates uniquely clean, typed, longitudinal data -- the perfect foundation for AI that actually knows what it is talking about. This is the wedge.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Every serious competitor has these.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shared meeting agendas | Fellow, Lattice, 15Five all have them. Both parties add topics pre-meeting. Without this, users feel the tool is one-directional (manager-only). | LOW | Already in design as "talking points." Keep this name -- it's more specific. |
| Action item tracking with owners & due dates | 44% of meeting action items never get completed (Fellow data). Tracking is the #1 reason teams adopt these tools. | MEDIUM | Already well-designed. The carry-over across sessions is critical -- Fellow and Windmill both do this automatically. |
| Action item carry-over to next session | Windmill and Fellow both surface incomplete items automatically. Users expect unfinished business to follow them. Without this, the tool trains learned helplessness. | LOW | Currently in v2 roadmap as feature #16. MOVE TO MVP. This is table stakes, not a nice-to-have. It is trivial to implement and transforms session continuity. |
| Session history with full context | Users need to see what happened in past 1:1s. Every competitor provides chronological session lists with click-through to details. | MEDIUM | Already designed. The timeline view in docs/features.md is solid. |
| Calendar integration (Google Calendar) | Every competitor integrates with calendars. Without this, users manually coordinate scheduling -- a dealbreaker for managers with 5+ reports. Windmill, Fellow, Lattice all treat this as core. | HIGH | Currently in v2 roadmap. This is a mistake. For a manager tool, calendar sync is table stakes at launch. At minimum, read-only sync (show upcoming 1:1s from calendar) should be MVP; full read/write can be v1.1. |
| Email notifications (reminders, summaries) | Every tool sends pre-meeting reminders and post-session summaries. Without these, users forget meetings exist in the tool. | MEDIUM | Already in MVP as feature #11. Good. |
| Manager dashboard with upcoming sessions | The landing page. Every competitor has this. Shows what is coming up, what is overdue, what needs attention. | MEDIUM | Already well-designed in docs/ux-flows.md. The status indicators (green/yellow/red) are a nice touch. |
| Multi-user roles (admin/manager/member) | Enterprise and mid-market teams need access control. Every competitor has at least 3 roles. | MEDIUM | Already designed. RBAC with resource-level checks is well thought out. |
| Template/questionnaire system | 15Five has structured check-ins. Lattice has configurable 1:1 templates. Fellow has suggested topics. Structured input is expected in this category. | HIGH | Already designed with 6 question types. This is one of the strongest parts of the existing design. |
| Auto-save during sessions | Users expect modern web apps to save automatically. Losing notes mid-session is unforgivable. | LOW | Already designed with 500ms debounce. Good. |
| Dark mode | Standard expectation for any modern SaaS. Every shadcn/ui app supports it trivially. | LOW | Already planned via Tailwind dark: variants. |
| Mobile-responsive session view | While a native mobile app can wait, the session wizard MUST work on tablets. Managers often take 1:1 notes on iPads. | MEDIUM | Responsive strategy in docs/ux-flows.md covers this. The collapsible context panel approach is correct. |
| Full-text search across session notes | Users need to find "that thing we discussed 3 months ago." Fellow highlights this as a key feature. | MEDIUM | Already in MVP as part of feature #9. |

### Differentiators (Competitive Advantage)

Features that set the product apart. These are where 1on1 competes -- and where the AI-first vision creates distance from competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI pre-session nudges** | "Last time Alex mentioned burnout -- follow up?" No competitor does this well with structured data. Windmill pulls context from Slack (noisy, unstructured). 15Five check-ins are pre-meeting but static. 1on1's structured answer history enables surgical, specific nudges grounded in actual session data. | HIGH | This is the killer feature. An AI that reads previous session answers (typed, categorized, scored) and generates 2-3 specific conversation starters. Much more precise than Windmill's "everything from Slack" approach. |
| **AI live suggestions during sessions** | Based on current answers and historical context, the AI suggests follow-up questions in real-time. "Score dropped from 4 to 2 on workload -- ask about resource allocation." No competitor does in-session suggestions based on quantitative trends. | VERY HIGH | Technically complex (needs streaming, context window management, low latency). But this is what makes the wizard feel alive. Phase this: start with pre-computed suggestions based on answer changes, then add real-time streaming. |
| **AI-generated session summaries** | Auto-generate concise narrative from structured answers + notes. Unlike transcript-based summaries (Otter, Fellow), these are grounded in typed data (ratings, mood, text). Result: cleaner, more actionable summaries. | MEDIUM | Straightforward LLM task. Structured data makes this easier and more reliable than transcript parsing. High-value, moderate effort. |
| **AI personal profiles over time** | Build a longitudinal profile from accumulated 1:1 data: communication preferences, recurring concerns, growth trajectory, sentiment patterns. No competitor builds this from structured meeting data. Hedy AI announced cross-session Topic Insights in Nov 2025, but it works on transcripts, not structured data. | HIGH | Unique differentiator. The structured questionnaire data is the moat -- competitors using transcripts cannot match the signal quality. |
| **AI growth narratives** | Instead of raw charts, generate human-readable growth stories: "Over the past quarter, Alex's engagement scores improved 23%, coinciding with the team restructuring. Workload concerns from October have resolved. Career satisfaction remains an area to watch." | MEDIUM | Layer on top of analytics. Transforms numbers into stories managers can share in performance reviews. Unique in the market. |
| **AI anomaly detection with proactive alerts** | "Maria's wellbeing score dropped 40% in 2 sessions" as a dashboard alert or email. Lattice does basic sentiment analysis on survey text. 1on1 can do this with actual numeric trend data -- more reliable, fewer false positives. | MEDIUM | Statistical anomaly detection on structured numeric data is well-understood (z-scores, moving averages). Does not require LLM -- can be rules-based initially. |
| **Step-by-step session wizard with context panel** | The wizard UX (questions one category at a time, with context sidebar showing history) is unique. Competitors use free-form note editors (Fellow) or simple check-in forms (15Five). The wizard makes the meeting feel guided and purposeful. | HIGH | Already well-designed. This is the core UX differentiator. The category-grouped steps with progress indicator and always-visible notes is superior to any competitor's approach. |
| **Private notes with encryption** | Manager-only notes encrypted at rest (AES-256-GCM). Fellow keeps 1:1 notes private between parties but does not encrypt at rest. This is a trust feature -- managers need to write candid observations. | MEDIUM | Already designed. Per-tenant key derivation via HKDF is the right approach. Differentiates on security posture. |
| **Structured data enabling SQL-native analytics** | By storing typed answers (numeric, text, JSON) rather than just transcripts, the platform can do native SQL aggregation, trend analysis, and category breakdowns without LLM interpretation. This is faster, cheaper, and more accurate than competitors parsing transcripts. | LOW (design) | This is an architectural differentiator, not a feature users see. But it enables every analytics and AI feature to be built faster and more reliably. Already designed in data model. |
| **Constant feeling of progress** (UX philosophy) | Score trend sparklines in the session wizard, session-over-session comparison arrows, action item completion rates, streak indicators for meeting cadence. The product should feel like a fitness tracker for professional relationships. | MEDIUM | Not a single feature but a design principle applied everywhere. Competitor dashboards show data; this product should show momentum. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly do NOT build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time video/audio in the session wizard** | "If the meeting tool could also be the video call, it's all-in-one!" | Competing with Zoom/Teams/Meet is suicidal. These tools have billions in R&D. Also, adding video doubles the engineering surface (WebRTC, media servers, reliability). Every competitor that tried embedded video failed. | Deep link from calendar event to the session wizard. The wizard runs alongside the video call (split screen or second monitor). |
| **AI meeting transcription** | "Record and transcribe the 1:1 automatically." Otter, Fireflies, Fellow all do this. | Transcription is a commodity (Whisper, Deepgram, AssemblyAI). Building it in-house adds huge complexity (audio processing, storage, speaker diarization). More importantly, transcription creates noisy data. The structured questionnaire approach IS the alternative -- it produces cleaner, more actionable data than any transcript. | The structured session wizard with typed answers replaces the need for transcription. For teams that want transcripts, integrate with Otter/Fireflies/Fellow via API (v3). |
| **Full HRIS / payroll integration** | "Import our org chart from BambooHR/Rippling." | HRIS integrations are a swamp of custom APIs, data mapping, and edge cases. Each integration is weeks of work with ongoing maintenance. For an early product, manual user management is fine. | CSV import for bulk user creation (MVP). Single HRIS integration (BambooHR or Rippling) in v2 if demand warrants. |
| **Anonymous peer feedback / 360 reviews** | "Managers should see anonymous feedback from peers during 1:1s." | Anonymous feedback in 1:1 context creates trust issues. If a report suspects their manager received negative anonymous feedback, it poisons the 1:1 relationship. Also, building anonymous survey infrastructure is a separate product. | Keep 1:1s focused on the manager-report relationship. If 360 is needed, integrate with a dedicated 360 tool (Culture Amp, Lattice) via API in v3. |
| **OKR / goal tracking within the product** | "Connect action items to company OKRs." Lattice and 15Five both embed OKR tracking. | OKR tracking is a separate product category with its own UX complexity (cascading goals, key results, progress tracking, alignment views). Bolting it on dilutes the 1:1 focus and adds months of scope. | Reference goals in session notes and action items as free text. In v2, add a lightweight "goals" field on user profiles that shows in the context panel. Full OKR integration via API (v3). |
| **Gamification (badges, leaderboards)** | "Give managers badges for completing 1:1s on time!" | Gamification trivializes serious professional conversations. Badges for "10 sessions completed" make 1:1s feel like a compliance checkbox, not a meaningful activity. Leaderboards for manager scores create toxic competition. | Use subtle progress indicators instead: streak counts, trend arrows, completion percentages. Celebrate consistency without trivializing the content. |
| **Slack/Teams bot that replaces the session wizard** | "Let people answer check-in questions directly in Slack." 15Five and Windmill do this. | Answering structured questions in a chat interface produces lower-quality responses. The wizard UX (focused, one-at-a-time, with context panel) is intentionally designed to create a reflective moment. Slack answers are dashed off between messages. | Slack/Teams for reminders, nudges, and quick action item updates. The actual session stays in the dedicated wizard. |
| **Manager scoring / ranking** | "Show which managers have the best 1:1 scores across the company." | Creates perverse incentives. Managers will game scores (softball questions, implicit pressure for high ratings) or avoid the tool entirely. Destroys psychological safety. | Show managers their own trends privately. Show admins meeting adherence rates (are 1:1s happening?) without individual score comparisons. |

## Feature Dependencies

```
[Auth & Multi-tenancy]
    |-- requires --> [Database schema + RLS policies]
    |-- enables --> [Everything else]

[User Management + Invites]
    |-- requires --> [Auth & Multi-tenancy]
    |-- enables --> [Team Management, Meeting Series]

[Questionnaire Template Builder]
    |-- requires --> [Auth & Multi-tenancy]
    |-- enables --> [Session Wizard]

[Meeting Series]
    |-- requires --> [User Management (manager-report pairs)]
    |-- requires --> [Template Builder (default template)]
    |-- enables --> [Session Wizard, Calendar Integration]

[Session Wizard (core experience)]
    |-- requires --> [Meeting Series]
    |-- requires --> [Template Builder]
    |-- enables --> [Session History, Analytics, AI features]

[Action Items]
    |-- requires --> [Session Wizard (inline creation)]
    |-- enables --> [Action Item Carry-Over, Dashboard overdue items]

[Action Item Carry-Over]
    |-- requires --> [Action Items]
    |-- enhances --> [Session Wizard (context panel)]

[Session History + Search]
    |-- requires --> [Session Wizard (completed sessions)]
    |-- enhances --> [Session Wizard (context panel past sessions)]

[Basic Analytics]
    |-- requires --> [Session Wizard (numeric answer data)]
    |-- requires --> [Analytics Snapshot background job]
    |-- enhances --> [Dashboard, Person profile]

[AI Pre-Session Nudges]
    |-- requires --> [Session History (>=3 sessions for a series)]
    |-- requires --> [LLM integration infrastructure]
    |-- enhances --> [Pre-session state, Dashboard]

[AI Session Summaries]
    |-- requires --> [Session Wizard (completed session data)]
    |-- requires --> [LLM integration infrastructure]
    |-- enhances --> [Post-session experience, Email notifications]

[AI Live Suggestions]
    |-- requires --> [AI Pre-Session Nudges (same LLM infra)]
    |-- requires --> [Session History (contextual data)]
    |-- enhances --> [Session Wizard (during session)]

[AI Personal Profiles]
    |-- requires --> [Session History (>=5 sessions)]
    |-- requires --> [Analytics infrastructure]
    |-- enhances --> [Context panel, Manager dashboard]

[AI Growth Narratives]
    |-- requires --> [Basic Analytics (trend data)]
    |-- requires --> [AI Personal Profiles]
    |-- enhances --> [Analytics page, PDF reports]

[Calendar Integration (Google)]
    |-- requires --> [Meeting Series]
    |-- requires --> [Google OAuth setup]
    |-- enhances --> [Dashboard, Session scheduling]

[Email Notifications]
    |-- requires --> [Meeting Series (scheduling data)]
    |-- requires --> [Email provider (Resend)]
    |-- enhances --> [Pre-session reminders, Post-session summaries]
```

### Dependency Notes

- **Session Wizard requires Template Builder and Meeting Series:** Cannot conduct a session without a questionnaire and a manager-report pairing. These must be built first.
- **All AI features require LLM infrastructure:** Set up the LLM integration layer (API client, prompt management, rate limiting, cost tracking) once, then all AI features build on it.
- **AI Pre-Session Nudges require session history:** Need at least 3 completed sessions in a series for the AI to have meaningful context. This means AI features only activate after initial usage -- design the onboarding to set this expectation.
- **Analytics requires the Inngest background job:** Pre-computed snapshots power the dashboard charts. The background job infrastructure (Inngest) must be set up alongside or before analytics.
- **Calendar Integration requires Google OAuth:** The same OAuth flow used for Google Sign-In can be extended for Calendar API scopes. Plan these together.

## MVP Definition

### Critical Reassessment of the Existing Roadmap

The existing `docs/features.md` places AI features in v3 and calendar integration in v2. Based on competitive analysis, this is a strategic error. If AI is the core differentiator (as stated in PROJECT.md), it cannot ship after competitors have already established AI as standard. And if calendar integration is table stakes (as every competitor demonstrates), deferring it to v2 creates immediate churn.

### Launch With (v1)

Minimum viable product -- what is needed to validate the "AI-first 1:1 meetings" concept.

- [ ] **Auth + Multi-tenancy + RLS** -- Foundation for everything
- [ ] **User management with invites** -- Get people into the system
- [ ] **Team management (basic)** -- Establish reporting lines
- [ ] **Questionnaire template builder (6 types)** -- The structured data engine
- [ ] **Meeting series** -- Pair managers with reports, set cadence
- [ ] **Session wizard with context panel** -- THE core experience. This is the product.
- [ ] **Action items with carry-over** -- Move carry-over from v2 to MVP. Without it, sessions feel disconnected.
- [ ] **Manager dashboard** -- The home screen that makes managers feel in control
- [ ] **Session history** -- See what happened before
- [ ] **Basic analytics (score trends, category breakdown)** -- Validate the structured data value
- [ ] **Email notifications (reminders + summaries)** -- Keep users engaged between sessions
- [ ] **AI session summaries** -- The first AI feature users see. Low complexity, high impact. Proves the "AI-first" positioning.
- [ ] **AI pre-session nudges** -- The second AI feature. "Here's what to follow up on." Delivers the "constant feeling of progress" vision.
- [ ] **Google Calendar read-only integration** -- Show upcoming 1:1s from calendar. Do not create/modify calendar events in v1. This is enough to avoid the "where are my meetings?" problem.

### Add After Validation (v1.x)

Features to add once core is working and users have accumulated enough session data.

- [ ] **AI live suggestions during sessions** -- Add when the LLM infrastructure is proven stable. Requires low latency and good prompt engineering.
- [ ] **AI anomaly detection + alerts** -- Add when users have enough data (8+ sessions per series). Rules-based initially, no LLM needed.
- [ ] **Google Calendar read/write** -- Auto-create calendar events for scheduled sessions. Extend the read-only integration.
- [ ] **Full-text search across sessions** -- Add when session volume makes manual browsing insufficient.
- [ ] **AI personal profiles** -- Requires significant session history. Surface in context panel.
- [ ] **Conditional question logic** -- "If workload > 4, ask about delegation." Enhances template builder.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Advanced analytics (heatmaps, team aggregates, comparison views)** -- Defer until there are enough tenants with enough data
- [ ] **AI growth narratives** -- Requires personal profiles + analytics maturity
- [ ] **Template library (pre-built system templates)** -- 4 templates already designed in docs/questionnaires.md. Ship 2-3 as seed data in v1; the full library UI is v2.
- [ ] **PDF export with company branding** -- Useful for performance reviews but not core to 1:1 value
- [ ] **Slack/Teams integration** -- Reminders and nudges via chat. Defer until core UX is validated.
- [ ] **SSO (SAML/OIDC)** -- Enterprise requirement. Add when enterprise deals demand it.
- [ ] **Outlook/O365 calendar sync** -- After Google Calendar is proven
- [ ] **eNPS tracking** -- Can be approximated with a rating_1_10 question in templates
- [ ] **360 feedback** -- Anti-feature for 1:1 context. Build only if validated by user demand.
- [ ] **Public API + webhooks** -- Build when integration demand materializes
- [ ] **Mobile app** -- Web is responsive enough for v1. Native app when usage data shows mobile demand.
- [ ] **i18n** -- English-only until international expansion is a priority

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Session wizard + context panel | VERY HIGH | VERY HIGH | P1 | The product IS this screen |
| Auth + multi-tenancy + RLS | HIGH (enabling) | HIGH | P1 | Foundation |
| Questionnaire template builder | HIGH | HIGH | P1 | Creates the structured data |
| Action items + carry-over | HIGH | MEDIUM | P1 | Accountability loop |
| Meeting series | HIGH | MEDIUM | P1 | Pairs managers with reports |
| AI session summaries | HIGH | LOW-MEDIUM | P1 | First proof of AI-first positioning |
| AI pre-session nudges | VERY HIGH | MEDIUM-HIGH | P1 | The "wow" moment |
| Manager dashboard | HIGH | MEDIUM | P1 | The home screen |
| Email notifications | MEDIUM | MEDIUM | P1 | Retention mechanism |
| User management + invites | HIGH (enabling) | MEDIUM | P1 | Gets users in |
| Google Calendar (read-only) | HIGH | MEDIUM | P1 | Avoids "where are my meetings?" |
| Basic analytics | HIGH | MEDIUM | P1 | Validates structured data value |
| Session history | MEDIUM | LOW-MEDIUM | P1 | Context for continuity |
| Team management | MEDIUM | LOW | P1 | Organizational structure |
| AI live suggestions | VERY HIGH | VERY HIGH | P2 | After LLM infra is stable |
| AI anomaly detection | HIGH | MEDIUM | P2 | After data accumulation |
| Google Calendar (read/write) | MEDIUM | MEDIUM | P2 | Extend existing integration |
| Conditional question logic | MEDIUM | MEDIUM | P2 | Template builder enhancement |
| AI personal profiles | HIGH | HIGH | P2 | After sufficient history |
| Full-text search | MEDIUM | LOW | P2 | When volume demands it |
| Advanced analytics | MEDIUM | HIGH | P3 | After data maturity |
| AI growth narratives | HIGH | MEDIUM | P3 | After profiles + analytics |
| Slack/Teams integration | MEDIUM | MEDIUM | P3 | After core is validated |
| PDF export | MEDIUM | MEDIUM | P3 | Performance review season feature |
| Template library UI | LOW | LOW | P3 | Seed templates in v1, full UI later |
| SSO | MEDIUM (enterprise) | MEDIUM | P3 | When enterprise deals require it |

## Competitor Feature Analysis

| Feature | Fellow | 15Five | Windmill | Lattice | 1on1 (Our Approach) |
|---------|--------|--------|----------|---------|---------------------|
| Meeting format | Free-form shared notes + agenda | Structured weekly check-in questions | AI-built agenda from Slack/tools | Free-form with goal links | **Structured wizard with typed questions + context panel** -- combines 15Five's structure with Fellow's collaboration |
| AI capabilities | Transcription, summaries, action item extraction | AI performance reviews (2025) | AI agenda generation from work context | AI survey analysis, sentiment | **AI pre-session nudges, live suggestions, summaries, growth narratives** -- all grounded in structured data, not transcripts |
| Data quality | Unstructured notes | Structured (pulse, ratings) but limited types | Unstructured (Slack messages, tool data) | Survey-based (periodic) | **6 typed question formats producing SQL-aggregatable data** -- best structured data in the category |
| Session continuity | Previous meeting notes visible | Check-in history | Previous items carry forward | Limited | **Context panel with past 3 sessions, trends, action items, and AI nudges** -- deepest continuity |
| Calendar integration | Google, Outlook | Google, Outlook | Google, Outlook | Google, Outlook | **Google Calendar (MVP), Outlook (v2)** |
| Action items | AI-extracted, sync to task tools | Basic tracking | Auto-carry from previous | Basic | **Inline creation in wizard, carry-over, assignee + due date** |
| Analytics | Basic meeting stats | Engagement scores, pulse trends | Work context stats | Advanced (heatmaps, sentiment) | **Score trends, category breakdown, session comparison, AI narratives** -- combines numeric precision with AI interpretation |
| Private notes | Notes private between parties | Not a focus | Not mentioned | Not mentioned | **Encrypted at rest (AES-256-GCM)** -- strongest privacy posture |
| Pricing | Free/$7/user/mo | $11/user/mo | $8/user/mo | $11/user/mo | TBD |
| Primary strength | Meeting productivity for all meeting types | Manager coaching & weekly rhythm | Slack-native AI context | Full HR platform (perf + engagement) | **AI-first 1:1s with structured data producing compounding insights** |

## Key Strategic Insights

### 1. The Structured Data Moat

Every competitor either uses unstructured notes (Fellow), unstructured tool context (Windmill), or periodic surveys (Lattice, Culture Amp). The 1on1 product is unique in collecting structured, typed, categorized data at the cadence of every 1:1 meeting. This creates a compounding data advantage: the more sessions conducted, the better the AI becomes. No competitor can retrofit this without fundamentally changing their product.

### 2. AI Must Ship in v1

The existing roadmap places AI in v3. This is backwards. If the pitch is "AI-first 1:1 meetings," users who arrive and find zero AI will feel misled. Ship AI session summaries and pre-session nudges in v1. They are technically feasible (structured data makes them straightforward LLM tasks) and they prove the positioning. Live suggestions and personal profiles can follow in v1.x.

### 3. Calendar Integration Cannot Wait

Every competitor has calendar integration. Managers will not adopt a tool that does not show up in their calendar. A read-only Google Calendar integration (display upcoming sessions, deep link to wizard) is sufficient for v1 and avoids the complexity of creating/modifying calendar events.

### 4. The "Constant Feeling of Progress" Is a UX Principle, Not a Feature

This should pervade every screen: sparklines in the context panel, trend arrows on dashboard cards, completion percentages on action items, streak indicators for meeting cadence. Competitor dashboards display data; this product should display momentum.

### 5. Action Item Carry-Over Is Table Stakes, Not v2

Moving it to v2 was likely a scoping decision, but it is trivial to implement (query for open items on a series, display in context panel) and transforms the session experience. Every competitor that has action items also has carry-over.

## Sources

- [Windmill 1:1 features](https://gowindmill.com/features/one-on-ones/) -- MEDIUM confidence, verified via official site
- [Fellow 1:1 meeting features](https://fellow.ai/use-cases/one-on-one-meetings) -- MEDIUM confidence, official site
- [15Five check-ins overview](https://www.15five.com/products/perform/check-ins) -- MEDIUM confidence, official site
- [Lattice 1:1 platform](https://lattice.com/platform/performance/one-on-ones) -- MEDIUM confidence, official site
- [Leapsome AI features](https://www.leapsome.com/product/leapsome-ai) -- MEDIUM confidence, official site
- [Hedy AI Topic Insights announcement](https://www.globenewswire.com/news-release/2025/11/24/3193943/0/en/) -- MEDIUM confidence, press release Nov 2025
- [AI 1:1 meeting features analysis (TeamGPS)](https://teamgps.com/blog/productivity-and-performance/ai-1-on-1-meetings/) -- LOW confidence, single blog source
- [Proactive AI coaching research (Pinnacle)](https://www.heypinnacle.com/blog/what-is-the-impact-of-proactive-ai-coaching-on-manager-adoption-and-behavior) -- MEDIUM confidence, vendor research
- [Fellow action item tracking stats](https://fellow.ai/blog/how-to-track-action-items-steps-to-ensure-follow-through/) -- LOW confidence, vendor blog (44% stat unverified independently)
- [People Managing People 1:1 software review](https://peoplemanagingpeople.com/tools/best-one-on-one-meeting-software/) -- MEDIUM confidence, multi-source review
- [Windmill best 1:1 software comparison](https://gowindmill.com/resources/lists/best-1-on-1-meeting-software/) -- LOW confidence, vendor comparison (biased)
- Existing project documentation (docs/features.md, docs/ux-flows.md, docs/analytics.md, docs/questionnaires.md) -- HIGH confidence, first-party design docs

---
*Feature research for: AI-powered 1:1 meeting management SaaS*
*Researched: 2026-03-03*
