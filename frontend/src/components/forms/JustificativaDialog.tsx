/**
 * Confirmação de ação importante, com justificativa obrigatória quando o backend exige
 * (pausar, dispensar, reabrir, suspender, cancelar, replanejar: 5 a 1000 caracteres).
 * Variante "danger" para ações irreversíveis (ex.: cancelar OS).
 */
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/CamposFormulario';
import { Modal } from '@/components/ui/Modal';

const MINIMO = 5;
const MAXIMO = 1000;

interface JustificativaDialogProps {
  aberto: boolean;
  titulo: string;
  descricao?: ReactNode;
  rotuloConfirmar: string;
  exigeJustificativa: boolean;
  /** Mostra o campo de justificativa mesmo quando não é obrigatório. */
  justificativaOpcional?: boolean;
  /** Rótulo do campo de texto (ex.: "Solução", "Motivo"). Padrão: "Justificativa". */
  rotuloCampo?: string;
  perigo?: boolean;
  /** Campos extras antes da justificativa (ex.: nova data). */
  children?: ReactNode;
  aoCancelar: () => void;
  /** Rejeite a promessa para manter o diálogo aberto (ex.: erro da API). */
  aoConfirmar: (justificativa: string | undefined) => Promise<void>;
}

export function JustificativaDialog({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  exigeJustificativa,
  justificativaOpcional = false,
  rotuloCampo = 'Justificativa',
  perigo = false,
  children,
  aoCancelar,
  aoConfirmar,
}: JustificativaDialogProps) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    setTexto('');
    setErro(undefined);
    aoCancelar();
  }

  async function confirmar() {
    const justificativa = texto.trim();
    if (exigeJustificativa && justificativa.length < MINIMO) {
      setErro(`Informe: ${rotuloCampo.toLowerCase()} (mínimo de ${MINIMO} caracteres).`);
      return;
    }
    setEnviando(true);
    try {
      await aoConfirmar(justificativa || undefined);
      setTexto('');
      setErro(undefined);
    } catch {
      // O chamador já notificou o erro; o diálogo continua aberto para correção.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      aoFechar={fechar}
      bloqueado={enviando}
      acoes={
        <>
          <Button variante="secondary" onClick={fechar} disabled={enviando}>
            Voltar
          </Button>
          <Button variante={perigo ? 'danger' : 'primary'} onClick={confirmar} carregando={enviando}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {descricao && <div className="text-sm text-slate-700">{descricao}</div>}
        {children}
        {(exigeJustificativa || justificativaOpcional) && (
          <Textarea
            rotulo={exigeJustificativa ? rotuloCampo : `${rotuloCampo} (opcional)`}
            value={texto}
            maxLength={MAXIMO}
            onChange={(e) => {
              setTexto(e.target.value);
              if (erro) setErro(undefined);
            }}
            erro={erro}
            dica="Fica registrada no histórico da ordem de serviço."
          />
        )}
      </div>
    </Modal>
  );
}
