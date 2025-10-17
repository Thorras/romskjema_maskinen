# Kiro Agent Hooks — Dokumentasjon

Denne markdownen samler alle **Kiro Agent Hooks**-forslagene i ett konsist, operasjonelt dokument – klart for implementering i et Next.js/TypeScript‑monorepo.
**Konvensjon:** Engelske nøkler i data/payloads, norske beskrivelser og feilmeldinger.

## Innhold
- Formål & prinsipper
- Navnekonvensjon
- Universell event‑payload
- TypeScript‑typer
- Event bus (skisse)
- Hook‑katalog
  - Agent
  - IFC‑prosessering
  - Planview (2D snitt, SVG, GeoJSON)
  - Room Schedule (IFC Space → romskjema)
  - Validering (NS‑standarder)
  - Eksport & manifest
  - Ytelse & telemetri
  - UI & konfig
- Sekvensflyt (end‑to‑end)
- Feilkoder & mapping
- Plugin‑eksempler
- Konfigeksempel for hooks
- Beste praksis

---

## Formål & prinsipper
- Isoler sideeffekter (logging, metrics, varsling, fallback) fra domenelogikken.
- Observability by design: alle viktige steg i pipeline emiterer events.
- Idempotente hooks: samme event kan håndteres trygt flere ganger.
- Lav overhead: lettvekts EventEmitter, tidsgrenser og feilisolasjon.

## Navnekonvensjon
```
kiro.<domain>.<action|lifecycle>.<phase>
```
Domener: `agent`, `ifc`, `planview`, `room`, `validation`, `export`, `perf`, `ui`, `manifest`
Faser: `before`, `after`, `error` (+ `empty`, `missing_critical`, `violation`)

## Universell event‑payload
Se `schemas/kiro-event.schema.json`.

## TypeScript‑typer
Se `src/types.ts`.

## Event bus (skisse)
Se `src/bus.ts` for en minimal emitter + timing‑helper.

---

## Hook‑katalog

### Agent
- `kiro.agent.init.before` / `kiro.agent.init.after` / `kiro.agent.shutdown.before`
- `kiro.agent.run.start` / `kiro.agent.run.end`
- `kiro.agent.error`

### IFC‑prosessering
- `kiro.ifc.open.before` / `kiro.ifc.open.after` / `kiro.ifc.open.error`
- `kiro.ifc.indexing.after`
- `kiro.ifc.cache.hit` / `kiro.ifc.cache.miss`

### Planview (2D snitt, SVG, GeoJSON)
- `kiro.planview.storeys.detected.after`
- `kiro.planview.slice.before` / `kiro.planview.slice.after` / `kiro.planview.slice.empty` / `kiro.planview.slice.error`
- `kiro.planview.geometry.shape.error`
- `kiro.planview.svg.write.before` / `kiro.planview.svg.write.after` / `kiro.planview.svg.write.error`
- `kiro.planview.geojson.write.before` / `kiro.planview.geojson.write.after` / `kiro.planview.geojson.write.error`

### Room Schedule (IFC Space → romskjema)
- `kiro.room.selection.before` / `kiro.room.selection.after`
- `kiro.room.extract.before` / `kiro.room.extract.after` / `kiro.room.extract.missing_critical`
- `kiro.room.ns.map.before` / `kiro.room.ns.map.after` / `kiro.room.ns.validate.error`
- `kiro.room.fallback.applied`
- `kiro.room.export.before` / `kiro.room.export.after` / `kiro.room.export.error`

### Validering (NS‑standarder)
- `kiro.validation.run.before` / `kiro.validation.run.after`
- `kiro.validation.violation`
- `kiro.validation.error`

### Eksport & manifest
- `kiro.export.manifest.before` / `kiro.export.manifest.after` / `kiro.export.manifest.error`

### Ytelse & telemetri
- `kiro.perf.batch.start` / `kiro.perf.batch.end`
- `kiro.perf.metrics`
- `kiro.perf.memory.threshold`

### UI & konfig
- `kiro.ui.progress`
- `kiro.ui.notice`
- `kiro.config.changed`

---

## Sekvensflyt (end‑to‑end)

### Planview (per etasje)
1. `kiro.ifc.open.before` → `kiro.ifc.open.after` / `.error(IFC_OPEN_FAILED)`
2. `kiro.planview.storeys.detected.after`
3. `kiro.planview.slice.before` → `.after` / `.empty(EMPTY_CUT_RESULT)` / `.error`
4. `kiro.planview.svg.write.before` → `.after` / `.error(WRITE_FAILED)`
5. `kiro.planview.geojson.write.before` → `.after` / `.error`
6. `kiro.export.manifest.after`

### Room Schedule (per Space)
1. `kiro.room.selection.after`
2. `kiro.room.extract.before` → `.after` / `.missing_critical(MISSING_CRITICAL_DATA)`
3. `kiro.validation.run.before` → `.violation` (0..n) → `.after` / `.error(VALIDATION_ERROR)`
4. `kiro.room.export.before` → `.after` / `.error(EXPORT_FAILED)`
5. `kiro.export.manifest.after`

---

## Feilkoder & mapping
- `IFC_OPEN_FAILED` → `kiro.ifc.open.error`
- `NO_STOREYS_FOUND` → 0 funn i `storeys.detected.after` (eller egen error)
- `EMPTY_CUT_RESULT` → `kiro.planview.slice.empty`
- `GEOMETRY_SHAPE_FAILED` → `kiro.planview.geometry.shape.error`
- `WRITE_FAILED` → `planview.*.write.error` / `room.export.error`
- `EXPORT_FAILED` → `kiro.room.export.error`
- `MISSING_CRITICAL_DATA` → `kiro.room.extract.missing_critical`
- `VALIDATION_ERROR` → `kiro.validation.error`

---

## Plugin‑eksempler
- Logger: `src/plugins/logger.ts`
- Metrics: `src/plugins/metrics.ts`
- Slack: `src/plugins/slack.ts`
- Sentry: `src/plugins/sentry.ts`

---

## Konfigeksempel for hooks
```json
{
  "hooks": {
    "enabled": true,
    "subscriptions": [
      { "name": "kiro.planview.slice.after", "plugins": ["metrics", "logger"] },
      { "name": "kiro.planview.slice.empty", "plugins": ["ui-notify", "logger"] },
      { "name": "kiro.room.extract.missing_critical", "plugins": ["fallback", "logger"] },
      { "name": "kiro.validation.violation", "plugins": ["slack", "logger"] },
      { "name": "kiro.agent.error", "plugins": ["sentry", "logger"] }
    ],
    "timeoutsMs": { "default": 2000, "sentry": 3000, "slack": 2500 }
  }
}
```

---

## Beste praksis
- Idempotens med `correlationId` (storey/space GUID).
- Timeouts + feilisolasjon til `kiro.agent.error`.
- Regex‑abonnement for domene‑brede lyttere.
- Scrubb sensitiv info i `beforeAll`.
- Batch høyfrekvente events (`kiro.perf.metrics`).
- Legg ved `metrics.durationMs`, `metrics.items`, `context` i `.after` events.
- Hold eventnavn korte og konsistente.
