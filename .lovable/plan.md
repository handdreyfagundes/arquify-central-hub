

## Diagnosis

**Root cause confirmed**: Line 365 saves the selected value directly to `tarefas.etapa_id`. When a substage is selected, its UUID (from `subetapas` table) is written to `etapa_id`, which has a FK constraint to `etapas` table only. Postgres rejects it with `tarefas_etapa_id_fkey` violation.

**Current schema**: `tarefas` has no `subetapa_id` column. There is no way to persist a substage link.

## Fix — 3 changes

### 1. Database migration
Add `subetapa_id` column to `tarefas` with FK to `subetapas(id)` and `ON DELETE SET NULL` (handles rule 3: if substage is deleted, field becomes null, task falls back to parent stage via `etapa_id`).

```sql
ALTER TABLE public.tarefas
  ADD COLUMN subetapa_id uuid REFERENCES public.subetapas(id) ON DELETE SET NULL;
```

No data migration needed — existing rows get `subetapa_id = NULL` (rule 4).

### 2. Update stage selector handler (TarefasTab.tsx, line 365)
Replace the single `updateField` call with logic that checks whether the selected value is a stage or substage:
- If stage: set `etapa_id = value`, `subetapa_id = null`
- If substage: set `etapa_id = sub.etapa_id` (parent), `subetapa_id = value`
- If "none": set both to `null`

### 3. Update display logic
- `getEtapaName`: check task's `subetapa_id` first (show "Parent › Sub"), then fall back to `etapa_id`
- Select value: use `subetapa_id ?? etapa_id ?? "none"`
- Sorting by etapa: use the display name from the updated `getEtapaName`

No UI changes. No other files affected.

