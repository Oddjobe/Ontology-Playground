/**
 * Fabric Ontology API client — converts playground ontologies to Fabric's
 * definition.parts format and pushes them via the REST API.
 *
 * API Reference:
 *   https://learn.microsoft.com/en-us/rest/api/fabric/ontology/items/create-ontology
 *   https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/ontology-definition
 */

import type { Ontology, Property } from '../data/ontology';

// ─── Fabric API types ──────────────────────────────────────────────────────

export interface FabricDefinitionPart {
  path: string;
  payload: string;          // base64-encoded JSON
  payloadType: 'InlineBase64';
}

export interface FabricOntologyDefinition {
  parts: FabricDefinitionPart[];
}

export interface FabricEntityTypeProperty {
  id: string;
  name: string;
  redefines: null;
  baseTypeNamespaceType: null;
  valueType: 'String' | 'Boolean' | 'DateTime' | 'Double' | 'BigInt' | 'Object';
}

export interface FabricEntityType {
  id: string;
  namespace: 'usertypes';
  baseEntityTypeId: null;
  name: string;
  entityIdParts: string[];
  displayNamePropertyId: string | null;
  namespaceType: 'Custom';
  visibility: 'Visible';
  properties: FabricEntityTypeProperty[];
  timeseriesProperties: FabricEntityTypeProperty[];
}

export interface FabricRelationshipType {
  namespace: 'usertypes';
  id: string;
  name: string;
  namespaceType: 'Custom';
  source: { entityTypeId: string };
  target: { entityTypeId: string };
}

export interface CreateOntologyRequest {
  displayName: string;
  description?: string;
  definition?: FabricOntologyDefinition;
}

export interface FabricOntologyResponse {
  id: string;
  displayName: string;
  description: string;
  type: 'Ontology';
  workspaceId: string;
}

export interface FabricListOntologiesResponse {
  value: FabricOntologyResponse[];
  continuationUri?: string;
}

// ─── ID generation ─────────────────────────────────────────────────────────

/**
 * Generate a positive 64-bit integer ID as a string, matching Fabric's
 * requirement for entity/property/relationship IDs.
 * Pass a Set to guarantee uniqueness within a conversion run.
 */
function generateFabricId(usedIds?: Set<string>): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    const high = buf[0] & 0x001FFFFF;  // 21 bits
    const low = buf[1];                 // 32 bits
    const val = high * 0x100000000 + low;
    if (val === 0) continue;
    const id = String(val);
    if (usedIds && usedIds.has(id)) continue;
    usedIds?.add(id);
    return id;
  }
  return String(Date.now()); // last-resort fallback
}

// ─── Type mapping ──────────────────────────────────────────────────────────

const VALUE_TYPE_MAP: Record<Property['type'], FabricEntityTypeProperty['valueType']> = {
  string: 'String',
  integer: 'BigInt',
  decimal: 'Double',
  double: 'Double',
  date: 'DateTime',
  datetime: 'DateTime',
  boolean: 'Boolean',
  enum: 'String',
};

function mapValueType(type: Property['type']): FabricEntityTypeProperty['valueType'] {
  return VALUE_TYPE_MAP[type] ?? 'String';
}

// ─── Conversion ────────────────────────────────────────────────────────────

function toBase64(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2);
  // TextEncoder → Uint8Array → binary string → btoa
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export interface ConversionResult {
  definition: FabricOntologyDefinition;
  entityIdMap: Map<string, string>;     // playground id → fabric id
  propertyIdMap: Map<string, Map<string, string>>;  // playground entity id → (propName → fabric prop id)
  entityNameMap: Map<string, string>;   // playground entity id → sanitized fabric name
}

export class FabricValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`Ontology validation failed:\n• ${errors.join('\n• ')}`);
    this.name = 'FabricValidationError';
    this.errors = errors;
  }
}

/**
 * Preflight validation — checks the ontology for issues that would cause
 * Fabric import failures. Throws with a human-readable message on failure.
 */
