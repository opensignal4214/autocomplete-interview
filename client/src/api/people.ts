export interface Person {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  avatarColor: string;
}

export interface SearchResponse {
  items: Person[];
  total: number;
  nextOffset: number | null;
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

export async function searchPeople(
  query: string,
  { limit = 10, offset = 0, signal }: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/people?${params}`, { signal });

  // fetch() only rejects on network errors. A 500 is still a "successful" fetch.
  if (!res.ok) {
    throw new HttpError(res.status, `Search failed (${res.status})`);
  }

  // Trade-off: in production I'd validate this at the boundary (e.g. zod) instead of trusting a cast.
  return (await res.json()) as SearchResponse;
}
