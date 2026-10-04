# PEA Product Documentation

## Persona

The intended user is an HR reviewer preparing performance calibration. The reviewer examines whether a manager's claim is supported by the supplied material, checks citations and records an opinion. This is a design persona, not measured user-research evidence. Humans retain employment decisions; PEA does not decide pay, promotion, rankings, discipline or dismissal.

## Input

Inputs comprise a performance criterion, claim, evidence text, review period and optional reference standard. Case/employee IDs support ownership and authorized retrieval. Quantitative and qualitative evidence are accepted; a number is not automatically adequate evidence. Contracts are in pea-backend/app/schemas.py and dataset_inputs.py; models.py excludes Gold and review answers from model-visible input.

An English synthetic example claims that an employee exceeded a quarterly individual sales target. Initial evidence reports CNY 1,200,000 in actual sales but omits the target. The missing fact is the applicable target, not proof of a positive conclusion. Different supporting and contradictory target scenarios remain separate cases.

## Output

Four business labels are Supported, Partially Supported, Unsupported and Insufficient Information. Assessment includes relevance, specificity, claim-evidence fit, coverage, reasons, citations, missing information, contradictions and suggested review reasons. Technical failure is separate from the label. Supported concerns the supplied evidence, not independently verified employee performance or evidence authenticity.

Human review can accept, modify or request more evidence and is stored separately. Backend-computed eligibility governs the user-triggered Follow-up Agent. After confirmation, the model chooses among search_feedback, search_goal_updates and search_one_to_one_notes. Authorized local evidence is merged, and actual new evidence can produce a child audit while preserving the initial audit. Retrieval may support, weaken, contradict or fail to resolve a claim. Technical child failure must not be converted into a business label.

## Architecture

```text
Vue / TypeScript / Vite frontend
  -> authenticated FastAPI API
  -> AuditService -> rule-v1 OR ModelGateway
  -> Pydantic Assessment validation -> local FileStore
Optional user-triggered AgentService
  -> bounded planner -> approved local JSONL search
  -> scoped evidence merge -> child re-audit
EvaluationService -> persisted predictions -> separate Gold -> metrics
Human ReviewService -> separately preserved reviewer opinions
```

The implementation uses Pydantic, HTTPX and local JSON files. app/agent.py, evidence.py and hr_search.py enforce authorization, employee/case scope, date restrictions, duplicate blocking and bounded stopping. Frontend FollowupPage.vue displays evidence, trace and parent/child results. There is no demonstrated live HRIS, vector RAG, LangGraph, Spring or Elasticsearch integration.

## Metrics Targeted

Recovered design material identifies classification quality, false support, technical validity, cost, latency and traceability as concerns. No numerical acceptance threshold was recovered that can honestly be called the original 80% or 85% target. Functional goals are explicit missing facts, authorized retrieval, evidence preservation, bounded termination and versioned re-audit. Future numerical/business goals require new agreement, not retrospective insertion.

## Metrics Reached

The recorded PEA-60 results below come from docs/report-evidence-20261004-2139/ABCD_Consolidated_Results.csv and the original sources listed in evaluation_documentation.md. No new experiment was run.

| System | Correct / 60 | Accuracy | Macro-F1 | Technical failures | USD |
|---|---:|---:|---:|---:|---:|
| A Rule Baseline | 15 | 25.00% | 0.1014 | 0 | 0.00000000 |
| B Plain DeepSeek | 48 | 80.00% | 0.8028 | 0 | 0.02532804 |
| C Rubric-guided DeepSeek | 50 | 83.33% | 0.8323 | 0 | 0.14842944 |
| D Rubric-guided Claude | 51 | 85.00% | 0.8613 | 2 | 1.64767200 |


All systems observed 0/45 non-Supported-to-Supported errors, a bounded small-sample result rather than zero risk. B/C differ in schema and execution timing as well as rubric instructions. D's two invalid outputs remain failures. These results do not establish universal superiority or a pure causal rubric effect.

Agent evidence is functional and spans different runs/revisions: agent-001 supporting retrieval with one correction; agent-003 server-bounded no-result termination; later agent-002 contradictory retrieval and an Unsupported child. No unified 100% Agent accuracy score is reported. The subsequent English demonstration is an edited recording of real page operations and saved results, not an uncut repetition of the formal experiment.

## Implementation and evidence limits

Implemented pages cover login, workspace, audit input, assessment, citations, human review, follow-up comparison and evaluation reports. Source code demonstrates implementation; saved live records demonstrate specific observed behavior; mocks establish only their test conditions. This accelerated documentation release does not claim fresh installation, test or startup success.

Calibrated abstention, representative production evaluation, independent source-authenticity checks and measured HR productivity are not established. There is no measured time saving, ROI, adoption, fairness improvement or compliance certification. Small synthetic data, AI-draft labels, limited review evidence and selected holdout smoke exposure constrain conclusions.

## Submission materials

The actual final main report was found as reference_materials/PE6201_HouYuxuan_Final_Report.docx and is preserved without rewriting. The requested original PDF was not found in the checked location. The actual English demo video is available in the source recording deliverables and is copied to submission/PEA_Demo_EN.mp4. An original standalone Problem Statement, public repository URL, hosted video URL and submission confirmation were not established. Existing briefs are background, not invented replacements.

The root README and SUBMISSION_CHECK distinguish available artifacts from unfinished verification. Creating a ZIP is not uploading or completing coursework submission. The owner must confirm course requirements, identity details, redistribution rights and final submission destinations.
