# Phase 7: AI Pipeline

**Status**: Not Started
**Depends on**: Phase 5

## Goal

AI generates session summaries and pre-meeting nudges, proving the "AI-first" positioning with reliable background pipelines.

## Success Criteria

1. After session completion, AI generates a narrative summary from answers and notes, stored and viewable in history
2. Before a session, AI generates 2-3 specific follow-up suggestions based on previous session data
3. Pre-session nudges appear on the dashboard and in the pre-session state
4. After completion, AI suggests 1-3 action items based on session content
5. All AI pipelines run as durable Inngest background functions with retry, using Vercel AI SDK with provider-agnostic routing, and session embeddings are stored via pgvector

## Planned Scope

- **Plan 07-01**: AI service layer, tenant guard, and Vercel AI SDK configuration
- **Plan 07-02**: Post-session pipeline (summary generation, action item suggestions, embedding storage)
- **Plan 07-03**: Pre-session nudge pipeline and dashboard/session integration

## Requirements

AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08

> **Note**: This phase can execute in parallel with Phases 6 and 9 (all depend only on Phase 5). AI is a core v1 feature, not a v3 add-on.
