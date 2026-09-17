export function createUuid(): string {
  const bytes = new Uint8Array(16);
  const crypto = (
    globalThis as unknown as {
      crypto: {getRandomValues<T extends ArrayBufferView>(values: T): T};
    }
  ).crypto;
  crypto.getRandomValues(bytes);
  // UUID v4 reserves these bits for its version and RFC 4122 variant.
  // eslint-disable-next-line no-bitwise
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // eslint-disable-next-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = [...bytes]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join('-');
}
