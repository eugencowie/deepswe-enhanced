# 11: Capture demoted consumer endpoints

Type: task
Status: resolved
Blocked by: none

## Problem

The 2026-11-09 refresh (PR #113) omitted all nine OpenAI models, and the 2026-11-10 re-run omitted Gemini 4 Argon, each warning "no consumer endpoint matched". The endpoints were listed; selection dropped them with its `status === 0` filter. OpenAI's `openai` endpoint reported `-5`/`-2` at about 37% 30-minute uptime, and Gemini 4 Argon's `google-ai-studio` endpoint reported `-2` at 100% uptime. ZDR on the API key's account was suspected first and ruled out: an unauthenticated listing showed the same statuses.

The filter came from the research's "keep active endpoints" step, written for the all-provider median, where dropping an unhealthy provider leaves others. ADR 0002 selects exactly one endpoint, so the filter has no fallback and blanks the model.

OpenRouter's API reference documents `status` as the enum `0, -1, -2, -3, -5, -10` with no meanings. A 2026-11-10 survey of the 467 endpoints behind the mapped models: `0` (452, 89–100% uptime), `-2` (10, 67–100%), `-5` (5, 0–100%). Reading: `0` is healthy and more negative values are routing demotions; an inference, not documentation.

## Answer

Selection no longer filters on status. A matched consumer endpoint with a non-zero status is captured, and the refresh warns `reports status N (demoted by OpenRouter); captured anyway` so the reviewer can see it. Its 30-minute p50 is measured on completed requests, so it still describes the consumer endpoint. The spec's selection bullet and ADR 0002's consequences record the change.
