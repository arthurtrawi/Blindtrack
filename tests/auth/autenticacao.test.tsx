/**
 * Fase 3: login, logout, recuperação de sessão, rotas protegidas, perfis e sessão expirada.
 */
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { api } from '@/services/api';
import {
  chamadas,
  erroApi,
  instalarApiFalsa,
  json,
  renderizarApp,
  semSessao,
  usuarioDe,
} from '../helpers/api-falsa';

async function preencherLogin(email: string, senha: string) {
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByLabelText('E-mail'), email);
  await usuario.type(screen.getByLabelText('Senha'), senha);
  await usuario.click(screen.getByRole('button', { name: /entrar/i }));
  return usuario;
}

const respostaLogin = (perfil: Parameters<typeof usuarioDe>[0]) =>
  json({ data: { tipo: 'Cookie', expiraEm: '2026-12-01T10:00:00Z', usuario: usuarioDe(perfil) } });

describe('Login', () => {
  it('cliente entra e vai para o portal; credenciais são enviadas uma única vez', async () => {
    const fetch = instalarApiFalsa({
      'GET /auth/me': semSessao,
      'POST /auth/login': ({ corpo }) => {
        expect(corpo).toEqual({ email: 'cliente@exemplo.example', senha: 'SenhaForte123' });
        return respostaLogin('CLIENTE');
      },
    });
    renderizarApp('/login');

    await preencherLogin('cliente@exemplo.example', 'SenhaForte123');

    expect(await screen.findByRole('heading', { name: 'Olá, Maria!' })).toBeInTheDocument();
    expect(screen.getByText('Portal do cliente')).toBeInTheDocument();
    expect(chamadas(fetch, 'POST /auth/login')).toBe(1);
  });

  it('perfil interno entra e vai para o painel', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao, 'POST /auth/login': () => respostaLogin('GESTOR') });
    renderizarApp('/login');

    await preencherLogin('gestor@exemplo.example', 'SenhaForte123');

    expect(await screen.findByText('Painel administrativo')).toBeInTheDocument();
    expect(screen.getByText('Gestor', { selector: 'strong' })).toBeInTheDocument();
  });

  it('valida os campos antes de chamar a API', async () => {
    const fetch = instalarApiFalsa({ 'GET /auth/me': semSessao });
    renderizarApp('/login');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Informe o e-mail')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(chamadas(fetch, 'POST /auth/login')).toBe(0);
  });

  it.each([
    [401, 'UNAUTHORIZED', 'E-mail ou senha inválidos'],
    [429, 'TOO_MANY_REQUESTS', 'Muitas tentativas de login. Tente novamente em 15 minutos.'],
  ])('mostra a mensagem da API para HTTP %i', async (status, code, mensagem) => {
    instalarApiFalsa({
      'GET /auth/me': semSessao,
      'POST /auth/login': () => erroApi(status, code, mensagem),
    });
    renderizarApp('/login');

    await preencherLogin('alguem@exemplo.example', 'qualquer');

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument(); // continua no login
  });

  it('falha de rede mostra mensagem compreensível', async () => {
    instalarApiFalsa({
      'GET /auth/me': semSessao,
      'POST /auth/login': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderizarApp('/login');

    await preencherLogin('alguem@exemplo.example', 'qualquer');

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor');
  });

  it('botão de mostrar senha alterna o tipo do campo e é acessível', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao });
    renderizarApp('/login');
    const usuario = userEvent.setup();

    const senha = await screen.findByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');
    await usuario.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(senha).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a senha não é gravada no navegador', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao, 'POST /auth/login': () => respostaLogin('CLIENTE') });
    renderizarApp('/login');

    await preencherLogin('cliente@exemplo.example', 'SenhaSecreta987');
    await screen.findByText('Portal do cliente');

    const armazenado =
      JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie;
    expect(armazenado).not.toContain('SenhaSecreta987');
  });
});

describe('Recuperação de sessão e rotas protegidas', () => {
  it('com cookie válido, abre direto a área do perfil sem pedir login', async () => {
    instalarApiFalsa({ 'GET /auth/me': () => json({ data: usuarioDe('TECNICO') }) });
    renderizarApp('/');

    expect(await screen.findByText('Painel administrativo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('sem sessão, rota protegida leva ao login e, após entrar, volta ao destino', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao, 'POST /auth/login': () => respostaLogin('CLIENTE') });
    renderizarApp('/portal');

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    await preencherLogin('cliente@exemplo.example', 'SenhaForte123');

    expect(await screen.findByText('Portal do cliente')).toBeInTheDocument();
  });

  it('destino de outra área não é respeitado: cliente vindo de /painel vai para o portal', async () => {
    instalarApiFalsa({ 'GET /auth/me': semSessao, 'POST /auth/login': () => respostaLogin('CLIENTE') });
    renderizarApp('/painel');

    await preencherLogin('cliente@exemplo.example', 'SenhaForte123');

    expect(await screen.findByText('Portal do cliente')).toBeInTheDocument();
  });

  it.each([
    ['CLIENTE', '/painel'],
    ['GESTOR', '/portal'],
    ['TECNICO', '/portal'],
  ] as const)('perfil %s em %s recebe "Acesso negado"', async (perfil, rota) => {
    instalarApiFalsa({ 'GET /auth/me': () => json({ data: usuarioDe(perfil) }) });
    renderizarApp(rota);

    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('usuário logado que abre /login vai para a sua área', async () => {
    instalarApiFalsa({ 'GET /auth/me': () => json({ data: usuarioDe('CLIENTE') }) });
    renderizarApp('/login');

    expect(await screen.findByText('Portal do cliente')).toBeInTheDocument();
  });
});

describe('Logout e sessão expirada', () => {
  it('Sair chama o backend (apaga o cookie) e volta ao login', async () => {
    const fetch = instalarApiFalsa({
      'GET /auth/me': () => json({ data: usuarioDe('GESTOR') }),
      'POST /auth/logout': () => new Response(null, { status: 204 }),
    });
    renderizarApp('/painel');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /sair/i }));

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(chamadas(fetch, 'POST /auth/logout')).toBe(1);
  });

  it('se o logout falhar na rede, a sessão local é encerrada mesmo assim', async () => {
    instalarApiFalsa({
      'GET /auth/me': () => json({ data: usuarioDe('GESTOR') }),
      'POST /auth/logout': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderizarApp('/painel');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /sair/i }));

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });

  it('um 401 em qualquer chamada encerra a sessão e o login avisa que ela expirou', async () => {
    instalarApiFalsa({
      'GET /auth/me': () => json({ data: usuarioDe('GESTOR') }),
      'GET /ordens-servico': () => erroApi(401, 'UNAUTHORIZED', 'Token expirado'),
    });
    renderizarApp('/painel');
    await screen.findByText('Painel administrativo');

    // Simula uma tela qualquer fazendo uma chamada depois que o token expirou.
    await act(async () => {
      await api.get('/ordens-servico').catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou'));
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });
});
