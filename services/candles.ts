import type { Candle } from '@/components/Chart';
import { apiGet } from './apiClient';

// Expected backend response shape (adjust to your API):
// [ [timestamp(seconds or ms), open, high, low, close, volume?], ... ]
// or an object { candles: [...] }

export interface FetchCandlesParams {
  symbol: string;               // e.g. 'XAUUSD'
  range?: string;               // '1D','1W', etc. (optional to hint backend aggregation)
  limit?: number;               // max candles
}

export async function fetchCandles({ symbol, range, limit = 500 }: FetchCandlesParams): Promise<Candle[]> {
  // Adjust path & query keys to match your backend.
  const data = await apiGet<any>({ path: '/candles', query: { symbol, range, limit } });
  const raw = Array.isArray(data) ? data : Array.isArray(data?.candles) ? data.candles : [];
  return raw.map((row: any) => normalizeRow(row)).filter(Boolean) as Candle[];
}

function normalizeRow(row: any): Candle | null {
  if (!row) return null;
  // Accept array form
  if (Array.isArray(row)) {
    const [t,o,h,l,c,v] = row;
    if (t==null||o==null||h==null||l==null||c==null) return null;
    const ts = t > 2_000_000_000 ? Math.floor(t/1000) : t; // convert ms to s
    return { time: ts, open: +o, high: +h, low: +l, close: +c, volume: v!=null? +v: undefined };
  }
  // Object form
  const t = row.time ?? row.t;
  if (t==null) return null;
  const ts = t > 2_000_000_000 ? Math.floor(t/1000) : t;
  return {
    time: ts,
    open: +(row.open ?? row.o),
    high: +(row.high ?? row.h),
    low: +(row.low ?? row.l),
    close: +(row.close ?? row.c),
    volume: row.volume != null ? +row.volume : row.v != null ? +row.v : undefined
  };
}
