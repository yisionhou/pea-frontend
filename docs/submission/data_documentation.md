# PEA Data Documentation

## Purpose and sources

PEA assesses whether supplied evidence supports a performance claim. Its data are synthetic development and evaluation material, not employee records or fine-tuning data. Source identifiers below are relative to the submission root. The release manifest identifies copied files and their hashes.

| Material | Recorded size | Source and purpose |
|---|---:|---|
| Current development set | 40 cases, 10 per class | pea-backend/data/dev; AI-draft development labels |
| PEA-60 | 60 cases, 15 per class | pea-backend/data/holdout; formal ABCD comparison |
| Agent scenarios | 12 | pea-backend/data/agent_eval; functional retrieval scenarios |
| Mock goal updates | 12 rows | pea-backend/data/evidence/goal_updates.jsonl |
| Mock feedback | 4 rows | pea-backend/data/evidence/feedback.jsonl |
| Mock one-to-one notes | 4 rows | pea-backend/data/evidence/one_to_one.jsonl |
| Reviewed PEA-20 | 20 cases | reference_materials/PEA20_Human_Reviewed_Anchor_Set_English_Submission.xlsx |

The reviewed PEA-20 workbook has Reviewed_Cases, Model_Input and Audit_Trail sheets. It is distinct from the 20 template seed IDs in pea-backend/data/dev/seed_case_ids.json. The newly located workbook updates the older evidence summary, which had not found it. Do not treat template seeds as recovered human-reviewed anchors.

Current dev40 differs from historical dev140. The saved report pea-backend/results/experiment_71d92befcef44aea975f85e13820c302/report.json contains the historical 280 method-case results. It must not be merged with current inputs or PEA-60. The previous draft holdout is separately retained under data/backups/holdout-before-pea60.

## Human review and generation

The PEA-60 dataset_manifest.json records 33 explicit labels and 27 blank cells interpreted as agreement with AI drafts under the user's instruction, with zero final label changes. Describe this as human-reviewed AI-drafted labels, not independent human-authored Gold. There is no recovered inter-rater reliability measurement.

Both candidate and reviewed workbooks were located in Downloads and copied under reference_materials. Their states differ: the English candidate's Human_Review sheet can contain blank labels and Not Reviewed status. It is not interchangeable with the reviewed Chinese workbook. The manifest's 33/27 process is disclosed as recorded provenance; a complete cell-by-cell reconstruction was not performed for this accelerated delivery.

The holdout manifest attributes generation to GPT-5.6 Sol (OpenAI). Original generation prompts and invocation records were not recovered, so this is a supplied attribution rather than independent verification of the precise generator. The general data/manifest.json describes deterministic development templates; it must not replace holdout-specific provenance. These datasets support inference evaluation, not model training.

## Schema, transformations and separation

Files use UTF-8 JSONL with separate inputs.jsonl and labels.jsonl. Current dev and Agent directories also contain annotations.jsonl. PEA-60's performance criterion and definition are adapted by app/dataset_inputs.py. app/schemas.py validates fields, lengths, enums and dates. Case IDs identify cases; employee IDs and review periods constrain retrieval; reference standards supply comparison context. Evidence identifiers support citations and deduplication. Original evidence IDs differ from runtime citation IDs.

app/models.py projects only approved case facts to the model. Gold labels, rationales, boundary types and human-review metadata are excluded. Neutral case/employee identifiers are backend scope data, not model-visible answers. app/evaluation.py persists predictions before loading labels. Hashing Gold bytes for integrity does not mean placing Gold in model context. Prior selected-case smoke exposure must still be disclosed.

The local evidence library has authorization, employee/case, source and date filters followed by bilingual keyword matching. It is not a live HRIS or vector database. Duplicate, contradictory, wrong-scope and no-result fixtures test defined behaviors; they do not establish general retrieval recall. Missing metadata is not invented.

## Validation and limits

The new verification/data_inventory.json records direct JSONL counts and language fields. Full schema validation, installation and application tests were NOT RUN during the accelerated delivery. The existing command is python data/validate_data.py from pea-backend after dependency installation. Complete safe JSONL inputs and labels are explicitly included, independent of .gitignore.

No real employee data or production credentials are included. A redistribution licence for every supplied workbook was not established; confirm rights before public release. Synthetic data, AI-draft labels, a small sample and limited review evidence restrict generalization. Missing generation artifacts must remain gaps, not reconstructed originals.
