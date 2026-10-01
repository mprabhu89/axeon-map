export type ApprovedObjectKind = 'work-order' | 'service-request' | 'incident' | 'asset' | 'custom';
export type ObjectFieldType = 'identifier' | 'text' | 'number' | 'date' | 'status' | 'priority';

export interface ObjectProfileField {
  readonly id: string;
  readonly label: string;
  readonly type: ObjectFieldType;
  readonly exploreBy?: boolean;
  readonly filterable?: boolean;
  readonly previewable?: boolean;
}

export interface ObjectProfileRelationship {
  readonly id: string;
  readonly targetObjectId: string;
  readonly label: string;
}

export interface ObjectProfile {
  readonly id: string;
  readonly kind: ApprovedObjectKind;
  readonly displayName: string;
  readonly applicationId: string;
  readonly primaryIdentifierField: string;
  readonly fields: readonly ObjectProfileField[];
  readonly explorationFieldIds: readonly string[];
  readonly filterFieldIds: readonly string[];
  readonly previewFieldIds: readonly string[];
  readonly relationships: readonly ObjectProfileRelationship[];
  readonly analyticalCapabilities: readonly string[];
  readonly authorizationPolicyReference: string;
}

const identifier = /^[a-z][a-z0-9-]{1,63}$/;
const fieldIdentifier = /^[a-z][a-z0-9-]{0,63}$/;
const forbiddenProfileKeys = new Set(['sql', 'query', 'table', 'endpoint', 'connectionString', 'credential', 'secret']);
const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Object profile must be an object.');
  return value as Record<string, unknown>;
};

function validateNoImplementationDetails(value: unknown): void {
  const record = asRecord(value);
  for (const key of Object.keys(record)) {
    if (forbiddenProfileKeys.has(key)) throw new Error(`Object profile must not contain ${key}.`);
  }
}

function validateProfile(profile: ObjectProfile): ObjectProfile {
  validateNoImplementationDetails(profile);
  if (!identifier.test(profile.id) || !identifier.test(profile.applicationId) || !fieldIdentifier.test(profile.primaryIdentifierField)) throw new Error('Object profile identifiers are invalid.');
  if (!profile.displayName.trim() || !profile.authorizationPolicyReference.trim()) throw new Error('Object profile display and authorization references are required.');
  const fields = new Map<string, ObjectProfileField>();
  for (const field of profile.fields) {
    if (!fieldIdentifier.test(field.id) || !field.label.trim() || fields.has(field.id)) throw new Error('Object profile fields must be unique and valid.');
    fields.set(field.id, field);
  }
  if (!fields.has(profile.primaryIdentifierField)) throw new Error('Object profile primary identifier must be an approved field.');
  for (const fieldId of [...profile.explorationFieldIds, ...profile.filterFieldIds, ...profile.previewFieldIds]) {
    if (!fields.has(fieldId)) throw new Error('Object profile references an unapproved field.');
  }
  for (const relationship of profile.relationships) {
    if (!identifier.test(relationship.id) || !identifier.test(relationship.targetObjectId) || !relationship.label.trim()) throw new Error('Object profile relationship is invalid.');
  }
  return Object.freeze({
    ...profile,
    fields: Object.freeze(profile.fields.map((field) => Object.freeze({ ...field }))),
    explorationFieldIds: Object.freeze([...profile.explorationFieldIds]),
    filterFieldIds: Object.freeze([...profile.filterFieldIds]),
    previewFieldIds: Object.freeze([...profile.previewFieldIds]),
    relationships: Object.freeze(profile.relationships.map((relationship) => Object.freeze({ ...relationship }))),
    analyticalCapabilities: Object.freeze([...profile.analyticalCapabilities]),
  });
}

export interface ObjectProfileRegistry {
  list(): readonly ObjectProfile[];
  get(id: string): ObjectProfile | undefined;
}

export function createObjectProfileRegistry(profiles: readonly ObjectProfile[]): ObjectProfileRegistry {
  const entries = new Map<string, ObjectProfile>();
  for (const profile of profiles) {
    const validated = validateProfile(profile);
    if (entries.has(validated.id)) throw new Error('Object profile IDs must be unique.');
    entries.set(validated.id, validated);
  }
  const values = Object.freeze([...entries.values()]);
  return Object.freeze({ list: () => values, get: (id: string) => entries.get(id) });
}

const basicFields = (identifierField: string): readonly ObjectProfileField[] => [
  { id: identifierField, label: 'Identifier', type: 'identifier', previewable: true },
  { id: 'status', label: 'Status', type: 'status', exploreBy: true, filterable: true, previewable: true },
  { id: 'site', label: 'Site', type: 'text', exploreBy: true, filterable: true, previewable: true },
];

/** Approved server-owned profile examples. They contain mapping metadata, never query text or permissions. */
export const DEFAULT_OBJECT_PROFILE_REGISTRY = createObjectProfileRegistry([
  { id: 'work-orders', kind: 'work-order', displayName: 'Work Orders', applicationId: 'work-order-tracking', primaryIdentifierField: 'work-order-id', fields: basicFields('work-order-id'), explorationFieldIds: ['site', 'status'], filterFieldIds: ['site', 'status'], previewFieldIds: ['work-order-id', 'site', 'status'], relationships: [], analyticalCapabilities: ['work-management'], authorizationPolicyReference: 'maximo-work-order' },
  { id: 'service-requests', kind: 'service-request', displayName: 'Service Requests', applicationId: 'service-requests', primaryIdentifierField: 'service-request-id', fields: basicFields('service-request-id'), explorationFieldIds: ['site', 'status'], filterFieldIds: ['site', 'status'], previewFieldIds: ['service-request-id', 'site', 'status'], relationships: [], analyticalCapabilities: [], authorizationPolicyReference: 'maximo-service-request' },
  { id: 'incidents', kind: 'incident', displayName: 'Incidents', applicationId: 'incidents', primaryIdentifierField: 'incident-id', fields: basicFields('incident-id'), explorationFieldIds: ['site', 'status'], filterFieldIds: ['site', 'status'], previewFieldIds: ['incident-id', 'site', 'status'], relationships: [], analyticalCapabilities: [], authorizationPolicyReference: 'maximo-incident' },
  { id: 'assets', kind: 'asset', displayName: 'Assets', applicationId: 'assets', primaryIdentifierField: 'asset-id', fields: basicFields('asset-id'), explorationFieldIds: ['site', 'status'], filterFieldIds: ['site', 'status'], previewFieldIds: ['asset-id', 'site', 'status'], relationships: [], analyticalCapabilities: ['reliability'], authorizationPolicyReference: 'maximo-asset' },
]);