export function validateForFabric(ontology: Ontology): void {
  const errors: string[] = [];

  // Check for duplicate entity IDs
  const seenEntityIds = new Set<string>();
  for (const entity of ontology.entityTypes) {
    if (seenEntityIds.has(entity.id)) {
      errors.push(`Duplicate entity ID: "${entity.id}" appears more than once`);
    }
    seenEntityIds.add(entity.id);
  }

  const entityIds = new Set(ontology.entityTypes.map(e => e.id));

  // Check for duplicate entity names after sanitization
  const sanitizedEntityNames = new Map<string, string>();
  for (const entity of ontology.entityTypes) {
    const sName = sanitizeName(entity.name);
    if (sanitizedEntityNames.has(sName)) {
      errors.push(`Entity name collision: "${entity.name}" and "${sanitizedEntityNames.get(sName)}" both become "${sName}" after sanitization`);
    }
    sanitizedEntityNames.set(sName, entity.name);

    // Check for duplicate property names within an entity after sanitization
    const sanitizedPropNames = new Map<string, string>();
    for (const prop of entity.properties) {
      const sProp = sanitizeName(prop.name);
      if (sanitizedPropNames.has(sProp)) {
        errors.push(`Property collision in "${entity.name}": "${prop.name}" and "${sanitizedPropNames.get(sProp)}" both become "${sProp}"`);
      }
      sanitizedPropNames.set(sProp, prop.name);
    }
  }

  // Check relationship references
  for (const rel of ontology.relationships) {
    if (!entityIds.has(rel.from)) {
      errors.push(`Relationship "${rel.name}" references unknown source entity "${rel.from}"`);
    }
    if (!entityIds.has(rel.to)) {
      errors.push(`Relationship "${rel.name}" references unknown target entity "${rel.to}"`);
    }
  }

  if (errors.length > 0) {
    throw new FabricValidationError(errors);
  }
}

/**
 * Convert a Playground ontology to Fabric's definition.parts format.
 * Pure function — no side effects.
 *
 * Handles:
 * - Synthetic "Id" property for entities with no properties
 * - Cross-entity property name conflicts (auto-disambiguated with entity suffix)
 * - Duplicate relationship names (auto-disambiguated with source entity suffix)
 * - Correct displayNamePropertyId per Fabric spec
 */
