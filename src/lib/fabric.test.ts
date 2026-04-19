import { describe, it, expect } from 'vitest';
import { convertToFabricParts, validateForFabric, FabricValidationError } from './fabric';
import type { Ontology } from '../data/ontology';

function decode(base64: string): unknown {
  const json = atob(base64);
  return JSON.parse(json);
}

const minimalOntology: Ontology = {
  name: 'Test Ontology',
  description: 'A test ontology',
  entityTypes: [
    {
      id: 'customer',
      name: 'Customer',
      description: 'A customer entity',
      icon: '👤',
      color: '#0078D4',
      properties: [
        { name: 'customerId', type: 'string', isIdentifier: true },
        { name: 'email', type: 'string' },
        { name: 'age', type: 'integer' },
      ],
    },
    {
      id: 'order',
      name: 'Order',
      description: 'An order',
      icon: '🧾',
      color: '#107C10',
      properties: [
        { name: 'orderId', type: 'string', isIdentifier: true },
        { name: 'total', type: 'decimal' },
        { name: 'timestamp', type: 'datetime' },
        { name: 'paid', type: 'boolean' },
      ],
    },
  ],
  relationships: [
    {
      id: 'customer-order',
      name: 'places',
      from: 'customer',
      to: 'order',
      cardinality: 'one-to-many',
    },
  ],
};

