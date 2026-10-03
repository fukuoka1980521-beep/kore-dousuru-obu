# AI Runtime Profile — どうする大府

Adopts: development-os/docs/AI_RUNTIME_COST_PERFORMANCE_STANDARD.md v1.0
Profile: DETERMINISTIC_HEAVY

## Deterministic responsibilities
- Official municipal source records, classification tables, fees, procedures, facility data, freshness/version metadata.
- Retrieval ranking constraints and source provenance.
- Change detection and stale-data flags.

## Generative responsibilities
- Natural-language question interpretation.
- Plain-language explanation of verified municipal facts.
- Query reformulation and user-facing navigation.

## Model routing
- NO_LLM for canonical municipal facts and classification decisions already resolved by structured data.
- gpt-6-luna for ordinary natural-language interpretation/explanation.
- gpt-6-sol only for materially ambiguous user intent or conflicting official-source interpretation.
- gpt-6-astra offline only.

## Verification
AI must cite/ground to the structured official record. It cannot invent disposal classifications, fees, or procedures.

## Cost target
Most interactions should be deterministic retrieval + one Luna response.
