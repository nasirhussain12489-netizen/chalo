/**
 * Safe API request helper to prevent "Unexpected token 'T' is not valid JSON"
 * and eliminate [object Object] errors across the entire application.
 */

export function formatErrorMessage(err: unknown, fallback: string = 'Operation failed.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    if (err === '[object Object]') return fallback;
    return err;
  }
  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>;
    if (typeof anyErr.error === 'string') return anyErr.error;
    if (typeof anyErr.error?.message === 'string') return anyErr.error.message;
    if (typeof anyErr.message === 'string') return anyErr.message;
    if (typeof anyErr.details === 'string') return anyErr.details;
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}') return str;
    } catch {}
  }
  return fallback;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();
    let parsedData: any = null;

    if (
      contentType.includes('application/json') ||
      rawText.trim().startsWith('{') ||
      rawText.trim().startsWith('[')
    ) {
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        parsedData = null;
      }
    }

    if (!res.ok) {
      let errorMsg = `Server error (HTTP ${res.status})`;
      if (parsedData && typeof parsedData === 'object') {
        errorMsg = formatErrorMessage(parsedData, errorMsg);
      } else if (rawText) {
        if (rawText.includes('<html') || rawText.includes('The page could not be found')) {
          errorMsg = `Server endpoint not found or unavailable (HTTP ${res.status}).`;
        } else {
          errorMsg = rawText.slice(0, 150);
        }
      }
      return { ok: false, status: res.status, data: parsedData, error: errorMsg };
    }

    return { ok: true, status: res.status, data: parsedData as T, error: null };
  } catch (err: any) {
    const isJsonSyntax = err instanceof SyntaxError || err?.message?.includes('JSON');
    const msg = isJsonSyntax
      ? 'Received non-JSON response from server. Backend may be offline or misconfigured.'
      : formatErrorMessage(err, 'Network connection failed. Please check your internet connection.');
    return { ok: false, status: 0, data: null, error: msg };
  }
}
