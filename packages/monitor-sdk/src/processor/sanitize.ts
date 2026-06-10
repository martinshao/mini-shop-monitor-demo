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
  // 第一阶段只做浅层字段脱敏；后续如果 data 嵌套变复杂，可在这里升级为递归脱敏。
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
