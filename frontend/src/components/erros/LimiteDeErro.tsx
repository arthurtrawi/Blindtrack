/**
 * Limite de erro (Error Boundary): uma falha de renderização mostra uma tela de recuperação
 * em vez de uma tela em branco. Cobre também a falha ao baixar o código de uma página
 * (carregamento sob demanda) — típico depois de uma nova versão publicada: recarregar resolve.
 *
 * `chaveReinicio` (ex.: o caminho atual) limpa o erro ao navegar para outra tela.
 */
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  chaveReinicio?: string;
  /** Tela cheia (raiz da aplicação) ou dentro do layout (só a área de conteúdo). */
  telaCheia?: boolean;
}

interface Estado {
  erro: Error | null;
  chave?: string;
}

/** Erro de import() dinâmico: o arquivo da página não pôde ser baixado. */
function falhaAoCarregarCodigo(erro: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically/i.test(
    erro.message,
  );
}

export class LimiteDeErro extends Component<Props, Estado> {
  override state: Estado = { erro: null, chave: this.props.chaveReinicio };

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  static getDerivedStateFromProps(props: Props, estado: Estado): Partial<Estado> | null {
    // Navegou para outra tela: tenta renderizar de novo.
    if (props.chaveReinicio !== estado.chave) return { erro: null, chave: props.chaveReinicio };
    return null;
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    // Sem serviço de monitoramento no projeto: registra no console para diagnóstico.
    console.error('[BlindTrack] Erro de renderização', erro, info.componentStack);
  }

  override render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const codigo = falhaAoCarregarCodigo(erro);
    return (
      <div
        role="alert"
        className={`mx-auto flex max-w-md flex-col items-center justify-center gap-4 p-6 text-center ${
          this.props.telaCheia ? 'min-h-dvh' : 'py-16'
        }`}
      >
        <AlertTriangle className="size-10 text-amber-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-marinho-900">
          {codigo ? 'Não foi possível carregar esta tela' : 'Algo deu errado nesta tela'}
        </h1>
        <p className="text-sm text-slate-600">
          {codigo
            ? 'Verifique sua conexão. Se o sistema acabou de ser atualizado, recarregar a página resolve.'
            : 'Ocorreu um erro inesperado. Seus dados estão salvos no servidor; recarregue a página para continuar.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-marinho-900 px-4 py-2 text-sm font-medium text-white hover:bg-marinho-800"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Recarregar a página
        </button>
      </div>
    );
  }
}
