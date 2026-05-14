## freddie acptoapi provider migration completed

Implemented acptoapi-first fallback pattern across freddie host subsystems:

1. Added `checkAcptoapi()` helper to verify endpoint health
2. Added `acptoapiFallback()` helper for OpenAI-compatible endpoint queries
3. **chat tool** (line ~375-398): Primary tries acptoapi (localhost:4800), falls back to freddie (localhost:3030), finally SDK
4. **dispatchMemorizeAsync** (line ~666-695): Uses acptoapi for LLM summarization with fallback pattern
5. **dispatchLlmRerank** (line ~722-755): Uses acptoapi for relevance reranking with fallback

FREDDIE_DEFAULT_CONFIG.providers.openai.baseUrl already defaults to http://localhost:4800.

All subsystems respect config customization via cfg.providers.openai.baseUrl environment override.

Test validation confirmed: 7/7 checks pass on implementation.
