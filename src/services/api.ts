/**
 * Cliente HTTP central. É o ÚNICO lugar da aplicação que chama `fetch`.
 *
 * - Base da URL vinda de VITE_API_URL.
 * - Sessão por cookie HttpOnly do backend: `credentials: 'include'` e o cabeçalho
 *   `X-Requested-With: BlindTrack`, exigido pelo backend para escritas via cookie (anti-CSRF).
 *   O token nunca passa pelo JavaScript.
 * - Timeout (padrão 20 s) e cancelamento externo (AbortSignal).
 * - Respostas vazias (204), JSON e erros padronizados da API → `ApiError`.
 * - 401 avisa o AuthContext (sessão expirada), salvo quando a chamada pede para ignorar.
 */
import type { CorpoErroApi, ErroCampo } from '@/types/api';

export const CABECALHO_APP = { 'X-Requested-With': 'BlindTrack' } as const;
const TIMEOUT_PADRAO_MS = 20_000;

/** Códigos de erro gerados no próprio cliente (o backend usa os demais). */
export type CodigoErroCliente = 'REDE' | 'TIMEOUT' | 'RESPOSTA_INVALIDA';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(mensagem: string, status: number, code: string, details?: unknown, requestId?: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Erros de validação 400 por campo (`details: [{ campo, mensagem }]`). */
  get errosDeCampo(): ErroCampo[] {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return [];
    return this.details.filter(
      (d): d is ErroCampo =>
        typeof d === 'object' && d !== null && typeof d.campo === 'string' && typeof d.mensagem === 'string',
    );
  }
}

export function ehCancelamento(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError';
}

// ----------------------------------------------------------------------------------------
// Sessão expirada: o AuthContext registra um ouvinte; o api.ts avisa em qualquer 401.
// ----------------------------------------------------------------------------------------
type OuvinteSessao = () => void;
let ouvinteSessaoExpirada: OuvinteSessao | null = null;

export function definirOuvinteSessaoExpirada(ouvinte: OuvinteSessao | null): void {
  ouvinteSessaoExpirada = ouvinte;
}

// ----------------------------------------------------------------------------------------

function urlBase(): string {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (!base) {
    throw new Error('VITE_API_URL não configurada. Copie .env.example para .env.');
  }
  return base.replace(/\/+$/, '');
}

export type ValorQuery = string | number | boolean | null | undefined;

