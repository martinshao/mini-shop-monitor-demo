export function getPageUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

export function isSameUrl(requestUrl: string, targetUrl: string) {
  try {
    return new URL(requestUrl, window.location.href).href ===
      new URL(targetUrl, window.location.href).href;
  } catch {
    return requestUrl === targetUrl;
  }
}
