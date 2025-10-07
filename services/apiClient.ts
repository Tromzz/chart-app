// Simple API client wrapper with timeout & JSON parsing.
// Replace API_BASE_URL with your backend endpoint. You can also move this to env/config.

const API_BASE_URL = 'https://YOUR_API_BASE_URL'; // TODO: set real base URL

export interface ApiRequestOptions {
  path: string;
  query?: Record<string, any>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiGet<T>({ path, query = {}, signal, timeoutMs = 15000 }: ApiRequestOptions): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : API_BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, ''));
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.append(k, String(v));
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const compositeSignal = mergeSignals(signal, controller.signal);
  try {
    const res = await fetch(url.toString(), { method: 'GET', signal: compositeSignal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const ctrl = new AbortController();
  const forward = (sig: AbortSignal) => sig.addEventListener('abort', () => ctrl.abort(), { once: true });
  forward(a); forward(b);
  return ctrl.signal;
}