export function convertToFabricParts(ontology: Ontology): ConversionResult {
  const parts: FabricDefinitionPart[] = [];
  const entityIdMap = new Map<string, string>();
  const propertyIdMap = new Map<string, Map<string, string>>();
  const entityNameMap = new Map<string, string>();
  const usedIds = new Set<string>(); // guarantees unique Fabric IDs

  // Platform part — required by Fabric definition schema
  const platform = {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
    metadata: {
      type: 'Ontology',
      displayName: sanitizeItemName(ontology.name),
    },
    config: {
      version: '2.0',
      logicalId: '00000000-0000-0000-0000-000000000000',
    },
  };
  parts.push({
    path: '.platform',
    payload: toBase64(platform),
    payloadType: 'InlineBase64',
  });

  // definition.json — empty root (required by Fabric)
  parts.push({
    path: 'definition.json',
    payload: toBase64({}),
    payloadType: 'InlineBase64',
  });

  // Build global property name → valueType map to detect cross-entity conflicts.
  // Fabric requires that properties with the same name have the same type globally.
  const globalPropTypes = new Map<string, string>(); // sanitizedName → valueType
  const conflictingProps = new Set<string>(); // sanitizedNames that have type conflicts
  for (const entity of ontology.entityTypes) {
    const props = entity.properties.length > 0
      ? entity.properties
      : [{ name: 'Id', type: 'string' as const }];
    for (const prop of props) {
      const sName = sanitizeName(prop.name);
      const vType = mapValueType(prop.type);
      const existing = globalPropTypes.get(sName);
      if (existing && existing !== vType) {
        conflictingProps.add(sName);
      }
      if (!existing) globalPropTypes.set(sName, vType);
    }
  }

  // Entity Types
  for (const entity of ontology.entityTypes) {
    const fabricEntityId = generateFabricId(usedIds);
    entityIdMap.set(entity.id, fabricEntityId);
    entityNameMap.set(entity.id, sanitizeName(entity.name));

    const propMap = new Map<string, string>();
    propertyIdMap.set(entity.id, propMap);

    // Inject synthetic "Id" if entity has no properties
    const sourceProps = entity.properties.length > 0
      ? entity.properties
      : [{ name: 'Id', type: 'string' as const, isIdentifier: true }];

    const fabricProperties: FabricEntityTypeProperty[] = sourceProps.map(prop => {
      const fabricPropId = generateFabricId(usedIds);
      propMap.set(prop.name, fabricPropId);
      let propName = sanitizeName(prop.name);
      // Disambiguate cross-entity property name conflicts by suffixing entity name
      if (conflictingProps.has(propName)) {
        propName = `${propName}_${sanitizeName(entity.name)}`.slice(0, 128);
      }
      return {
        id: fabricPropId,
        name: propName,
        redefines: null,
        baseTypeNamespaceType: null,
        valueType: mapValueType(prop.type),
      };
    });

    const identifierProp = sourceProps.find(p => 'isIdentifier' in p && p.isIdentifier) || sourceProps[0];
    const identifierFabricId = propMap.get(identifierProp.name)!;

    const fabricEntity: FabricEntityType = {
      id: fabricEntityId,
      namespace: 'usertypes',
      baseEntityTypeId: null,
      name: sanitizeName(entity.name),
      entityIdParts: [identifierFabricId],
      displayNamePropertyId: identifierFabricId,
      namespaceType: 'Custom',
      visibility: 'Visible',
      properties: fabricProperties,
      timeseriesProperties: [],
    };

    parts.push({
      path: `EntityTypes/${fabricEntityId}/definition.json`,
      payload: toBase64(fabricEntity),
      payloadType: 'InlineBase64',
    });
  }

  // Detect duplicate relationship names so we can auto-disambiguate.
  // Fabric enforces globally unique relationship names.
  const relNameCounts = new Map<string, number>();
  for (const rel of ontology.relationships) {
    const sName = sanitizeName(rel.name);
    relNameCounts.set(sName, (relNameCounts.get(sName) || 0) + 1);
  }
  const duplicateRelNames = new Set(
    [...relNameCounts.entries()].filter(([, c]) => c > 1).map(([n]) => n),
  );

  // Relationship Types
  const usedRelNames = new Set<string>();
  for (const rel of ontology.relationships) {
    const fabricRelId = generateFabricId(usedIds);
    const sourceEntityId = entityIdMap.get(rel.from);
    const targetEntityId = entityIdMap.get(rel.to);

    if (!sourceEntityId || !targetEntityId) {
      const missing = !sourceEntityId ? rel.from : rel.to;
      throw new FabricApiError(
        `Relationship "${rel.name}" references entity "${missing}" which does not exist in the ontology`,
        422,
        'InvalidRelationship',
      );
    }

    // Disambiguate duplicate relationship names by appending source entity name
    let relName = sanitizeName(rel.name);
    if (duplicateRelNames.has(relName)) {
      const sourceEntity = ontology.entityTypes.find(e => e.id === rel.from);
      const suffix = sourceEntity ? sanitizeName(sourceEntity.name) : rel.from;
      relName = `${relName}_${suffix}`.slice(0, 128);
    }
    // Final dedup: if still collides (e.g., same source), append numeric suffix
    const baseRelName = relName;
    let counter = 2;
    while (usedRelNames.has(relName)) {
      relName = `${baseRelName}_${counter++}`.slice(0, 128);
    }
    usedRelNames.add(relName);

    const fabricRel = {
      namespace: 'usertypes' as const,
      id: fabricRelId,
      name: relName,
      namespaceType: 'Custom' as const,
      source: { entityTypeId: sourceEntityId },
      target: { entityTypeId: targetEntityId },
    };

    parts.push({
      path: `RelationshipTypes/${fabricRelId}/definition.json`,
      payload: toBase64(fabricRel),
      payloadType: 'InlineBase64',
    });
  }

  return {
    definition: { parts },
    entityIdMap,
    propertyIdMap,
    entityNameMap,
  };
}

/**
 * Sanitize an internal name (entity types, properties, relationships).
 * Fabric allows only: letters, numbers, underscores; must start with a letter.
 */
function sanitizeName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (sanitized.length === 0 || !/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'E_' + sanitized;
  }
  return sanitized.slice(0, 128);
}

/**
 * Sanitize an item display name for Fabric's stricter item-level rules:
 * must start with a letter, < 90 chars, only letters, numbers, underscores.
 */
