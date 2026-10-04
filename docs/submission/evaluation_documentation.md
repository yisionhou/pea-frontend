# PEA Evaluation Documentation

## Design and configurations

ABCD compares four systems on the same 60 PEA-60 cases, with 15 references in each of Supported (S), Partially Supported (P), Unsupported (U) and Insufficient Information (I). The tables below come from docs/report-evidence-20261004-2139/ABCD_Consolidated_Results.csv, cross-checked against pea-backend/results/plain-deepseek-20261004/abcd_summary.csv. This is not a new experiment or independent per-case recomputation.

| System | Provider, model and prompt | Primary saved source under pea-backend/results |
|---|---|---|
| A | rule-v1; no external model | final-pea60-20261004/rule/summary.json |
| B | Ark deepseek-v4-flash-ga-260731; audit-plain-v1 | plain-deepseek-20261004/evaluated_results.json |
| C | Ark deepseek-v4-flash-ga-260731; v1.0 / audit-v2 | final-pea60-20261004/deepseek/summary.json |
| D | OpenRouter anthropic/claude-sonnet-5; v1.0 / audit-v2 | claude-full-strict-20261004/evaluated_results.json |

| System | Correct / 60 | Accuracy | Macro-F1 | Technical failures | USD |
|---|---:|---:|---:|---:|---:|
| A Rule Baseline | 15 | 25.00% | 0.1014 | 0 | 0.00000000 |
| B Plain DeepSeek | 48 | 80.00% | 0.8028 | 0 | 0.02532804 |
| C Rubric-guided DeepSeek | 50 | 83.33% | 0.8323 | 0 | 0.14842944 |
| D Rubric-guided Claude | 51 | 85.00% | 0.8613 | 2 | 1.64767200 |


## Metrics, per-class counts and technical failures

Accuracy uses all 60 attempted cases. Precision is TP/(TP+FP), recall is TP/(TP+FN), and F1 is their harmonic mean, with the implementation's zero-denominator convention. Macro-F1 is the unweighted mean across all four business classes. A technical failure contributes a false negative and remains in the denominator; it is not a fifth business label.

| System | S correct | P correct | U correct | I correct |
|---|---:|---:|---:|---:|
| A | 0 | 0 | 0 | 15 |
| B | 15 | 12 | 10 | 11 |
| C | 10 | 14 | 12 | 14 |
| D | 10 | 12 | 14 | 15 |


Each column has 15 reference cases. Complete precision/recall/F1 values are preserved in the consolidated CSV and original abcd_summary.csv. Original confusion matrices remain in the per-system result directories: rows are references, columns are predictions, with a separate failure column where applicable. The complete experiment has 240 method-case results; the stale 183-row composite must not be used as the complete ABCD table.

D has two validation failures, PEA-H013 and PEA-H016, plus seven other classification errors. Invalid complete outputs remain failed even if a raw label matches Gold. Do not restore credit or double-count these cases. A, B and C have no recorded technical failures. Technical validity alone does not establish a correct assessment.

All systems observed 0/45 non-Supported-to-Supported errors. Weak-to-Supported uses the recorded combined P+U denominator of 30; U-to-S and I-to-S each use 15. These denominators overlap and should not be added. Zero observed false support does not establish zero risk. Calibrated abstention is not implemented; I, provider failure and Agent stopping are distinct.

## Tokens, cost and latency

| System | Input tokens | Output tokens | Mean / median s | USD per case / correct |
|---|---:|---:|---:|---:|
| A | 0 | 0 | 0.0060 / 0.0059 | 0.00000000 / 0.00000000 |
| B | 35720 | 6906 | 2.4694 / 2.4420 | 0.00042213 / 0.00052767 |
| C | 235400 | 31716 | 7.0139 / 6.8204 | 0.00247382 / 0.00296859 |
| D | 501136 | 64540 | 10.2522 / 10.2233 | 0.02746120 / 0.03230729 |


Ark's recorded tariffs are USD 0.45/M input and 1.34/M output tokens. Claude's configuration records 2/M and 10/M; provider-reported costs and uncertainty remain in its artifacts. These are scoped experiment costs, not the total project invoice. Cost per case divides by 60; cost per correct case divides by the correct count. B measures HTTP, parsing and diagnostic persistence; A/C/D use audit end-to-end timing, so latency boundaries differ.

## Sequence and threats to comparison

The saved sequence includes selected-case smoke tests, A/C execution, the original failed Claude json_object smoke, strict-schema Claude smoke and full D, then B added later. H001/H016/H046 had smoke exposure. B was added after other results were known. B uses a compact output schema, while C/D use the full Assessment contract. D uses strict JSON Schema and provider parameter enforcement; C used a different provider-format path. Generation settings and exact request shapes belong to each frozen run_manifest.json/request artifact, not today's defaults. Formal runs retained failures and did not tune and rerun incorrect cases to improve scores.

B48 versus C50 is not a pure rubric-text causal effect; D51 versus C50 is not general model superiority. Non-Supported subgroup analysis is exploratory. Viewing records, recomputing metrics offline and making paid calls are separate activities. The existing CLI python -m app evaluate PROFILE --principal PRINCIPAL can make paid calls; it is not a report-viewing command. No new recomputation helper or paid operation was executed here.

## Agent functional validation is separate

agent-001-002-validation-20261004-204123 records agent-001 retrieving supporting evidence and creating a child audit, with one planner correction. That run's agent-002 returned no matching evidence. agent-validation-20261004-2020 records agent-003 stopped by the server after two empty searches. Its original model-stop-specific failed acceptance is preserved; the separate acceptance review explains the valid server-bounded no-result branch without rescoring it.

agent-002-validation-20261004-211725 used missing-fact-query-2 and retrieved contradictory evidence. A duplicate result and then a zero result added no new evidence and triggered server NO_NEW_EVIDENCE. Previously retrieved evidence still entered the child audit, which changed I to U. This was not a model-selected stop or two zero-result searches. Different revisions and runs cannot be presented as a unified 100% Agent accuracy score.

Earlier development reports remain under results/experiment_*/report.json, including dev140 and interrupted experiment_543eb3ebb48e420a8f9207a40fea3549 with 13 of 80 tasks. The later English recording is a separate demonstration, not a replacement for historical Agent acceptance or formal results.
