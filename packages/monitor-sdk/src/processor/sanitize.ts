const SENSITIVE_KEYS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "accessToken",
  "refreshToken"
];

export function sanitizeData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : value
    ])
  );
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEYS.some(
    (sensitiveKey) => sensitiveKey.toLowerCase() === key.toLowerCase()
  );
}
