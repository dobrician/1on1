# Pitfalls Research

**Domain:** AI-powered 1:1 meeting management SaaS
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (verified across multiple sources; some LLM-specific claims depend on rapidly evolving ecosystem)

---

## Critical Pitfalls

Mistakes that cause rewrites, major delays, or fundamental product problems.

### Pitfall 1: AI as Afterthought Despite "AI-Core" Intent

**What goes wrong:**
The project declares AI as the core differentiator but defers all AI features to v3 (as the existing `docs/features.md` currently does). The data model, API layer, and session wizard get built without AI integration points. When AI is added later, it requires retrofitting: the session wizard needs a live suggestion panel, the data pipeline needs embedding generation, the API routes need streaming response support, and the context panel needs to source AI-generated insights alongside historical data. This is effectively a rewrite of the core experience.

**Why it happens:**
AI features feel risky and complex, so teams push them "until the foundation is solid." But the foundation IS the AI -- without it, you build a structured Google Forms replacement, not an intelligent meeting assistant. The PROJECT.md explicitly says "AI is core, not v3 add-on" but the inherited feature roadmap contradicts this.

**How to avoid:**
- Resolve the contradiction between PROJECT.md (AI is core) and features.md (AI is v3) in the very first planning phase. The roadmap must include AI from the MVP.
- Design the session wizard with AI integration points from day one: a suggestion slot in the context panel, streaming-ready API routes, and a text field architecture that can accept AI-generated content.
- Start with the cheapest viable AI: session summaries via a single LLM call on session completion. This validates the pipeline without requiring real-time streaming.
- Build the embedding/context pipeline early: when sessions are completed, generate embeddings of notes and answers. This data becomes the foundation for all future AI features (suggestions, nudges, profiles).
- Use a provider abstraction layer (e.g., Vercel AI SDK) so you can swap models without touching application code.

**Warning signs:**
- No AI-related columns or tables in the initial database migration.
- Session wizard wireframes lack any AI panel or suggestion area.
- API routes return only JSON, with no streaming support.
- The words "we'll add AI later" appear in planning discussions.

**Phase to address:**
Phase 1 (Foundation) must include AI data pipeline scaffolding. Phase 2 (Session Wizard) must include at minimum post-session AI summaries. Live suggestions can follow in Phase 3.

