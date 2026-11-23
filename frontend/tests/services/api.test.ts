/**
 * Cliente HTTP central (src/services/api.ts). O `fetch` é substituído por um dublê:
 * estes testes verificam o que o cliente ENVIA e como INTERPRETA as respostas.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  api,
  ApiError,
  definirOuvinteSessaoExpirada,
  ehCancelamento,
  montarUrl,
  nomeDoArquivo,
} from '@/services/api';

const BASE = 'http://api.teste/api/v1';

function respostaJson(corpo: unknown, status = 200, cabecalhos: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
  });
}

/** Argumentos da n-ésima chamada ao fetch (falha o teste se ela não existiu). */
function chamada(fetch: ReturnType<typeof vi.fn>, indice = 0): [string, RequestInit] {
  const args = fetch.mock.calls[indice];
  if (!args) throw new Error(`fetch não foi chamado ${indice + 1} vez(es)`);
  return args as [string, RequestInit];
}

function mockFetch(implementacao: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(implementacao);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('montarUrl', () => {
  it('junta a base, o caminho e só os parâmetros preenchidos', () => {
    expect(
      montarUrl('/ordens-servico', {
        status: 'ABERTA',
        page: 2,
        atrasada: true,
        placa: '',
        cliente: undefined,
      }),
    ).toBe(`${BASE}/ordens-servico?status=ABERTA&page=2&atrasada=true`);
  });
});

describe('requisições', () => {
  it('envia o cookie de sessão e o cabeçalho anti-CSRF em toda chamada', async () => {
    const fetch = mockFetch(async () => respostaJson({ data: { ok: true } }));

    await api.post('/clientes', { nome: 'Maria' });

    const [url, init] = chamada(fetch);
    expect(url).toBe(`${BASE}/clientes`);
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'X-Requested-With': 'BlindTrack',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    expect(init.body).toBe(JSON.stringify({ nome: 'Maria' }));
    // O token nunca é enviado pelo JavaScript: a sessão vai no cookie HttpOnly.
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('não define Content-Type em upload (o navegador inclui o boundary)', async () => {
    const fetch = mockFetch(async () => respostaJson({ data: {} }, 201));
    const formulario = new FormData();
    formulario.append('nome', 'Contrato');

    await api.enviarFormulario('/ordens-servico/1/documentos', formulario);

    const [, init] = chamada(fetch);
    expect(init.body).toBe(formulario);
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('trata 204 e corpo vazio como sucesso sem dados', async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    await expect(api.post('/auth/logout')).resolves.toBeUndefined();
  });

  it('converte o erro padronizado da API em ApiError, com erros por campo', async () => {
    mockFetch(async () =>
      respostaJson(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados de entrada inválidos',
            details: [{ campo: 'cpfCnpj', mensagem: 'CPF/CNPJ inválido' }],
            requestId: 'req-123',
          },
        },
        400,
      ),
    );

    const erro = await api.post('/clientes', {}).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', requestId: 'req-123' });
    expect((erro as ApiError).errosDeCampo).toEqual([{ campo: 'cpfCnpj', mensagem: 'CPF/CNPJ inválido' }]);
  });

  it('preserva o código da regra de negócio (422)', async () => {
    mockFetch(async () =>
      respostaJson({ error: { code: 'RN09', message: 'Etapas anteriores ainda não foram concluídas' } }, 422),
    );
    await expect(api.patch('/etapas/1/status', { acao: 'INICIAR' })).rejects.toMatchObject({
      status: 422,
      code: 'RN09',
      message: 'Etapas anteriores ainda não foram concluídas',
    });
  });

  it('erro sem corpo JSON vira mensagem genérica com o status', async () => {
    mockFetch(async () => new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(api.get('/clientes')).rejects.toMatchObject({ status: 502, code: 'ERRO' });
  });

  it('falha de rede vira ApiError REDE com mensagem compreensível', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(api.get('/clientes')).rejects.toMatchObject({
      code: 'REDE',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    });
  });

  it('timeout aborta a requisição e vira ApiError TIMEOUT', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new DOMException('aborted', 'AbortError')));
        }),
    );
    await expect(api.get('/clientes', { timeoutMs: 20 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('cancelamento por quem chamou não vira erro de rede', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new DOMException('aborted', 'AbortError')));
        }),
    );
    const controlador = new AbortController();
    const promessa = api.get('/clientes', { signal: controlador.signal });
    controlador.abort();

    const erro = await promessa.catch((e: unknown) => e);
    expect(ehCancelamento(erro)).toBe(true);
  });

  it('status declarado como aceito (503 do /health) não é tratado como erro', async () => {
    mockFetch(async () => respostaJson({ status: 'degraded', database: 'down' }, 503));
    await expect(api.get('/health', { statusAceitos: [503] })).resolves.toMatchObject({ database: 'down' });
  });
});

describe('sessão expirada', () => {
  it('401 avisa o ouvinte; chamadas com ignorar401 não avisam', async () => {
    const ouvinte = vi.fn();
    definirOuvinteSessaoExpirada(ouvinte);
    mockFetch(async () => respostaJson({ error: { code: 'UNAUTHORIZED', message: 'Token expirado' } }, 401));

    await expect(api.get('/ordens-servico')).rejects.toMatchObject({ status: 401 });
    expect(ouvinte).toHaveBeenCalledTimes(1);

    await expect(api.get('/auth/me', { ignorar401: true })).rejects.toMatchObject({ status: 401 });
    expect(ouvinte).toHaveBeenCalledTimes(1);

    definirOuvinteSessaoExpirada(null);
  });
});

describe('download', () => {
  it('lê o nome do arquivo de Content-Disposition (inclusive UTF-8)', () => {
    expect(nomeDoArquivo(`attachment; filename="contrato.pdf"`, 'x')).toBe('contrato.pdf');
    expect(
      nomeDoArquivo(`attachment; filename="c.pdf"; filename*=UTF-8''declara%C3%A7%C3%A3o.pdf`, 'x'),
    ).toBe('declaração.pdf');
    expect(nomeDoArquivo(null, 'documento')).toBe('documento');
  });

  it('baixa como Blob, com o cookie de sessão', async () => {
    const fetch = mockFetch(
      async () =>
        new Response('%PDF-1.4', {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="termo.pdf"',
          },
        }),
    );

    const arquivo = await api.baixar('/cliente/documentos/1/arquivo');
    expect(arquivo.nomeArquivo).toBe('termo.pdf');
    expect(await arquivo.blob.text()).toBe('%PDF-1.4');
    expect(chamada(fetch)[1].credentials).toBe('include');
  });
});