export function sanitizeItemName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (sanitized.length === 0 || !/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'Ontology_' + sanitized;
  }
  return sanitized.slice(0, 89);
}

// ─── Fabric REST API client ────────────────────────────────────────────────

const FABRIC_API_BASE = 'https://api.fabric.microsoft.com/v1';

export class FabricApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(
    message: string,
    status: number,
    errorCode?: string,
  ) {
    super(message);
    this.name = 'FabricApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function fabricFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<{ data: T | null; operationId?: string; location?: string }> {
  const res = await fetch(`${FABRIC_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 202) {
    return {
      data: null,
      operationId: res.headers.get('x-ms-operation-id') ?? undefined,
      location: res.headers.get('Location') ?? undefined,
    };
  }

  if (!res.ok) {
    let errorCode: string | undefined;
    let message = `Fabric API error: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.errorCode) errorCode = body.errorCode;
      if (body.message) message = body.message;
    } catch {
      // Use default message
    }
    // Capacity not active is returned as 404 with errorCode "CapacityNotActive"
    if (errorCode === 'CapacityNotActive') {
      message = 'The Fabric capacity assigned to this workspace is paused or inactive. Please resume it in the Azure portal and try again.';
    }
    throw new FabricApiError(message, res.status, errorCode);
  }

  if (res.status === 204) return { data: null };
  const data = await res.json() as T;
  return { data };
}

export interface PollProgress {
  attempt: number;
  maxAttempts: number;
  status?: string;
  percentComplete?: number;
}

/**
 * Poll a long-running operation until completion.
 * Default timeout: 60 attempts × 3s = ~3 minutes (Fabric ontology creation
 * provisions Lakehouse + SQL endpoint + GraphModel and can take 60-90s).
 */
