import { JSDOM } from 'jsdom';
// Polyfill DOMParser for Node.js
const dom = new JSDOM();
(globalThis as Record<string, unknown>).DOMParser = dom.window.DOMParser;

import { parseRDF } from '../src/lib/rdf/parser';
import { validateOntology } from '../src/store/designerStore';
import { cosmicCoffeeOntology } from '../src/data/ontology';
import { sampleOntologies } from '../src/data/sampleOntologies';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// 1. Validate TS objects
console.log('=== Cosmic Coffee (TS object) ===');
const ccErrors = validateOntology(cosmicCoffeeOntology);
console.log(ccErrors.length ? ccErrors.map(e => '  ' + e.message).join('\n') : '  OK');

for (const s of sampleOntologies) {
  const errors = validateOntology(s.ontology);
  console.log(`=== ${s.name} (TS) === ${errors.length ? 'ERRORS' : 'OK'}`);
  if (errors.length) console.log(errors.map(e => '  ' + e.message).join('\n'));
}

// 2. Validate catalogue RDF files (parsed)
const catalogueDir = join(process.cwd(), 'catalogue/official');
for (const dir of readdirSync(catalogueDir)) {
  const dirPath = join(catalogueDir, dir);
  const rdfFiles = readdirSync(dirPath).filter(f => f.endsWith('.rdf'));
  for (const f of rdfFiles) {
    const rdf = readFileSync(join(dirPath, f), 'utf-8');
    const { ontology } = parseRDF(rdf);
    const errors = validateOntology(ontology);
    console.log(`=== ${f} (catalogue RDF) === ${errors.length ? 'ERRORS' : 'OK'}`);
    if (errors.length) console.log(errors.map(e => '  ' + e.message).join('\n'));
  }
}

// 3. Validate user's downloaded RDF files if they exist
for (const file of [
  '/Users/alvarovidela/Downloads/cosmic-coffee-company-ontology.rdf',
  '/Users/alvarovidela/Downloads/university-system-ontology.rdf',
]) {
  try {
    const rdf = readFileSync(file, 'utf-8');
    const { ontology } = parseRDF(rdf);
    const errors = validateOntology(ontology);
    const basename = file.split('/').pop();
    console.log(`=== ${basename} (Downloads) === ${errors.length ? 'ERRORS' : 'OK'}`);
    if (errors.length) console.log(errors.map(e => '  ' + e.message).join('\n'));
  } catch { /* file may not exist */ }
}