describe('convertToFabricParts', () => {
  it('produces .platform and definition.json parts', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const paths = definition.parts.map(p => p.path);

    expect(paths).toContain('.platform');
    expect(paths).toContain('definition.json');
  });

  it('creates entity type parts for each entity', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    expect(entityParts).toHaveLength(2);
    entityParts.forEach(part => {
      expect(part.path).toMatch(/^EntityTypes\/\d+\/definition\.json$/);
      expect(part.payloadType).toBe('InlineBase64');
    });
  });

  it('creates relationship type parts', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const relParts = definition.parts.filter(p => p.path.startsWith('RelationshipTypes/'));

    expect(relParts).toHaveLength(1);
    relParts.forEach(part => {
      expect(part.path).toMatch(/^RelationshipTypes\/\d+\/definition\.json$/);
    });
  });

  it('maps entity properties with correct value types', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    const customerPart = entityParts.find(p => {
      const decoded = decode(p.payload) as { name: string };
      return decoded.name === 'Customer';
    });

    expect(customerPart).toBeDefined();
    const customer = decode(customerPart!.payload) as {
      namespace: string;
      namespaceType: string;
      visibility: string;
      properties: Array<{ name: string; valueType: string }>;
    };

    expect(customer.namespace).toBe('usertypes');
    expect(customer.namespaceType).toBe('Custom');
    expect(customer.visibility).toBe('Visible');
    expect(customer.properties).toHaveLength(3);

    const propTypes = Object.fromEntries(customer.properties.map(p => [p.name, p.valueType]));
    expect(propTypes['customerId']).toBe('String');
    expect(propTypes['email']).toBe('String');
    expect(propTypes['age']).toBe('BigInt');
  });

  it('maps Order properties with correct types', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    const orderPart = entityParts.find(p => {
      const decoded = decode(p.payload) as { name: string };
      return decoded.name === 'Order';
    });

    const order = decode(orderPart!.payload) as {
      properties: Array<{ name: string; valueType: string }>;
    };

    const propTypes = Object.fromEntries(order.properties.map(p => [p.name, p.valueType]));
    expect(propTypes['total']).toBe('Double');
    expect(propTypes['timestamp']).toBe('DateTime');
    expect(propTypes['paid']).toBe('Boolean');
  });

  it('sets entityIdParts from isIdentifier property', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    const customerPart = entityParts.find(p => {
      const decoded = decode(p.payload) as { name: string };
      return decoded.name === 'Customer';
    });

    const customer = decode(customerPart!.payload) as {
      entityIdParts: string[];
      displayNamePropertyId: string | null;
      properties: Array<{ id: string; name: string }>;
    };

    const customerIdProp = customer.properties.find(p => p.name === 'customerId');
    expect(customer.entityIdParts).toEqual([customerIdProp!.id]);
    // displayNamePropertyId should be set to the identifier property's ID (per Fabric spec)
    expect(customer.displayNamePropertyId).toBe(customerIdProp!.id);
  });

  it('resolves relationship source/target to fabric entity IDs', () => {
    const { definition, entityIdMap } = convertToFabricParts(minimalOntology);
    const relPart = definition.parts.find(p => p.path.startsWith('RelationshipTypes/'));

    const rel = decode(relPart!.payload) as {
      name: string;
      source: { entityTypeId: string };
      target: { entityTypeId: string };
    };

    expect(rel.name).toBe('places');
    expect(rel.source.entityTypeId).toBe(entityIdMap.get('customer'));
    expect(rel.target.entityTypeId).toBe(entityIdMap.get('order'));
  });

  it('throws for relationships referencing unknown entities', () => {
    const ontologyWithBadRel: Ontology = {
      ...minimalOntology,
      relationships: [
        ...minimalOntology.relationships,
        {
          id: 'broken',
          name: 'broken_rel',
          from: 'customer',
          to: 'nonexistent',
          cardinality: 'one-to-one',
        },
      ],
    };

    expect(() => convertToFabricParts(ontologyWithBadRel)).toThrow(/nonexistent/);
  });

  it('generates unique numeric IDs', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    const ids = entityParts.map(p => {
      const match = p.path.match(/EntityTypes\/(\d+)\//);
      return match?.[1];
    });

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^\d+$/));
  });

  it('sanitizes names with special characters', () => {
    const ontology: Ontology = {
      name: 'My Fancy Ontology!',
      description: 'test',
      entityTypes: [
        {
          id: 'entity-1',
          name: 'Coffee Shop (NYC)',
          description: 'test',
          icon: '☕',
          color: '#000',
          properties: [
            { name: 'shop id', type: 'string', isIdentifier: true },
          ],
        },
      ],
      relationships: [],
    };

    const { definition } = convertToFabricParts(ontology);
    const entityPart = definition.parts.find(p => p.path.startsWith('EntityTypes/'));
    const entity = decode(entityPart!.payload) as { name: string; properties: Array<{ name: string }> };

    expect(entity.name).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
    expect(entity.properties[0].name).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
  });

  it('platform part contains correct metadata with $schema', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const platformPart = definition.parts.find(p => p.path === '.platform');
    expect(platformPart).toBeDefined();

    const platform = decode(platformPart!.payload) as {
      $schema: string;
      metadata: { type: string; displayName: string };
      config: { version: string; logicalId: string };
    };

    expect(platform.$schema).toContain('platformProperties');
    expect(platform.metadata.type).toBe('Ontology');
    expect(platform.metadata.displayName).toBe('Test_Ontology');
    expect(platform.config.version).toBe('2.0');
  });

  it('definition.json part is empty object', () => {
    const { definition } = convertToFabricParts(minimalOntology);
    const defPart = definition.parts.find(p => p.path === 'definition.json');

    const defContent = decode(defPart!.payload);
    expect(defContent).toEqual({});
  });

  it('injects synthetic Id property for entities with no properties', () => {
    const ontology: Ontology = {
      name: 'Empty',
      description: '',
      entityTypes: [
        {
          id: 'e1',
          name: 'EmptyEntity',
          description: '',
          icon: '📦',
          color: '#000',
          properties: [],
        },
      ],
      relationships: [],
    };

    const { definition } = convertToFabricParts(ontology);
    const entityPart = definition.parts.find(p => p.path.startsWith('EntityTypes/'));
    const entity = decode(entityPart!.payload) as {
      properties: { name: string; valueType: string }[];
      entityIdParts: string[];
      displayNamePropertyId: string | null;
    };

    // Entities with no properties get a synthetic "Id" property so Fabric can import them
    expect(entity.properties).toHaveLength(1);
    expect(entity.properties[0].name).toBe('Id');
    expect(entity.properties[0].valueType).toBe('String');
    expect(entity.entityIdParts).toHaveLength(1);
    expect(entity.displayNamePropertyId).toBe(entity.entityIdParts[0]);
  });

  it('disambiguates cross-entity property name conflicts with different types', () => {
    const ontology: Ontology = {
      name: 'ConflictTest',
      description: '',
      entityTypes: [
        {
          id: 'a', name: 'Policy', description: '', icon: '📦', color: '#000',
          properties: [
            { name: 'id', type: 'string', isIdentifier: true },
            { name: 'severity', type: 'string' },  // String
          ],
        },
        {
          id: 'b', name: 'Failure', description: '', icon: '📦', color: '#000',
          properties: [
            { name: 'id', type: 'string', isIdentifier: true },
            { name: 'severity', type: 'integer' },  // BigInt — conflicts!
          ],
        },
      ],
      relationships: [],
    };

    const { definition } = convertToFabricParts(ontology);
    const entityParts = definition.parts.filter(p => p.path.startsWith('EntityTypes/'));

    const policyPart = entityParts.find(p => {
      const d = decode(p.payload) as { name: string };
      return d.name === 'Policy';
    });
    const failurePart = entityParts.find(p => {
      const d = decode(p.payload) as { name: string };
      return d.name === 'Failure';
    });

    const policySeverity = (decode(policyPart!.payload) as { properties: { name: string }[] }).properties.find(p => p.name.startsWith('severity'));
    const failureSeverity = (decode(failurePart!.payload) as { properties: { name: string }[] }).properties.find(p => p.name.startsWith('severity'));

    expect(policySeverity).toBeDefined();
    expect(failureSeverity).toBeDefined();
    expect(policySeverity!.name).not.toBe(failureSeverity!.name);
    expect(policySeverity!.name).toBe('severity_Policy');
    expect(failureSeverity!.name).toBe('severity_Failure');
  });

  it('disambiguates duplicate relationship names by appending source entity name', () => {
    const ontology: Ontology = {
      name: 'RelDupTest',
      description: '',
      entityTypes: [
        { id: 'policy', name: 'MaintenancePolicy', description: '', icon: '📦', color: '#000', properties: [{ name: 'id', type: 'string', isIdentifier: true }] },
        { id: 'bulletin', name: 'OEMBulletin', description: '', icon: '📦', color: '#000', properties: [{ name: 'id', type: 'string', isIdentifier: true }] },
        { id: 'gen', name: 'Generator', description: '', icon: '📦', color: '#000', properties: [{ name: 'id', type: 'string', isIdentifier: true }] },
      ],
      relationships: [
        { id: 'r1', name: 'applies_to', from: 'policy', to: 'gen', cardinality: 'one-to-many' },
        { id: 'r2', name: 'applies_to', from: 'bulletin', to: 'gen', cardinality: 'one-to-many' },
      ],
    };

    const { definition } = convertToFabricParts(ontology);
    const relParts = definition.parts.filter(p => p.path.startsWith('RelationshipTypes/'));
    expect(relParts).toHaveLength(2);

    const relNames = relParts.map(p => (decode(p.payload) as { name: string }).name);
    expect(relNames).toContain('applies_to_MaintenancePolicy');
    expect(relNames).toContain('applies_to_OEMBulletin');
    expect(new Set(relNames).size).toBe(2);
  });

  it('returns propertyIdMap and entityNameMap in ConversionResult', () => {
    const { propertyIdMap, entityNameMap } = convertToFabricParts(minimalOntology);

    expect(entityNameMap.get('customer')).toBe('Customer');
    expect(entityNameMap.get('order')).toBe('Order');

    const customerProps = propertyIdMap.get('customer');
    expect(customerProps).toBeDefined();
    expect(customerProps!.has('customerId')).toBe(true);
    expect(customerProps!.has('email')).toBe(true);
    expect(customerProps!.has('age')).toBe(true);
  });
});

