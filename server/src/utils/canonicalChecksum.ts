import crypto from 'crypto';

/**
 * Duck-typed check for Decimal objects.
 */
function isDecimal(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  const name = val.constructor?.name;
  return name === 'Decimal' || (typeof val.toFixed === 'function' && typeof val.toNumber === 'function');
}

/**
 * Recursively canonicalizes a value by:
 * 1. Sorting object keys.
 * 2. Normalizing dates to ISO8601 UTC.
 * 3. Normalizing decimals/numbers to strings.
 * 4. Removing undefined properties.
 */
export function canonicalize(val: any): any {
  if (val === undefined) {
    return undefined;
  }
  if (val === null) {
    return null;
  }

  // Handle Date
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle Date string (regex check for ISO format)
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return new Date(val).toISOString();
  }

  // Handle Decimal or Number
  if (isDecimal(val)) {
    return val.toString();
  }
  if (typeof val === 'number') {
    return val.toString();
  }

  // Handle Array
  if (Array.isArray(val)) {
    return val.map(item => canonicalize(item));
  }

  // Handle Object
  if (typeof val === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      const canonicalVal = canonicalize(val[key]);
      if (canonicalVal !== undefined) {
        result[key] = canonicalVal;
      }
    }
    return result;
  }

  return val;
}

/**
 * Extracts and canonicalizes the rollback snapshot payload, then hashes it.
 * Excludes metadata (db primary keys, created_at/updated_at, version, checksums).
 */
export function generateCanonicalChecksum(value: any): string {
  const payload = {
    session_id: value.session_id,
    created_parts: value.created_parts,
    updated_parts: value.updated_parts,
    old_values: value.old_values,
    new_values: value.new_values,
    import_timestamp: value.import_timestamp,
    imported_by: value.imported_by
  };
  const canonicalJson = JSON.stringify(canonicalize(payload));
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

/**
 * Verifies a canonical checksum for version 1 (SHA256_CANONICAL_V1).
 * Throws UNSUPPORTED_CHECKSUM_VERSION for other versions.
 */
export function verifyCanonicalChecksum(value: any, checksum: string, version: number): boolean {
  if (version !== 1) {
    throw new Error('UNSUPPORTED_CHECKSUM_VERSION');
  }
  const computed = generateCanonicalChecksum(value);
  return computed === checksum;
}

export function generatePayloadHash(val: any): string {
  const canonicalJson = JSON.stringify(canonicalize(val));
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

