# Requirements Specification — Milestone v6.0 (Rebuild Autopilot Engine)

## 🎯 Objective
Design and implement a flexible, entity-agnostic automation engine ("Autopilot") that allows users to independently define named Conditions and Actions, combining them into strictly ordered execution pipelines. The architecture must strictly decouple domain concepts from the rule schema.

---

## 📋 Technical Requirements

### 1. Conditions
- [ ] **COND-01**: Users can create and name reusable conditions independently of Autopilot pipelines.
- [ ] **COND-02**: Conditions must be entity-agnostic, evaluating against a runtime-supplied entity.
- [ ] **COND-03**: Support change-based triggers: `changed`, `changed from X`, `changed to Y`, `changed from X to Y`, `added`, `removed`.
- [ ] **COND-04**: Support natural-language prefix/postfix representations for condition definitions.
- [ ] **COND-05**: Conditions must be composable using boolean operators (`AND`, `OR`, `NOT`).
- [ ] **COND-06**: Implement structural hashing for condition deduplication (identical logic shares one `conditions` record, aliases stored in `condition_labels`).

### 2. Actions
- [ ] **ACT-01**: Users can create and name reusable getter/setter sequences (Actions) independently.
- [ ] **ACT-02**: Implement lazy context resolution at execution time with supported resolvers: `self`, `parent`, `project`, `team`, `teamMember`.
- [ ] **ACT-03**: Expose structured getter/setter API (`.get("fieldName")`, `.set("fieldName", value)`) for resolvers.

### 3. Execution Pipeline (Autopilot)
- [ ] **PIPE-01**: Autopilot rules are defined as ordered sequences of saved Conditions and Actions referenced by name/ID.
- [ ] **PIPE-02**: Support arbitrary pipeline shapes (e.g., Condition → Action → Condition → Action).
- [ ] **PIPE-03**: Enforce strict execution semantics (a returning false Condition step halts the pipeline; Actions always execute if reached).

### 4. Database Schema
- [ ] **DB-01**: Implement `conditions` table (id, name, definition JSONB, hash unique, created_at, created_by).
- [ ] **DB-02**: Implement `condition_labels` table (id, name, condition_hash FK).
- [ ] **DB-03**: Implement `actions` table (id, name, steps JSONB, created_at, created_by).
- [ ] **DB-04**: Implement `autopilots` table (id, name, description, is_active, created_at, created_by).
- [ ] **DB-05**: Implement `autopilot_steps` table (id, autopilot_id, step_order, step_type, step_ref_id).

---

## 🔮 Future Requirements (Deferred)
- External Service Actions (Webhooks, 3rd party API calls)
- Cross-project trigger evaluation

---

## 📈 Out of Scope
- Cron-based time-based triggers (focus remains purely on reactive/event-driven architecture).
- Hardcoding specific entity schemas into the rule definitions.

---

## 🔗 Traceability
| Requirement | Phase | Status |
|-------------|-------|--------|
| COND-01 | 23 | Pending |
| COND-02 | 23 | Pending |
| COND-03 | 23 | Pending |
| COND-04 | 23 | Pending |
| COND-05 | 23 | Pending |
| COND-06 | 23 | Pending |
| ACT-01 | 24 | Pending |
| ACT-02 | 24 | Pending |
| ACT-03 | 24 | Pending |
| PIPE-01 | 25 | Pending |
| PIPE-02 | 25 | Pending |
| PIPE-03 | 25 | Pending |
| DB-01 | 22 | Pending |
| DB-02 | 22 | Pending |
| DB-03 | 22 | Pending |
| DB-04 | 22 | Pending |
| DB-05 | 22 | Pending |