describe('validateForFabric', () => {
  const validOntology: Ontology = {
    name: 'Valid',
    description: '',
    entityTypes: [
      { id: 'a', name: 'Alpha', description: '', icon: '📦', color: '#000', properties: [{ name: 'Id', type: 'string', isIdentifier: true }] },
      { id: 'b', name: 'Beta', description: '', icon: '📦', color: '#000', properties: [{ name: 'Id', type: 'string', isIdentifier: true }] },
    ],
    relationships: [{ id: 'r1', name: 'links', from: 'a', to: 'b', cardinality: 'one-to-many' }],
  };

  it('passes for valid ontology', () => {
    expect(() => validateForFabric(validOntology)).not.toThrow();
  });

  it('detects duplicate entity names after sanitization', () => {
    const dup: Ontology = {
      ...validOntology,
      entityTypes: [
        { id: 'a', name: 'Wind Turbine', description: '', icon: '📦', color: '#000', properties: [] },
        { id: 'b', name: 'Wind-Turbine', description: '', icon: '📦', color: '#000', properties: [] },
      ],
      relationships: [],
    };
    expect(() => validateForFabric(dup)).toThrow(/collision/i);
  });

  it('detects duplicate property names after sanitization', () => {
    const dup: Ontology = {
      ...validOntology,
      entityTypes: [
        {
          id: 'a', name: 'Thing', description: '', icon: '📦', color: '#000',
          properties: [
            { name: 'my prop', type: 'string' },
            { name: 'my-prop', type: 'string' },
          ],
        },
      ],
      relationships: [],
    };
    expect(() => validateForFabric(dup)).toThrow(/collision/i);
  });

  it('detects unresolved relationship refs', () => {
    const bad: Ontology = {
      ...validOntology,
      relationships: [{ id: 'r1', name: 'broken', from: 'a', to: 'missing', cardinality: 'one-to-many' }],
    };
    expect(() => validateForFabric(bad)).toThrow(/unknown/i);
  });

  it('allows duplicate relationship names (auto-disambiguated by convertToFabricParts)', () => {
    const dup: Ontology = {
      ...validOntology,
      relationships: [
        { id: 'r1', name: 'has items', from: 'a', to: 'b', cardinality: 'one-to-many' },
        { id: 'r2', name: 'has-items', from: 'a', to: 'b', cardinality: 'one-to-many' },
      ],
    };
    expect(() => validateForFabric(dup)).not.toThrow();
  });

  it('detects duplicate entity IDs', () => {
    const dup: Ontology = {
      ...validOntology,
      entityTypes: [
        { id: 'same', name: 'Alpha', description: '', icon: '📦', color: '#000', properties: [] },
        { id: 'same', name: 'Beta', description: '', icon: '📦', color: '#000', properties: [] },
      ],
      relationships: [],
    };
    expect(() => validateForFabric(dup)).toThrow(/Duplicate entity ID/i);
  });

  it('throws FabricValidationError (not FabricApiError)', () => {
    const bad: Ontology = {
      ...validOntology,
      relationships: [{ id: 'r1', name: 'broken', from: 'a', to: 'missing', cardinality: 'one-to-many' }],
    };
    expect(() => validateForFabric(bad)).toThrow(FabricValidationError);
  });
});