async function pollOperation(
  operationId: string,
  token: string,
  maxAttempts = 60,
  intervalMs = 3000,
  onProgress?: (progress: PollProgress) => void,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const res = await fetch(`${FABRIC_API_BASE}/operations/${operationId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const body = await res.json();
      onProgress?.({
        attempt: i + 1,
        maxAttempts,
        status: body.status,
        percentComplete: body.percentComplete,
      });

      if (body.status === 'Succeeded') return;
      if (body.status === 'Failed') {
        const errorMsg = body.error?.message ?? 'Operation failed';
        const errorCode = body.error?.errorCode;
        throw new FabricApiError(
          errorMsg,
          body.error?.statusCode ?? 400,
          errorCode,
        );
      }

      // Respect Retry-After header if present
      const retryAfter = res.headers.get('Retry-After');
      if (retryAfter) {
        const delaySec = parseInt(retryAfter, 10);
        if (!isNaN(delaySec) && delaySec > 0) {
          await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
        }
      }
      // Still running — continue polling
    } else if (res.status === 202) {
      onProgress?.({ attempt: i + 1, maxAttempts, status: 'Running' });
      continue;
    } else {
      throw new FabricApiError(`Failed to poll operation: ${res.status}`, res.status);
    }
  }
  throw new FabricApiError(
    'Operation timed out after 3 minutes. The ontology may still be provisioning — check your Fabric workspace.',
    408,
  );
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * List ontologies in a Fabric workspace.
 */
export async function listOntologies(
  workspaceId: string,
  token: string,
): Promise<FabricOntologyResponse[]> {
  const { data } = await fabricFetch<FabricListOntologiesResponse>(
    `/workspaces/${encodeURIComponent(workspaceId)}/ontologies`,
    token,
  );
  return data?.value ?? [];
}

/**
 * Create a new ontology in a Fabric workspace and push its definition.
 * If an ontology with the same name already exists, appends a numeric suffix.
 */
export async function createOntology(
  workspaceId: string,
  token: string,
  ontology: Ontology,
  onProgress?: (progress: PollProgress) => void,
): Promise<FabricOntologyResponse> {
  // Preflight validation — catch data issues before hitting Fabric
  validateForFabric(ontology);

  const { definition } = convertToFabricParts(ontology);

  // Deduplicate display name to avoid 500 from Fabric on name collision
  let displayName = sanitizeItemName(ontology.name);
  try {
    const existing = await listOntologies(workspaceId, token);
    const existingNames = new Set(existing.map(o => o.displayName));
    if (existingNames.has(displayName)) {
      let suffix = 2;
      while (existingNames.has(`${displayName}_${suffix}`)) suffix++;
      displayName = `${displayName}_${suffix}`.slice(0, 89);
    }
  } catch {
    // If listing fails, proceed with the original name
  }

  const body: CreateOntologyRequest = {
    displayName,
    description: (ontology.description ?? '').slice(0, 256),
    definition,
  };

  const result = await fabricFetch<FabricOntologyResponse>(
    `/workspaces/${encodeURIComponent(workspaceId)}/ontologies`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );

  // If 202 (long-running), poll until complete
  if (result.operationId) {
    await pollOperation(result.operationId, token, 60, 3000, onProgress);
    // Fetch the created ontology — the operation doesn't return it
    const ontologies = await listOntologies(workspaceId, token);
    const created = ontologies.find(o => o.displayName === body.displayName);
    if (created) return created;
    throw new FabricApiError('Ontology created but not found in workspace', 404);
  }

  return result.data!;
}

/**
 * Update an existing ontology's definition.
 */
export async function updateOntologyDefinition(
  workspaceId: string,
  ontologyId: string,
  token: string,
  ontology: Ontology,
  onProgress?: (progress: PollProgress) => void,
): Promise<void> {
  validateForFabric(ontology);

  const { definition } = convertToFabricParts(ontology);

  const result = await fabricFetch<void>(
    `/workspaces/${encodeURIComponent(workspaceId)}/ontologies/${encodeURIComponent(ontologyId)}/updateDefinition?updateMetadata=true`,
    token,
    { method: 'POST', body: JSON.stringify({ definition }) },
  );

  if (result.operationId) {
    await pollOperation(result.operationId, token, 60, 3000, onProgress);
  }
}

// ─── Data Binding Support ──────────────────────────────────────────────────

export interface DataBindingConfig {
  workspaceId: string;
  lakehouseId: string;
  entityIdMap: Map<string, string>;
  propertyIdMap: Map<string, Map<string, string>>;
  entityNameMap: Map<string, string>;
}

/**
 * Generate DataBinding definition parts for each entity type.
 * Maps each entity to a Lakehouse table with matching column names.
 */
export function generateDataBindingParts(
  ontology: Ontology,
  config: DataBindingConfig,
): FabricDefinitionPart[] {
  const parts: FabricDefinitionPart[] = [];

  for (const entity of ontology.entityTypes) {
    const fabricEntityId = config.entityIdMap.get(entity.id);
    const propMap = config.propertyIdMap.get(entity.id);
    const tableName = config.entityNameMap.get(entity.id);
    if (!fabricEntityId || !propMap || !tableName) continue;

    const sourceProps = entity.properties.length > 0
      ? entity.properties
      : [{ name: 'Id', type: 'string' as const }];

    const bindingId = crypto.randomUUID();

    const binding = {
      id: bindingId,
      dataBindingConfiguration: {
        dataBindingType: 'NonTimeSeries',
        propertyBindings: sourceProps.map(prop => ({
          sourceColumnName: prop.name,
          targetPropertyId: propMap.get(prop.name) ?? '',
        })).filter(b => b.targetPropertyId),
        sourceTableProperties: {
          sourceType: 'LakehouseTable',
          workspaceId: config.workspaceId,
          itemId: config.lakehouseId,
          sourceTableName: tableName,
          sourceSchema: 'dbo',
        },
      },
    };

    parts.push({
      path: `EntityTypes/${fabricEntityId}/DataBindings/${bindingId}.json`,
      payload: toBase64(binding),
      payloadType: 'InlineBase64',
    });
  }

  return parts;
}

/**
 * Fetch the current definition of an ontology from Fabric.
 * Returns the parts array, or null if the operation fails.
 * getDefinition is async (202) — we poll the operation then fetch the result.
 */
async function getDefinition(
  workspaceId: string,
  ontologyId: string,
  token: string,
): Promise<FabricDefinitionPart[] | null> {
  try {
    const result = await fabricFetch<{ definition: FabricOntologyDefinition } | null>(
      `/workspaces/${encodeURIComponent(workspaceId)}/ontologies/${encodeURIComponent(ontologyId)}/getDefinition`,
      token,
      { method: 'POST' },
    );
    if (!result.data && result.operationId) {
      await pollOperation(result.operationId, token, 20, 3000);
      const opResult = await fabricFetch<{ definition: FabricOntologyDefinition }>(
        `/operations/${result.operationId}/result`,
        token,
      );
      return opResult.data?.definition?.parts ?? null;
    }
    return result.data?.definition?.parts ?? null;
  } catch {
    return null;
  }
}

/**
 * Find a Lakehouse in a workspace by partial name match.
 * Retries to handle eventual consistency after ontology creation.
 */
export async function findLakehouse(
  workspaceId: string,
  token: string,
  nameContains: string,
  maxRetries = 10,
  delayMs = 3000,
): Promise<{ id: string; displayName: string } | null> {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await fabricFetch<{ value: { id: string; displayName: string }[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/lakehouses`,
      token,
    );
    const lakehouses = data?.value ?? [];
    const match = lakehouses.find(l =>
      l.displayName.toLowerCase().includes(nameContains.toLowerCase()),
    );
    if (match) return match;
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

/**
 * Full push with sample data: create ontology → upload data → bind.
 *
 * Pipeline:
 * 1. Validate + convert ontology to Fabric definition
 * 2. Create ontology (schema only)
 * 3. Find auto-provisioned Lakehouse (Fabric creates one per ontology)
 * 4. Create temp plain Lakehouse (auto-provisioned one has schemas, Load Table doesn't work)
 * 5. Upload CSV → Load as Delta tables in temp LH
 * 6. Copy Delta files to auto-provisioned LH's Tables/dbo/ (Fabric auto-registers them)
 * 7. Delete temp LH (best-effort)
 * 8. Create data bindings referencing auto-provisioned LH
 */
export async function createOntologyWithData(
  workspaceId: string,
  fabricToken: string,
  oneLakeToken: string,
  ontology: Ontology,
  sampleTables: Map<string, import('../data/ontology').EntityInstance[]>,
  onProgress?: (progress: PollProgress) => void,
  onStatus?: (message: string) => void,
): Promise<FabricOntologyResponse> {
  // Step 1: Validate and convert
  validateForFabric(ontology);
  const conversion = convertToFabricParts(ontology);

  // Step 2: Create the ontology (schema only)
  onStatus?.('Creating ontology schema…');
  let displayName = sanitizeItemName(ontology.name);
  try {
    const existing = await listOntologies(workspaceId, fabricToken);
    const existingNames = new Set(existing.map(o => o.displayName));
    if (existingNames.has(displayName)) {
      let suffix = 2;
      while (existingNames.has(`${displayName}_${suffix}`)) suffix++;
      displayName = `${displayName}_${suffix}`.slice(0, 89);
    }
  } catch { /* proceed with original name */ }

  const body: CreateOntologyRequest = {
    displayName,
    description: (ontology.description ?? '').slice(0, 256),
    definition: conversion.definition,
  };

  const result = await fabricFetch<FabricOntologyResponse>(
    `/workspaces/${encodeURIComponent(workspaceId)}/ontologies`,
    fabricToken,
    { method: 'POST', body: JSON.stringify(body) },
  );

  if (result.operationId) {
    onProgress?.({ attempt: 0, maxAttempts: 60, status: 'Creating ontology…' });
    await pollOperation(result.operationId, fabricToken, 60, 3000, onProgress);
  }

  const ontologies = await listOntologies(workspaceId, fabricToken);
  const created = ontologies.find(o => o.displayName === displayName);
  if (!created) {
    throw new FabricApiError('Ontology created but not found in workspace', 404);
  }

  // Step 3: Find the auto-provisioned Lakehouse
  onStatus?.('Waiting for auto-provisioned Lakehouse…');
  const autoLh = await findLakehouse(workspaceId, fabricToken, created.id.replace(/-/g, ''));
  if (!autoLh) {
    onStatus?.('⚠ Could not find auto-provisioned Lakehouse — ontology created without sample data');
    return created;
  }

  // Step 4: Create a temporary plain Lakehouse for CSV→Delta conversion
  onStatus?.('Creating temporary Lakehouse…');
  const { createLakehouse, uploadEntityTable, copyDeltaTable, deleteLakehouse } = await import('./fabricLakehouse');
  const tmpLhName = `${displayName}_tmp`.slice(0, 89);
  let tmpLakehouse: { id: string; displayName: string };
  try {
    tmpLakehouse = await createLakehouse(workspaceId, fabricToken, tmpLhName, 'Temporary — CSV to Delta conversion');
  } catch (err) {
    console.warn('Failed to create temp Lakehouse:', err);
    onStatus?.('⚠ Could not create temp Lakehouse — ontology created without sample data');
    return created;
  }

  // Step 5: Upload sample data to temp LH and convert to Delta
  const tableEntries = Array.from(sampleTables.entries());
  const loadedTableNames: string[] = [];
  for (let i = 0; i < tableEntries.length; i++) {
    const [entityName, instances] = tableEntries[i];
    const tableName = sanitizeName(entityName);
    onStatus?.(`Uploading ${entityName} (${i + 1}/${tableEntries.length})…`);
    try {
      await uploadEntityTable(workspaceId, tmpLakehouse.id, oneLakeToken, tableName, instances, fabricToken);
      loadedTableNames.push(tableName);
    } catch (err) {
      console.warn(`Failed to upload table ${tableName}:`, err);
    }
  }

  if (loadedTableNames.length === 0 && tableEntries.length > 0) {
    onStatus?.('⚠ All table uploads failed — ontology created without sample data');
    return created;
  }

  // Step 6: Copy Delta files from temp LH to auto-provisioned LH
  onStatus?.('Copying tables to ontology Lakehouse…');
  const boundTableNames: string[] = [];
  for (const tableName of loadedTableNames) {
    try {
      await copyDeltaTable(workspaceId, tmpLakehouse.id, autoLh.id, tableName, oneLakeToken);
      boundTableNames.push(tableName);
    } catch (err) {
      console.warn(`Failed to copy ${tableName}:`, err);
    }
  }

  // Step 6b: Delete temp Lakehouse (best-effort)
  onStatus?.('Cleaning up temporary Lakehouse…');
  const deleted = await deleteLakehouse(workspaceId, tmpLakehouse.id, fabricToken);
  if (!deleted) {
    console.warn(`Could not delete temp Lakehouse ${tmpLhName} — manual cleanup needed`);
  }

  if (boundTableNames.length === 0) {
    onStatus?.('⚠ Could not copy tables — ontology created without data bindings');
    return created;
  }

  // Step 7: Create data bindings for successfully copied tables
  if (boundTableNames.length < loadedTableNames.length) {
    onStatus?.(`Linked ${boundTableNames.length}/${loadedTableNames.length} tables. Creating data bindings…`);
  } else {
    onStatus?.('Creating data bindings…');
  }

  const boundTableSet = new Set(boundTableNames);
  const bindingParts = generateDataBindingParts(ontology, {
    workspaceId,
    lakehouseId: autoLh.id,
    entityIdMap: conversion.entityIdMap,
    propertyIdMap: conversion.propertyIdMap,
    entityNameMap: conversion.entityNameMap,
  }).filter(part => {
    const payload = JSON.parse(atob(part.payload));
    const tableName = payload?.dataBindingConfiguration?.sourceTableProperties?.sourceTableName;
    return !tableName || boundTableSet.has(tableName);
  });

  if (bindingParts.length > 0) {
    // Fetch current definition from Fabric (it adds $schema fields after creation)
    const currentDefParts = await getDefinition(workspaceId, created.id, fabricToken);
    const defParts = currentDefParts ?? conversion.definition.parts;
    const fullDefinition: FabricOntologyDefinition = {
      parts: [...defParts, ...bindingParts],
    };

    const updateResult = await fabricFetch<void>(
      `/workspaces/${encodeURIComponent(workspaceId)}/ontologies/${encodeURIComponent(created.id)}/updateDefinition?updateMetadata=true`,
      fabricToken,
      { method: 'POST', body: JSON.stringify({ definition: fullDefinition }) },
    );

    if (updateResult.operationId) {
      onStatus?.('Applying data bindings…');
      await pollOperation(updateResult.operationId, fabricToken, 60, 3000, onProgress);
    }
  }

  onStatus?.('✓ Ontology ready with sample data');
  return created;
}
