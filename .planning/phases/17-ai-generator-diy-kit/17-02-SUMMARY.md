---
phase: 17-ai-generator-diy-kit
plan: 02
subsystem: ai
tags: [ai, zod, anthropic, prompts, service, template-editor]

# Dependency graph
requires:
  - phase: 17-01
    provides: Wave 0 RED test stubs for template-chat schema, template-editor prompt, and service withLanguageInstruction

provides:
  - templateChatResponseSchema Zod schema for AI chat turn structured output
  - ChatTurnResponse TypeScript type
  - buildTemplateEditorSystemPrompt() expert system prompt builder with 4 sections
  - TEMPLATE_EDITOR_SYSTEM constant (base prompt without existing template)
  - models.templateEditor pointing to claude-sonnet-4-6
  - withLanguageInstruction exported from service.ts (previously private)
  - generateTemplateChatTurn(messages, currentTemplate, language) service function

affects: [17-03, 17-04, 17-05, 17-06, 17-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ModelMessage (not CoreMessage) is the correct AI SDK v4 type for chat history"
    - "z.record(z.string(), z.unknown()) for answerConfig — zod v4 requires two-arg record"
    - "generateTemplateChatTurn uses Output.object({ schema }) pattern consistent with other AI service functions"

key-files:
  created:
    - src/lib/ai/schemas/template-chat.ts
    - src/lib/ai/prompts/template-editor.ts
  modified:
    - src/lib/ai/models.ts
    - src/lib/ai/service.ts

key-decisions:
  - "ModelMessage (not CoreMessage) is the AI SDK v4 type for messages — CoreMessage is not exported from 'ai'"
  - "z.record requires 2 args in zod v4: z.record(z.string(), z.unknown()) not z.record(z.unknown())"
  - "JSON schema section header uses lowercase 'schema' to match test assertion: '## JSON schema Spec'"
  - "TEMPLATE_EDITOR_SYSTEM exported as a constant computed at module load time for convenience; built by calling buildTemplateEditorSystemPrompt() with no args"

patterns-established:
  - "Template editor prompt: 4 required sections (Role & Persona, JSON schema Spec, 1:1 Methodology Principles, Score Weight System)"
  - "generateTemplateChatTurn: builds prompt → applies language instruction → calls generateText with Output.object → wraps errors with 'AI generation failed:' prefix"

requirements-completed: [AIGEN-03, AIGEN-04]

# Metrics
duration: 8min
completed: 2026-03-07
---

# Phase 17 Plan 02: AI Contracts Layer Summary

**Zod schema, expert system prompt builder, and `generateTemplateChatTurn` service function that turn all Wave 0 test stubs GREEN — the full AI contracts layer for the template editor**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-07T16:03:44Z
- **Completed:** 2026-03-07T16:07:50Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 updated)

## Accomplishments
- `templateChatResponseSchema` validates AI chat turn responses with required `chatMessage` and nullable `templateJson`; 5 tests GREEN
- `buildTemplateEditorSystemPrompt()` builds a 4-section expert prompt covering JSON schema conformance, 1:1 methodology, and score weight guidance; 5 tests GREEN
- `withLanguageInstruction` exported from service.ts enabling 4 service tests to turn GREEN
- `generateTemplateChatTurn(messages, currentTemplate, language)` wires all contracts together for the Wave 2 API route

## Task Commits

Each task was committed atomically:

1. **Task 1: Create templateChatResponseSchema and ChatTurnResponse type** - `6c31ca5` (feat)
2. **Task 2: Create template-editor system prompt + export withLanguageInstruction + add model entry** - `a6bc631` (feat)

## Files Created/Modified
- `src/lib/ai/schemas/template-chat.ts` — `templateChatResponseSchema` Zod schema + `ChatTurnResponse` type
- `src/lib/ai/prompts/template-editor.ts` — `buildTemplateEditorSystemPrompt(existingTemplate?)` with TEMPLATE_EDITOR_SYSTEM constant
- `src/lib/ai/models.ts` — added `templateEditor: anthropic("claude-sonnet-4-6")`
- `src/lib/ai/service.ts` — exported `withLanguageInstruction`, added `generateTemplateChatTurn`

## Decisions Made
- `ModelMessage` (not `CoreMessage`) — AI SDK v4 doesn't export `CoreMessage`; the correct type is `ModelMessage` from `"ai"`. Auto-fixed during typecheck.
- `z.record(z.string(), z.unknown())` — zod v4 requires two arguments for `z.record`. One-arg form caused a type error. Auto-fixed.
- Section header casing — test asserts `.toContain('JSON schema')` (lowercase s); used `## JSON schema Spec` to match.
- `TEMPLATE_EDITOR_SYSTEM` exported constant computed at module load (calls `buildTemplateEditorSystemPrompt()` with no args) for quick access without invoking the builder function.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.record one-argument form for zod v4**
- **Found during:** Task 1 (templateChatResponseSchema)
- **Issue:** `z.record(z.unknown())` — zod v4 requires 2 arguments: key schema and value schema
- **Fix:** Changed to `z.record(z.string(), z.unknown())` consistent with existing codebase pattern
- **Files modified:** src/lib/ai/schemas/template-chat.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** a6bc631

**2. [Rule 1 - Bug] Fixed CoreMessage import — AI SDK v4 uses ModelMessage**
- **Found during:** Task 2 (service.ts update)
- **Issue:** `import type { CoreMessage } from "ai"` — CoreMessage is not exported by AI SDK v4; the correct type is `ModelMessage`
- **Fix:** Replaced `CoreMessage` with `ModelMessage` throughout service.ts
- **Files modified:** src/lib/ai/service.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** a6bc631

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the two auto-fixed type errors above.

## Next Phase Readiness
- All Wave 0 test contracts are GREEN (29 tests across 4 files)
- `generateTemplateChatTurn` is exported and ready for Wave 2 API route (17-03)
- `buildTemplateEditorSystemPrompt` and `templateChatResponseSchema` are ready for consumption
- TypeScript clean — no new type errors introduced

---
*Phase: 17-ai-generator-diy-kit*
*Completed: 2026-03-07*
