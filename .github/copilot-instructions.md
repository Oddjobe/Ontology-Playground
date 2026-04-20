# Copilot Instructions — Ontology Playground

## Build, Test & Lint

```bash
npm run dev                     # Vite dev server on http://localhost:5173
npm run build                   # Full pipeline: catalogue:build → learn:build → tsc -b → vite build → build:embed
npm test                        # Vitest single run
npm run test:watch              # Vitest watch mode
npx vitest run src/lib/rdf/parser.test.ts   # Run a single test file
npm run lint                    # ESLint (flat config, TS/TSX only)
npx tsc -b                     # Type check (project references: tsconfig.app.json + tsconfig.node.json)
npm run validate                # Validate all catalogue RDF files
npm run catalogue:build         # Compile catalogue/**/*.rdf → public/catalogue.json
npm run learn:build             # Compile content/learn/**/*.md → public/learn.json
```

The CI pipeline (`.github/workflows/ci.yml`) runs: `catalogue:build` → `learn:build` → `validate` → `tsc -b` → `npm test` → `vite build`. Run this sequence locally before pushing.

## Architecture

### Two-build system

The app produces **two separate bundles** from the same source tree:

1. **Main SPA** — standard Vite React build (`vite.config.ts` → `build/`)
2. **Embeddable widget** — IIFE library build (`vite.config.embed.ts` → `build/embed/ontology-embed.js`) from entry `src/embed.tsx`

### Build-time content compilation

Catalogue and learning content are **compiled at build time**, not loaded from source at runtime:

- `scripts/compile-catalogue.ts` reads `catalogue/{official,community,external}/**/metadata.json` + `*.rdf`, parses RDF via `src/lib/rdf/parser.ts`, and emits `public/catalogue.json`
- `scripts/compile-learn.ts` reads `content/learn/<course>/_meta.md` + numbered `*.md` articles, compiles Markdown to sanitized HTML (including quiz blocks and ontology embeds), and emits `public/learn.json`

After changing catalogue RDF files or learning content Markdown, you must re-run the relevant compiler for changes to appear at runtime.

### State management

Two independent Zustand stores:

- **`appStore`** — main app state (current ontology, UI selections, quests, query state, dark mode)
- **`designerStore`** — draft ontology in the visual designer with undo/redo (50 levels) and Fabric IQ validation

The designer store is independent of the app store. Changes in the designer don't affect the main graph until the user explicitly exports/loads.

### Routing

Custom hash-based router (`src/lib/router.ts`) — no React Router. Routes are parsed from `window.location.hash` with sanitized ontology IDs. Navigation uses `navigate()` from `src/lib/router.ts`; components subscribe via the `useRoute()` hook.

### RDF round-trip pipeline

`src/lib/rdf/parser.ts` converts RDF/XML (OWL) → internal `Ontology` model. `src/lib/rdf/serializer.ts` converts the model back to RDF/XML in the format Microsoft Fabric IQ expects. Round-trip fidelity is verified by `src/lib/rdf/roundtrip.test.ts`.

## Key Conventions

### Ontology data model

The core data model (`src/data/ontology.ts`) consists of `Ontology` (with `EntityType[]` and `Relationship[]`), `Property`, and `DataBinding`. All components and serializers work against these interfaces.

### Catalogue entry structure

Each catalogue ontology lives in `catalogue/{official,community,external}/<slug>/` with:
- `<slug>.rdf` — the ontology in RDF/OWL format
- `metadata.json` — must conform to `catalogue/metadata-schema.json` (required: `name`, `description`, `category`)

Valid categories: `retail`, `healthcare`, `finance`, `manufacturing`, `education`, `food`, `media`, `events`, `general`, `energy`, `school`, `fibo`.

### Learning content structure

Each course lives in `content/learn/<course-slug>/` with:
- `_meta.md` — YAML frontmatter with course metadata (title, slug, type, icon)
- Numbered article files (`01-*.md`, `02-*.md`, …) with Markdown, `<ontology-embed>` tags, and ` ```quiz ` fenced blocks

Quiz syntax: `Q:` for the question, `- Option [correct]` for the correct answer, `>` for explanation.

### Fabric IQ naming rules

Entity and property names must match: 1–26 chars, alphanumeric + hyphens + underscores, must start and end with an alphanumeric character. Validated by `isValidFabricIQName()` in `designerStore.ts`.

### Conventional commits

Use `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` prefixes. Branch names: `feature/<name>` or `fix/<name>`. Never push directly to `main`.

### Agent skills and prompts

This repo has Copilot skills and prompts for common ontology workflows:
- **Catalogue import**: `.github/skills/ontology-catalog-import/` + `.github/prompts/import-rdf-to-catalog.prompt.md`
- **School path generation**: `.github/skills/ontology-school-path-generator/` + `.github/prompts/generate-ontology-school-module.prompt.md`
- **RDF intake routing**: `.github/instructions/rdf-intake.instructions.md` — auto-triggers when `.rdf`/`.owl` files are in scope

### Component patterns

- Functional React components with hooks; no class components
- Modal/panel components follow the pattern in `src/components/` (boolean state toggle, AnimatePresence for animation)
- New components should be exported from `src/components/index.ts`
- Feature-gated code uses `import.meta.env.VITE_*` flags (e.g., `VITE_ENABLE_AI_BUILDER`)
