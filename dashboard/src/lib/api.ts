/**
 * Cliente HTTP para o backend Go publicado em https://meu-scraper-leads.onrender.com.
 *
 * O servidor expõe (sem autenticação):
 *   POST /api/v1/jobs               -> cria um job de scraping
 *   GET  /api/v1/jobs               -> lista jobs
 *   GET  /api/v1/jobs/{id}          -> status do job
 *   GET  /api/v1/jobs/{id}/download -> CSV com os resultados
 *
 * Por padrão usamos caminhos relativos (/api/...) que são redirecionados para o
 * backend via proxy do Vite (dev) ou rewrites da Vercel (produção), evitando
 * bloqueios de CORS. Se VITE_API_BASE_URL for definido, ele é usado diretamente.
 */

const ENV_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = ENV_BASE ? ENV_BASE.trim().replace(/\/+$/, '') : '';

// As rotas já são passadas com o prefixo /api (ex.: /api/v1/jobs). Sem base URL
// configurada usamos o caminho relativo como está, que é encaminhado para o
// backend pelo proxy do Vite (dev) ou pelos rewrites da Vercel (produção).
const apiUrl = (path: string): string =>
  API_BASE_URL ? `${API_BASE_URL}${path}` : path;

export type JobStatus = 'pending' | 'working' | 'ok' | 'failed';

export interface WebJobData {
  keywords: string[];
  lang: string;
  zoom: number;
  lat: string;
  lon: string;
  fast_mode: boolean;
  radius: number;
  depth: number;
  email: boolean;
  extra_reviews: boolean;
  max_time: number;
  proxies: string[] | null;
}

export interface WebJob {
  ID: string;
  Name: string;
  Date: string;
  Status: JobStatus;
  Data: WebJobData;
}

export interface CreateJobResponse {
  id: string;
}

export interface CreateJobOptions {
  name: string;
  keywords: string[];
  lang: string;
  zoom: number;
  depth: number;
  radius: number;
  maxTimeSeconds: number;
}

/**
 * Constrói a palavra-chave da busca combinando "[Categoria] em [Cidade]".
 * Isso ajuda o Google Maps a priorizar resultados no Brasil.
 */
export function buildSearchKeyword(category: string, city: string): string {
  const cat = category.trim();
  const cty = city.trim();
  if (cat && cty) return `${cat} em ${cty}`;
  return cat || cty;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init);

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return (await res.text()) as T;
  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    let message = `Erro de conexão (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body?.message || body?.error || message;
    } catch {
      // body não é JSON; mantém a mensagem padrão
    }
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  if (text.trim().startsWith('{')) {
    return JSON.parse(text) as T;
  }

  throw new Error(`Resposta inesperada do servidor (HTTP ${res.status})`);
}

/** Cria um job de scraping no backend. */
export function createSearchJob(opts: CreateJobOptions): Promise<CreateJobResponse> {
  return request<CreateJobResponse>('/api/v1/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      keywords: opts.keywords,
      lang: opts.lang,
      zoom: opts.zoom,
      lat: '0',
      lon: '0',
      fast_mode: false,
      radius: opts.radius,
      depth: opts.depth,
      email: false,
      extra_reviews: false,
      max_time: opts.maxTimeSeconds,
      proxies: [],
    }),
  });
}

/** Retorna o status de um job. */
export function getJobStatus(jobId: string): Promise<WebJob> {
  return request<WebJob>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
}

/** Baixa o CSV de resultados de um job já concluído (com retry). */
export async function downloadJobResults(jobId: string): Promise<string> {
  const url = `/api/v1/jobs/${encodeURIComponent(jobId)}/download`;
  const fullUrl = apiUrl(url);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Falha ao baixar resultados');
      await sleep(2000);
    }
  }
  throw lastError;
}

/** Lista os jobs mais recentes criados no backend. */
export function listJobs(): Promise<WebJob[]> {
  return request<WebJob[]>('/api/v1/jobs');
}

/**
 * Verifica se o backend está acessível. Qualquer resposta HTTP (mesmo 4xx/5xx)
 * indica que o servidor está ONLINE e respondendo; somente falha de rede/CORS
 * (TypeError) é tratada como offline.
 */
export async function checkApiStatus(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/v1/jobs'), { method: 'GET' });
    return res.status >= 100;
  } catch {
    return false;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acompanha um job até concluir (ok/failed) ou estourar o timeout.
 * onStatus é chamado a cada mudança/início de polling.
 */
export async function pollJob(
  jobId: string,
  onStatus: (status: JobStatus) => void,
  timeoutMs: number,
  intervalMs = 5000,
): Promise<WebJob> {
  const startedAt = Date.now();

  for (;;) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > timeoutMs) {
      throw new Error('Tempo limite de busca esgotado. Tente aumentar o tempo máximo ou reduzir a profundidade.');
    }

    const job = await getJobStatus(jobId);
    onStatus(job.Status);

    if (job.Status === 'ok' || job.Status === 'failed') return job;

    await sleep(intervalMs);
  }
}

/** Estado de uma busca iniciada a partir do formulário. */
export interface SearchState {
  state: 'idle' | 'running' | 'success' | 'error';
  keyword: string | null;
  jobId: string | null;
  status: JobStatus | null;
  resultCount: number;
  error: string | null;
}