**Confidence:** HIGH -- supported by PROJECT.md constraints, industry consensus on AI-native architecture ([AI-Native vs AI-Bolted On](https://medium.com/@the_AI_doctor/ai-native-vs-ai-bolted-on-architectures-a-technical-white-paper-for-enterprise-decision-makers-bf081efdc648), [CloudZero on AI-native SaaS](https://www.cloudzero.com/blog/ai-native-saas-architecture/))

---

### Pitfall 2: Multi-Tenant AI Context Leakage

**What goes wrong:**
When the LLM generates session summaries, suggestions, or nudges, it receives context from the tenant's data. If tenant isolation is not enforced at the AI layer -- not just the database layer -- Tenant A's session data can leak into Tenant B's AI outputs. This happens through: (1) shared prompt caches or KV-caches in multi-tenant LLM serving, (2) embedding vectors stored without tenant scoping, (3) RAG retrieval queries that accidentally cross tenant boundaries, or (4) conversation history/context windows that persist between requests.

**Why it happens:**
Developers correctly implement RLS at the database level but forget that the AI pipeline is a separate data path. Embeddings stored in a vector database need their own tenant isolation. LLM API calls include context that must be scoped. Caching of AI responses must be tenant-partitioned.

**How to avoid:**
- Every AI data pipeline step must include `tenant_id` filtering, not just the database queries that feed it.
- Vector store (if used) must partition by tenant. Use tenant-prefixed namespaces or collections, never a single shared index.
- Never include cross-tenant data in LLM context windows. System prompts should never reference other tenants.
- Use stateless LLM API calls (no persistent conversation threads shared across tenants). Each request should be self-contained with the tenant's data only.
- AI response caching must be keyed by `tenant_id + user_id + context_hash`, never by query alone.
- Log and audit what context is sent to the LLM for each request -- this is your detection mechanism.

**Warning signs:**
- AI suggestions reference people or events from another company.
- Vector store queries lack tenant filtering.
- AI cache keys don't include tenant_id.
- No audit trail of what data was sent to the LLM.

**Phase to address:**
Must be designed into the AI architecture from the first AI-related phase. The embedding storage schema and AI context assembly functions must enforce tenant isolation before any AI feature ships.

**Confidence:** HIGH -- supported by OWASP LLM Top 10 ([LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)), academic research on multi-tenant LLM leakage ([Burn-After-Use SMTA](https://arxiv.org/abs/2601.06627)), and industry reports ([LayerX on Multi-Tenant AI Leakage](https://layerxsecurity.com/generative-ai/multi-tenant-ai-leakage/))

---

### Pitfall 3: RLS Bypass in Serverless Connection Pooling

**What goes wrong:**
The project uses PostgreSQL RLS with `SET LOCAL app.current_tenant_id` inside transactions. In serverless environments (Vercel), connection poolers like PgBouncer (used by Neon) operate in transaction mode. If any database operation runs outside a transaction wrapper, the `SET LOCAL` context is not set and RLS policies either deny all access (best case) or, if misconfigured, allow unrestricted access. Additionally, if the application uses the `neondb_owner` role (which has `BYPASSRLS`), RLS policies are silently ignored entirely.

**Why it happens:**
- Developers test locally with a direct connection where `SET LOCAL` works fine, but production uses pooled connections with different behavior.
- A single Drizzle query executed without the `withTenantContext()` wrapper silently bypasses RLS.
- Neon's default connection role (`neondb_owner`) bypasses RLS -- a fact buried in documentation.
- Prepared statements don't work in PgBouncer transaction mode (`prepare: false` is required), and forgetting this causes cryptic errors.

**How to avoid:**
- Create a dedicated database role for the application that does NOT have `BYPASSRLS`. Never use `neondb_owner` in production connection strings.
- Wrap EVERY database operation in the `withTenantContext()` transaction helper. No exceptions.
- Add a lint rule or code review checklist item: "Does this query use `withTenantContext()`?"
- Write integration tests that verify RLS by attempting cross-tenant access with the actual database role.
- Set `prepare: false` in the Drizzle/postgres client configuration for Neon pooled connections.
- Consider adding a middleware that rejects any request where tenant context was not set, as a safety net.

**Warning signs:**
- Any direct `db.query.*` or `db.select()` call not wrapped in `withTenantContext()`.
- Connection string uses `neondb_owner` role.
- RLS integration tests don't exist or only test with a superuser.
- `prepare: false` is not set and you see "prepared statement does not exist" errors.

**Phase to address:**
Phase 1 (Database Setup). RLS policies, dedicated roles, and the `withTenantContext()` wrapper must be established and tested before any tenant-scoped data is written.

**Confidence:** HIGH -- verified via [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls), [Neon RLS guide](https://neon.com/docs/guides/rls-drizzle), [Neon connection pooling docs](https://neon.com/docs/connect/connection-pooling), and [Multi-Tenant RLS failure analysis](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)

---

### Pitfall 4: LLM Cost Explosion at Scale

**What goes wrong:**
AI costs scale with usage in ways that traditional SaaS does not. A session summary that costs $0.02 per call seems cheap. But with 1,000 tenants averaging 50 sessions/month, that's $1,000/month for summaries alone. Add pre-session context generation, live suggestions during sessions (multiple calls per session), AI nudges, and profile building -- costs can reach $5,000-$15,000/month before you have significant revenue. Output tokens cost 3-10x more than input tokens, and context windows (stuffing historical sessions into prompts) inflate input costs further.

**Why it happens:**
- Developers prototype with a single user and don't model per-request costs at scale.
- Product managers add AI features without tracking marginal cost per feature.
- No cost caps or circuit breakers exist, so a single tenant's heavy usage can blow the budget.
- Context window stuffing: including "last 10 sessions" of notes in every prompt balloons token counts.

**How to avoid:**
- Model costs early: calculate cost per session, per tenant, per month for each AI feature. Use [llm-prices.com](https://www.llm-prices.com/) or [pricepertoken.com](https://pricepertoken.com/) for estimates.
- Implement tiered AI: use cheap models (GPT-4o-mini, Gemini Flash-Lite) for summaries and simple suggestions. Reserve expensive models for complex analysis.
- Cache aggressively: if a session summary has been generated, never regenerate it. Cache AI suggestions that haven't changed.
- Use batch APIs for non-real-time features (50% cheaper on OpenAI). Session summaries and profile updates don't need to be real-time.
- Implement per-tenant rate limiting on AI features. Free tier gets limited AI calls; paid tiers get more.
- Compress context: summarize historical sessions into condensed profiles rather than stuffing raw text into every prompt. Use embeddings + RAG rather than raw context.
- Track cost per AI call in your observability stack. Alert when daily spend exceeds thresholds.

**Warning signs:**
- No cost tracking per AI call in your application logs.
- Prompt templates include unbounded historical data (e.g., "all previous sessions").
- All AI features use the same expensive model.
- Monthly AI API bill grows faster than user count.

**Phase to address:**
The AI architecture phase must include cost modeling and the provider abstraction layer. Per-call cost tracking should ship with the first AI feature.

**Confidence:** HIGH -- verified via [LLM pricing analysis](https://www.cloudidr.com/blog/llm-pricing-comparison-2026), [cost optimization strategies](https://www.silicondata.com/blog/llm-cost-per-token), [TCO analysis](https://www.ptolemay.com/post/llm-total-cost-of-ownership)

---

### Pitfall 5: Google Calendar Webhook Unreliability

**What goes wrong:**
Google Calendar push notifications expire after at most 7 days and there is no automatic renewal mechanism. If the renewal cron job fails, the application silently stops receiving calendar updates. Worse, Google's own documentation states: "Notifications are not 100% reliable. Expect a small percentage of messages to get dropped under normal working conditions." Teams build the calendar sync assuming webhooks are reliable event sources and then discover dropped events, missed meeting updates, and stale session schedules in production.

**Why it happens:**
- Developers treat webhooks like guaranteed message delivery (they're not).
- The renewal mechanism is easy to forget or under-test.
- Google's verification process for webhook domains takes weeks, delaying integration testing.
- Notification messages contain no body -- only headers -- requiring a separate API call to fetch actual changes, which adds latency and error surface.

**How to avoid:**
- Design calendar sync as "webhooks accelerate, polling guarantees." Always have a periodic polling fallback (every 5-15 minutes) that uses `syncToken` for incremental sync. Webhooks reduce latency but are not the source of truth.
- Build a webhook renewal service that runs well before expiration (e.g., renew 1 day before the 7-day expiry). Monitor renewal failures and alert.
- Use `syncToken`-based incremental sync for the polling fallback -- this is efficient and catches anything webhooks missed.
- Factor Google's app verification timeline (2-4 weeks, possible rejection) into project planning. Apply early.
- Store the channel ID and expiration timestamp in the database. Build a dashboard or monitoring for active webhook channels.
- Handle the empty-body notification pattern: on receiving a webhook, queue a job to fetch the actual changes via the Calendar API, rather than processing inline.

**Warning signs:**
- Calendar events stop updating for some tenants but not others.
- No periodic sync running alongside webhooks.
- Webhook renewal logs show gaps or failures.
- Calendar sync tests only run against a mock, never the real API.

**Phase to address:**
The Calendar Integration phase. This is not a v1 feature (Google Calendar is listed for v2 in features.md, but PROJECT.md lists it as active), so the phase that introduces calendar sync must build both webhook and polling paths from the start.

**Confidence:** HIGH -- verified via [Google Calendar Push Notification docs](https://developers.google.com/workspace/calendar/api/guides/push), [production reliability guides](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/), and [Google Calendar webhook implementation guides](https://lorisleiva.com/google-calendar-integration/webhook-synchronizations)

---

### Pitfall 6: Private Note Encryption Key Management Failure

**What goes wrong:**
The project plans AES-256-GCM encryption with per-tenant keys derived via HKDF from a master key. If the master key is lost, rotated incorrectly, or stored insecurely, all private notes across all tenants become permanently unreadable. If key derivation is implemented incorrectly (wrong HKDF context, inconsistent parameters), notes encrypted with one derivation become undecryptable with another. There's no recovery path for encrypted data with lost keys.

**Why it happens:**
- Master key stored in `.env` file that gets rotated during deployment without re-encryption.
- HKDF derivation parameters (salt, info/context string) aren't versioned, so code changes break backward compatibility.
- No key rotation strategy: the same master key is used forever, or rotation is attempted without re-encrypting existing data.
- Testing uses a hardcoded key that differs from production, so encryption/decryption issues aren't caught.

**How to avoid:**
- Store the master key in a secrets manager (Vercel Environment Variables marked as secret, or a dedicated service like AWS Secrets Manager), never in `.env` files that might be committed.
- Version your encryption scheme: store a `key_version` alongside each encrypted note. When rotating keys, new notes use the new version; old notes are decrypted with the old version and re-encrypted on read (lazy rotation).
- Pin HKDF parameters (algorithm, salt, info string format) in a constants file and include them in the encrypted payload metadata so they're never ambiguous.
- Write integration tests that encrypt with version N, then decrypt with the current code to verify backward compatibility.
- Document the key recovery process. If the master key is lost, private notes are gone -- make sure this is understood and the key is backed up securely.
- Consider using an established library (like Google Tink or AWS Encryption SDK) rather than hand-rolling crypto, to reduce the surface area for subtle bugs.

**Warning signs:**
- Master key is in `.env.local` or committed to version control.
- No `key_version` field in the `private_note` table (the current schema lacks this).
- Encryption tests use a different key than production.
- No documented key backup or rotation procedure.

**Phase to address:**
Phase 1 (Database + Security Foundation). The encryption scheme, key versioning, and HKDF parameters must be locked down before any private notes are stored.

**Confidence:** HIGH -- verified via [NIST AES-GCM guidance](https://csrc.nist.gov/csrc/media/Events/2023/third-workshop-on-block-cipher-modes-of-operation/documents/accepted-papers/Practical%20Challenges%20with%20AES-GCM.pdf), [key rotation best practices](https://www.kiteworks.com/regulatory-compliance/encryption-key-rotation-strategies/), [multi-tenant encryption FAQs](https://www.awssome.io/blog/multi-tenant-saas-security-encryption-faqs)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single LLM provider hardcoded | Faster initial development | Vendor lock-in; can't optimize costs or switch when pricing changes | Never -- use a provider abstraction from day one (Vercel AI SDK) |
| Skipping vector store, stuffing raw text into prompts | Avoids adding another infrastructure component | Token costs explode; context windows overflow; performance degrades as data grows | MVP only, but must plan migration path to embeddings within 2-3 months |
| Storing AI-generated content without provenance | Simpler data model | Can't audit what the AI said vs. what the user wrote; liability risk; can't improve prompts | Never -- always tag AI-generated content with model, prompt version, and timestamp |
| Using `neondb_owner` for app connections | Works immediately without role setup | Silently bypasses all RLS policies, creating a false sense of security | Never |
| Auto-save without conflict resolution | Simpler implementation | Two people editing the same session simultaneously can overwrite each other's answers | MVP if sessions are single-editor; must add optimistic locking before v2 |
| Hardcoded prompt templates in application code | Quick iteration | Can't A/B test prompts, can't update without deployment, no prompt versioning | Early prototype only; move to database-stored prompts before launch |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Google Calendar API** | Treating webhooks as reliable event delivery | Build polling fallback with `syncToken`; webhooks are acceleration, not guarantee |
| **Google Calendar API** | Not handling token refresh | OAuth tokens expire; implement automatic refresh with retry logic; store refresh tokens securely per user |
| **Google Calendar API** | Requesting overly broad OAuth scopes | Request only `calendar.events` (not `calendar`); users reject broad permission requests; Google verification is stricter for broad scopes |
| **OpenAI / LLM APIs** | No timeout or retry logic | LLM API calls can take 5-30 seconds; implement timeouts, streaming for UX, and exponential backoff for retries |
| **OpenAI / LLM APIs** | Sending PII in prompts without consideration | Session notes contain employee names, performance data; review data handling policies of your LLM provider; consider on-premise or privacy-focused providers |
| **Neon PostgreSQL** | Using prepared statements with PgBouncer | Set `prepare: false` in client config; PgBouncer in transaction mode doesn't support prepared statements |
| **Neon PostgreSQL** | Not configuring connection pool size for serverless | Serverless functions each open connections; without proper pooling config, you hit connection limits quickly |
| **Auth.js v5** | Changing `AUTH_SECRET` in production | Invalidates ALL existing sessions, logging out every user; use secret rotation (two secrets during transition) |
| **Auth.js v5** | Not embedding `tenant_id` in JWT | Session doesn't carry tenant context; every request requires an extra DB lookup to find the user's tenant |
| **Inngest** | Not making event handlers idempotent | Inngest retries failed steps; if handlers aren't idempotent, you get duplicate emails, double analytics, etc. |
| **Resend (Email)** | No email delivery tracking | Emails silently fail; implement webhook callbacks from Resend to track delivery status and failures |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Real-time analytics queries on raw session_answer table** | Dashboard load times exceed 3 seconds; database CPU spikes during business hours | Use pre-computed `analytics_snapshot` table (already designed); ensure background job runs reliably | 50+ sessions per tenant (hundreds of answer rows to aggregate) |
| **Unbounded context window for AI features** | LLM calls take 10+ seconds; costs spike; token limit errors | Summarize historical sessions into compressed profiles; use RAG with embeddings instead of raw text injection | 10+ sessions per series (context exceeds 4K tokens per person) |
| **N+1 queries in session wizard context panel** | Context panel loads slowly; each historical session triggers a separate query | Batch-load last 3 sessions + action items in a single query; use Drizzle's `with` for eager loading | 20+ concurrent active sessions across the platform |
| **Synchronous AI calls blocking session wizard** | Wizard feels sluggish; "generating summary" takes 10-30 seconds blocking the UI | Use streaming responses for real-time features; use background jobs (Inngest) for post-session processing; never block the main request with an LLM call | Any scale -- even 1 user notices a 10-second wait |
| **Audit log table without partitioning** | Audit log queries slow down; INSERT performance degrades | Partition audit_log by month (time-based partitioning); add index on (tenant_id, created_at) | 100K+ audit entries (reached within months for active tenants) |
| **Analytics snapshot job processes all tenants sequentially** | Background job exceeds Inngest timeout; snapshots are stale for tenants processed last | Fan out: one Inngest event per tenant, each processed independently with concurrency control | 50+ tenants with active sessions |
| **Full-text search on session notes without proper indexing** | Search queries scan entire table; response times degrade linearly with data | Add `tsvector` column with GIN index for PostgreSQL full-text search; update via trigger | 1,000+ sessions total across all tenants |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| **LLM prompt injection via session notes** | User writes "Ignore previous instructions and..." in a session answer; AI generates unauthorized content or leaks system prompt | Sanitize user input before including in LLM prompts; use structured prompt templates with clear delineation of system vs. user content; validate AI output before displaying |
| **Indirect prompt injection via historical context** | A malicious user poisons their session history with crafted text that manipulates future AI suggestions for their manager | Treat all user-generated content as untrusted input to the LLM; use output filtering; limit AI agency (suggestions only, no automated actions) |
| **Private notes visible in AI-generated summaries** | AI summary accidentally includes content from encrypted private notes because decrypted content was included in the prompt context | Never include decrypted private notes in any AI prompt context; enforce this with a code-level separation between the AI context assembly function and the private note decryption path |
| **Tenant ID from request parameters instead of session** | Attacker modifies tenant_id in request body to access another tenant's data | Always derive tenant_id from the authenticated session/JWT, never from request parameters; the existing architecture doc correctly specifies this, but it must be enforced via code review and testing |
| **AI feature exposes data beyond user's RBAC level** | A member asks the AI "summarize all team scores" and the AI complies because it has database access beyond the user's role | AI context assembly must respect the same RBAC rules as the UI; filter data based on the requesting user's role before passing to the LLM |
| **OAuth token storage without encryption** | Google Calendar OAuth refresh tokens stored in plaintext in the database; a data breach exposes access to users' calendars | Encrypt OAuth tokens at rest (use the same AES-256-GCM scheme as private notes, or a dedicated secrets column); tokens are as sensitive as passwords |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **AI suggestions that feel generic** | Users dismiss AI features after a few uses because suggestions are obvious ("How is your workload?" when they always ask that) | Train on the specific series' history; surface insights, not questions already in the template; focus on pattern-based nudges ("Alex's engagement dropped 20% -- you may want to explore this") |
| **Blocking the wizard with AI processing** | Manager sits in an active 1:1 meeting waiting for a loading spinner while the AI generates suggestions | Stream AI responses; show skeleton states; generate pre-session suggestions asynchronously before the meeting starts, not during it |
| **Over-automating meeting preparation** | Managers stop preparing because "AI will handle it"; meeting quality actually drops because the human judgment layer is gone | Position AI as preparation assistance, not replacement; AI prepares drafts, humans review and customize; never auto-populate the agenda without manager confirmation |
| **Showing AI confidence too prominently** | Confidence scores confuse non-technical users; they either ignore low-confidence suggestions entirely or trust high-confidence ones blindly | Don't show confidence scores to end users; curate the output -- only show suggestions above your quality threshold; use language like "You might want to discuss..." not "87% confidence: discuss..." |
| **Session wizard with too many steps** | Manager rushes through questions because there are 15 steps; quality of answers drops | Group questions by category (as already designed); allow managers to customize which categories to include per session; aim for 4-6 steps maximum |
| **Analytics dashboards that overwhelm** | Managers see 12 charts and metrics and don't know what matters | Start with 3 key metrics (session score trend, action item velocity, meeting adherence); allow progressive disclosure of detail; highlight anomalies, don't dump data |
| **Private notes UX confusion** | Manager accidentally writes sensitive feedback in shared notes | Make the private/shared distinction extremely visible: different background colors, icon indicators, and a confirmation when switching modes; consider defaulting to private for new notes |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Multi-tenancy:** Verify RLS policies are active with a non-superuser role -- test by attempting to SELECT another tenant's data from a psql session using the app's database role
- [ ] **AI summaries:** Check that summaries never include private note content, content from other tenants, or hallucinated facts about people not in the session
- [ ] **Session auto-save:** Verify behavior when two browser tabs are open for the same session (conflict resolution or last-write-wins with notification)
- [ ] **Calendar sync:** Verify webhook renewal actually works by checking after 7 days in production, not just in a test environment with mocked expiration
- [ ] **Email notifications:** Verify all email templates render correctly with actual data, not just test fixtures; check timezone handling in "Your meeting is tomorrow at 10:00 AM" emails
- [ ] **Private note encryption:** Verify decryption works after a deployment (same key, same HKDF parameters); test with notes encrypted by a previous code version
- [ ] **AI rate limiting:** Verify per-tenant AI call limits are enforced; test with a tenant that exceeds their quota
- [ ] **Analytics snapshots:** Verify the background job handles tenants with no sessions in the period (should produce no snapshot, not an error)
- [ ] **Action item carry-over:** Verify carried-over items show their origin session and don't duplicate on repeated carries
- [ ] **RBAC on AI features:** Verify a `member` role user cannot trigger AI features that would access data beyond their own sessions
- [ ] **Audit logging:** Verify AI-related actions are logged (who triggered what AI feature, what data was sent to the LLM)
- [ ] **OAuth token refresh:** Verify Google Calendar token refresh works when the original token expires (test with an actually expired token, not a mocked one)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AI context leaks tenant data | HIGH | Immediately disable AI features; audit all AI-generated content for cross-tenant data; notify affected tenants per GDPR; fix isolation layer; re-enable with enhanced logging |
| RLS bypass exposes cross-tenant data | HIGH | Immediately take application offline; audit access logs for cross-tenant queries; assess data exposure scope; notify affected tenants; fix role/policy configuration; add integration tests |
| Master encryption key lost | CRITICAL (unrecoverable) | Private notes encrypted with the lost key are permanently unreadable; inform affected users; implement key backup procedures; cannot recover data |
| LLM costs exceed budget | MEDIUM | Implement emergency rate limiting; switch to cheaper models for non-critical features; add cost tracking; negotiate volume pricing with provider |
| Google Calendar webhooks silently stopped | LOW | Run a manual full sync for affected tenants; fix the renewal mechanism; verify polling fallback is running |
| AI generates harmful/biased content about an employee | HIGH | Immediately disable the specific AI feature; review the generated content; assess impact on the employee; add output filtering; review prompt templates for bias |
| Auth secret rotated, all sessions invalidated | MEDIUM | Users must re-login; no data loss; implement dual-secret support for future rotations |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI as afterthought | Phase 1 (Architecture) | AI pipeline scaffolding exists in initial schema; session wizard design includes AI panel |
| Multi-tenant AI context leakage | First AI feature phase | Integration test: AI endpoint called with Tenant A's auth returns no Tenant B data |
| RLS bypass in serverless pooling | Phase 1 (Database Setup) | Integration test: app-role connection cannot SELECT cross-tenant data; `prepare: false` configured |
| LLM cost explosion | First AI feature phase | Cost-per-call logging exists; per-tenant rate limits configured; monthly cost projection documented |
| Google Calendar webhook unreliability | Calendar Integration phase | Both webhook and polling paths exist; webhook renewal tested with real expiration; polling catches missed events |
| Private note encryption key management | Phase 1 (Security Foundation) | `key_version` field exists on private_note; HKDF parameters documented and pinned; key backup procedure documented |
| Prompt injection via session notes | First AI feature phase | Input sanitization in AI context assembly; output validation before display; test with known injection strings |
| LLM blocking the session wizard | Session Wizard AI phase | AI calls are streamed or async; wizard never waits synchronously for LLM response |
| Analytics job scalability | Analytics phase | Job fans out per-tenant; tested with simulated load of 100 tenants |
| Design phase paralysis | Phase 0 (Design) | Timebox to 2-3 weeks; design key screens only (wizard, dashboard, template builder); derive system from screens |
| Auth.js secret management | Phase 1 (Auth Setup) | Dual-secret rotation support; `tenant_id` embedded in JWT; session tests verify tenant scoping |

---

## Design-First Project Risk

This project has a specific constraint: "Design first, build second" with "Apple-level polish." This creates a unique pitfall category.

### Pitfall: Design Phase Paralysis

**What goes wrong:**
The design phase expands indefinitely because "Apple-level polish" is a subjective, moving target. Every screen gets multiple iterations. The team spends 2-3 months on Figma mockups before writing a single line of code. By the time development starts, the designs are based on assumptions that don't survive contact with real data, real API latency, and real component behavior. Designs get reworked during implementation anyway.

**Why it happens:**
"Apple-level polish" sounds like a quality bar but functions as a scope statement. Without explicit boundaries, it means every pixel gets debated. The design phase also lacks the feedback loop that implementation provides -- you can't test auto-save feel, AI response streaming, or real chart rendering in Figma.

**How to avoid:**
- Timebox the design phase strictly: 2-3 weeks maximum for the initial design sprint.
- Design only the critical screens: session wizard, dashboard, template builder. Derive the design system (colors, typography, spacing, component library) from these 3-4 screens, not from an abstract style guide.
- Accept that designs are hypotheses, not specifications. Plan for design iteration during development, not before it.
- Use shadcn/ui defaults as the starting point and customize, rather than designing from scratch and then mapping to shadcn components.
- Define "Apple-level polish" concretely: smooth animations (60fps), responsive transitions, consistent spacing, zero layout shifts, accessible color contrast. These are measurable, not subjective.
- Build a living design system in Storybook that evolves with the codebase, rather than maintaining a separate Figma source of truth that drifts.

**Warning signs:**
- Design phase exceeds 3 weeks without producing implementable artifacts.
- Designers and developers are working sequentially (design, then build) rather than in parallel (design screen X while building screen Y).
- The Figma file has more than 50 frames for MVP screens.
- No one has tested the designs with real data or real component constraints.

**Phase to address:**
Phase 0 (Design). Must be timeboxed with explicit deliverables and a hard cutoff. Design continues during development, not as a gate before it.

---

## Vercel Serverless Constraints

### Pitfall: Serverless Timeout on AI and Analytics Operations

**What goes wrong:**
Vercel's free tier limits serverless functions to 10 seconds; Pro tier allows up to 5 minutes (or 800 seconds with Fluid Compute). LLM API calls for complex operations (generating summaries with full context, building AI profiles) can take 10-30 seconds. Analytics computation for large tenants can exceed timeout limits. Cold starts add 800ms-2.5s for database connections.

**Why it happens:**
Developers test locally where there are no timeouts, and prototypes with small datasets complete quickly. In production, real context sizes, real LLM latency, and cold starts combine to exceed limits.

**How to avoid:**
- Route ALL long-running AI operations through Inngest, not through API routes. API routes should only trigger events; Inngest functions handle the actual LLM calls.
- Use streaming for real-time AI features (live suggestions) to avoid timeout waiting for complete responses.
- Enable Vercel Fluid Compute for extended duration if on Pro plan.
- Pre-warm database connections using Neon's serverless driver (which supports HTTP-based queries that avoid TCP cold start overhead).
- Design API routes to be fast (<5 seconds): fetch data, return response, trigger background processing via events.

**Warning signs:**
- API routes directly call LLM APIs and wait for responses.
- Analytics export endpoints compute results inline instead of generating async and notifying when ready.
- "Function timed out" errors in Vercel logs.

**Phase to address:**
Phase 1 (Architecture). Establish the pattern: API routes are thin handlers; Inngest handles all heavy processing.

---

## Sources

### Official Documentation
- [Drizzle ORM RLS Documentation](https://orm.drizzle.team/docs/rls)
- [Neon RLS with Drizzle Guide](https://neon.com/docs/guides/rls-drizzle)
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Google Calendar Error Handling](https://developers.google.com/workspace/calendar/api/guides/errors)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)

### Security & AI References
- [OWASP LLM Top 10: Prompt Injection (LLM01:2025)](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Burn-After-Use: Multi-Tenant LLM Security (arXiv)](https://arxiv.org/abs/2601.06627)
- [Multi-Tenant AI Leakage (LayerX)](https://layerxsecurity.com/generative-ai/multi-tenant-ai-leakage/)
- [LLM Integration Risks for SaaS (Security Boulevard)](https://securityboulevard.com/2026/02/large-language-model-llm-integration-risks-for-saas-and-enterprise/)
- [Multi-Tenant RLS Failure Analysis](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)

### Architecture & Cost
- [AI-Native vs AI-Bolted On Architectures](https://medium.com/@the_AI_doctor/ai-native-vs-ai-bolted-on-architectures-a-technical-white-paper-for-enterprise-decision-makers-bf081efdc648)
- [AI-Native SaaS Architecture (CloudZero)](https://www.cloudzero.com/blog/ai-native-saas-architecture/)
- [LLM Pricing Comparison 2026](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)
- [LLM Cost Per Token Guide](https://www.silicondata.com/blog/llm-cost-per-token)
- [NIST AES-GCM Practical Challenges](https://csrc.nist.gov/csrc/media/Events/2023/third-workshop-on-block-cipher-modes-of-operation/documents/accepted-papers/Practical%20Challenges%20with%20AES-GCM.pdf)
- [Encryption Key Rotation Best Practices](https://www.kiteworks.com/regulatory-compliance/encryption-key-rotation-strategies/)
- [Inngest: Solving Next.js Timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)

### Auth & Session Management
- [NextAuth Session Persistence Issues (Clerk)](https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues)
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)

### Calendar Integration
- [Calendar Webhook Integration Guide 2025](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/)
- [Google Calendar Integration: Webhook Synchronizations](https://lorisleiva.com/google-calendar-integration/webhook-synchronizations)
- [Google Calendar Integration: Periodic Synchronizations](https://lorisleiva.com/google-calendar-integration/periodic-synchronizations)

### Analytics
- [PostgreSQL for Analytics Workloads](https://www.epsio.io/blog/postgres-for-analytics-workloads-capabilities-and-performance-tips)
- [Real-Time Analytics in Postgres (Timescale)](https://medium.com/timescale/real-time-analytics-in-postgres-why-its-hard-and-how-to-solve-it-bd28fa7314c7)

---
*Pitfalls research for: AI-powered 1:1 meeting management SaaS*
*Researched: 2026-03-03*