export function montarUrl(caminho: string, query?: Record<string, ValorQuery>): string {
  const url = new URL(`${urlBase()}${caminho.startsWith('/') ? caminho : `/${caminho}`}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    // Parâmetros vazios são omitidos: o backend valida tipos e rejeitaria string vazia.
    if (valor === undefined || valor === null || valor === '') continue;
    url.searchParams.set(chave, String(valor));
  }
  return url.toString();
}

export interface OpcoesRequisicao {
  query?: Record<string, ValorQuery>;
  /** Corpo JSON. */
  corpo?: unknown;
  /** Corpo multipart (upload). Não defina Content-Type: o navegador inclui o boundary. */
  formulario?: FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Não dispara o aviso de sessão expirada em 401 (ex.: login e recuperação de sessão). */
  ignorar401?: boolean;
  /** Status fora de 2xx que fazem parte do contrato e NÃO são erro (ex.: 503 do /health). */
  statusAceitos?: readonly number[];
}

interface RespostaBruta {
  resposta: Response;
}

/** Combina o cancelamento externo com o timeout, sem depender de AbortSignal.any. */
function criarSinal(externo: AbortSignal | undefined, timeoutMs: number) {
  const controlador = new AbortController();
  let porTimeout = false;
  const temporizador = setTimeout(() => {
    porTimeout = true;
    controlador.abort();
  }, timeoutMs);
  const repassar = () => controlador.abort(externo?.reason);
  if (externo?.aborted) repassar();
  else externo?.addEventListener('abort', repassar, { once: true });

  return {
    sinal: controlador.signal,
    foiTimeout: () => porTimeout,
    limpar: () => {
      clearTimeout(temporizador);
      externo?.removeEventListener('abort', repassar);
    },
  };
}

async function erroDaResposta(resposta: Response): Promise<ApiError> {
  const requestId = resposta.headers.get('X-Request-Id') ?? undefined;
  try {
    const corpo = (await resposta.json()) as Partial<CorpoErroApi>;
    if (corpo.error?.message) {
      return new ApiError(
        corpo.error.message,
        resposta.status,
        corpo.error.code ?? 'ERRO',
        corpo.error.details,
        corpo.error.requestId ?? requestId,
      );
    }
  } catch {
    // Corpo ausente ou não-JSON (ex.: proxy): cai na mensagem genérica.
  }
  return new ApiError(
    `Erro inesperado do servidor (HTTP ${resposta.status})`,
    resposta.status,
    'ERRO',
    undefined,
    requestId,
  );
}

async function executar(
  metodo: string,
  caminho: string,
  opcoes: OpcoesRequisicao = {},
): Promise<RespostaBruta> {
  const cabecalhos: Record<string, string> = { Accept: 'application/json', ...CABECALHO_APP };
  let corpo: BodyInit | undefined;
  if (opcoes.formulario) {
    corpo = opcoes.formulario;
  } else if (opcoes.corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify(opcoes.corpo);
  }

  const controle = criarSinal(opcoes.signal, opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS);
  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, opcoes.query), {
      method: metodo,
      headers: cabecalhos,
      body: corpo,
      credentials: 'include',
      signal: controle.sinal,
    });
  } catch (erro) {
    if (controle.foiTimeout()) {
      throw new ApiError('O servidor demorou demais para responder. Tente novamente.', 0, 'TIMEOUT');
    }
    if (ehCancelamento(erro) || opcoes.signal?.aborted) throw erro; // cancelado por quem chamou
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0, 'REDE');
  } finally {
    controle.limpar();
  }

  if (!resposta.ok && !opcoes.statusAceitos?.includes(resposta.status)) {
    const erro = await erroDaResposta(resposta);
    if (resposta.status === 401 && !opcoes.ignorar401) ouvinteSessaoExpirada?.();
    throw erro;
  }
  return { resposta };
}

async function json<T>(metodo: string, caminho: string, opcoes?: OpcoesRequisicao): Promise<T> {
  const { resposta } = await executar(metodo, caminho, opcoes);
  // 204 / corpo vazio: não há o que interpretar.
  if (resposta.status === 204) return undefined as T;
  const texto = await resposta.text();
  if (!texto) return undefined as T;
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ApiError('Resposta inválida do servidor.', resposta.status, 'RESPOSTA_INVALIDA');
  }
}

/** Extrai o nome do arquivo de Content-Disposition (RFC 6266, com suporte a filename*). */
export function nomeDoArquivo(contentDisposition: string | null, padrao: string): string {
  if (!contentDisposition) return padrao;
  const estendido = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (estendido?.[1]) {
    try {
      return decodeURIComponent(estendido[1].trim());
    } catch {
      // segue para o nome simples
    }
  }
  const simples = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return simples?.[1]?.trim() || padrao;
}

export interface ArquivoBaixado {
  blob: Blob;
  nomeArquivo: string;
}

export const api = {
  get: <T>(caminho: string, opcoes?: OpcoesRequisicao) => json<T>('GET', caminho, opcoes),
  post: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesRequisicao) =>
    json<T>('POST', caminho, { ...opcoes, corpo }),
  patch: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesRequisicao) =>
    json<T>('PATCH', caminho, { ...opcoes, corpo }),
  delete: <T = undefined>(caminho: string, opcoes?: OpcoesRequisicao) => json<T>('DELETE', caminho, opcoes),
  enviarFormulario: <T>(caminho: string, formulario: FormData, opcoes?: OpcoesRequisicao) =>
    json<T>('POST', caminho, { ...opcoes, formulario, timeoutMs: opcoes?.timeoutMs ?? 60_000 }),

  /** Download autenticado (cookie): o arquivo vem como Blob, sem expor caminho nem credencial na URL. */
  async baixar(caminho: string, opcoes?: OpcoesRequisicao): Promise<ArquivoBaixado> {
    const { resposta } = await executar('GET', caminho, {
      ...opcoes,
      timeoutMs: opcoes?.timeoutMs ?? 60_000,
    });
    return {
      blob: await resposta.blob(),
      nomeArquivo: nomeDoArquivo(resposta.headers.get('Content-Disposition'), 'documento'),
    };
  },
};

/** Dispara o "salvar arquivo" do navegador para um Blob baixado. */
export function salvarArquivo({ blob, nomeArquivo }: ArquivoBaixado): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libera a memória depois que o navegador iniciou o download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
