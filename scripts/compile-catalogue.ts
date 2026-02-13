/**
 * Build-time catalogue compiler.
 *
 * Reads all catalogue/**\/*.rdf files, parses each via the RDF parser,
 * reads associated metadata.json, and emits public/catalogue.json.
 *
 * Usage: npx tsx scripts/compile-catalogue.ts
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { JSDOM } from 'jsdom';
import { parseRDF } from '../src/lib/rdf/parser.js';
import { serializeToRDF } from '../src/lib/rdf/serializer.js';
import type { CatalogueEntry, Catalogue } from '../src/types/catalogue.js';

// Provide DOMParser for the RDF parser (browser API not available in Node)
const dom = new JSDOM('');
globalThis.DOMParser = dom.window.DOMParser;

const ROOT = join(import.meta.dirname, '..');
const CATALOGUE_DIR = join(ROOT, 'catalogue');
const OUTPUT_PATH = join(ROOT, 'public', 'catalogue.json');

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface CatalogueMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  tags?: string[];
  author?: string;
}

// ------------------------------------------------------------------
// Validation helpers
// ------------------------------------------------------------------

const REQUIRED_METADATA_FIELDS = ['id', 'name', 'description', 'category'] as const;
const VALID_CATEGORIES = ['retail', 'healthcare', 'finance', 'manufacturing', 'education', 'general'];

function validateMetadata(meta: unknown, filePath: string): CatalogueMetadata {
  if (typeof meta !== 'object' || meta === null) {
    throw new Error(`${filePath}: metadata.json must be a JSON object`);
  }
  const obj = meta as Record<string, unknown>;
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
      throw new Error(`${filePath}: metadata.json missing required field "${field}"`);
    }
  }
  if (!VALID_CATEGORIES.includes(obj['category'] as string)) {
    throw new Error(
      `${filePath}: invalid category "${obj['category']}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    );
  }
  return meta as CatalogueMetadata;
}

// ------------------------------------------------------------------
// Discover ontology directories
// ------------------------------------------------------------------

function discoverOntologyDirs(baseDir: string): string[] {
  const dirs: string[] = [];
  if (!existsSync(baseDir)) return dirs;
  for (const entry of readdirSync(baseDir)) {
    const full = join(baseDir, entry);
    if (statSync(full).isDirectory()) {
      dirs.push(full);
    }
  }
  return dirs;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

function compile(): Catalogue {
  const entries: CatalogueEntry[] = [];
  const seenIds = new Set<string>();
  let errors = 0;

  for (const tier of ['official', 'community'] as const) {
    const tierDir = join(CATALOGUE_DIR, tier);
    // For community, ontologies are nested one level deeper: community/<user>/<slug>/
    const ontologyDirs: { dir: string; source: typeof tier }[] = [];

    if (tier === 'official') {
      for (const dir of discoverOntologyDirs(tierDir)) {
        ontologyDirs.push({ dir, source: tier });
      }
    } else {
      // community/<username>/<ontology-slug>/
      for (const userDir of discoverOntologyDirs(tierDir)) {
        for (const dir of discoverOntologyDirs(userDir)) {
          ontologyDirs.push({ dir, source: tier });
        }
      }
    }

    for (const { dir, source } of ontologyDirs) {
      const slug = basename(dir);
      const metadataPath = join(dir, 'metadata.json');
      const rdfFiles = readdirSync(dir).filter((f) => f.endsWith('.rdf') || f.endsWith('.owl'));

      if (rdfFiles.length === 0) {
        console.error(`✘ ${dir}: no .rdf or .owl file found`);
        errors++;
        continue;
      }
      if (!existsSync(metadataPath)) {
        console.error(`✘ ${dir}: missing metadata.json`);
        errors++;
        continue;
      }

      // Parse metadata
      let metadata: CatalogueMetadata;
      try {
        const raw = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        metadata = validateMetadata(raw, metadataPath);
      } catch (e) {
        console.error(`✘ ${metadataPath}: ${(e as Error).message}`);
        errors++;
        continue;
      }

      if (seenIds.has(metadata.id)) {
        console.error(`✘ ${dir}: duplicate catalogue id "${metadata.id}"`);
        errors++;
        continue;
      }

      // Parse RDF
      const rdfPath = join(dir, rdfFiles[0]);
      let ontology: Ontology;
      let bindings: DataBinding[];
      try {
        const rdfXml = readFileSync(rdfPath, 'utf-8');
        const parsed = parseRDF(rdfXml);
        ontology = parsed.ontology;
        bindings = parsed.bindings;
      } catch (e) {
        console.error(`✘ ${rdfPath}: ${(e as Error).message}`);
        errors++;
        continue;
      }

      // Round-trip check: serialize back and re-parse to verify fidelity
      try {
        const reserialized = serializeToRDF(ontology, bindings);
        parseRDF(reserialized);
      } catch (e) {
        console.error(`✘ ${rdfPath}: round-trip verification failed — ${(e as Error).message}`);
        errors++;
        continue;
      }

      seenIds.add(metadata.id);
      entries.push({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        tags: metadata.tags ?? [],
        author: metadata.author ?? 'unknown',
        source,
        ontology,
        bindings,
      });

      console.log(`✔ ${source}/${slug}`);
    }
  }

  if (errors > 0) {
    throw new Error(`Catalogue compilation failed with ${errors} error(s)`);
  }

  return {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };
}

// ------------------------------------------------------------------
// Run
// ------------------------------------------------------------------

try {
  const catalogue = compile();
  writeFileSync(OUTPUT_PATH, JSON.stringify(catalogue, null, 2) + '\n', 'utf-8');
  console.log(`\n✔ Wrote ${catalogue.count} entries to ${OUTPUT_PATH}`);
} catch (e) {
  console.error(`\n${(e as Error).message}`);
  process.exit(1);
}
