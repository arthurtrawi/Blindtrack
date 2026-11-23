/**
 * Últimas atualizações da OS, com as mensagens padronizadas que o backend gera para o
 * cliente (nunca a descrição interna do histórico). Mais recentes primeiro.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Vazio } from '@/components/ui/EstadoCarregamento';
import { formatarDataHora } from '@/utils/formatacao';

const LIMITE_INICIAL = 5;

export function AtualizacoesPortal({ itens }: { itens: readonly { data: string; mensagem: string }[] }) {
  const [todas, setTodas] = useState(false);
  const ordenados = [...itens].sort((a, b) => b.data.localeCompare(a.data));
  const visiveis = todas ? ordenados : ordenados.slice(0, LIMITE_INICIAL);

  return (
    <Card titulo="Atualizações">
      {ordenados.length === 0 ? (
        <Vazio titulo="Nenhuma atualização ainda" />
      ) : (
        <>
          <ol className="space-y-3">
            {visiveis.map((item, indice) => (
              <li key={`${item.data}-${indice}`} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-700" aria-hidden="true" />
                <div>
                  <p className="text-slate-900">{item.mensagem}</p>
                  <p className="text-xs text-slate-600 tabular-nums">{formatarDataHora(item.data)}</p>
                </div>
              </li>
            ))}
          </ol>
          {ordenados.length > LIMITE_INICIAL && (
            <button
              type="button"
              onClick={() => setTodas((v) => !v)}
              aria-expanded={todas}
              className="mt-4 text-sm font-medium text-blue-700 hover:underline"
            >
              {todas ? 'Mostrar menos' : `Ver todas (${ordenados.length})`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
