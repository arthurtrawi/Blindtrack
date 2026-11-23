/**
 * Documentos liberados ao cliente. O download usa o endpoint autorizado do portal com o
 * cookie de sessão (fetch → Blob): nenhum caminho interno nem credencial aparece na URL.
 */
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Vazio } from '@/components/ui/EstadoCarregamento';
import { ApiError, salvarArquivo } from '@/services/api';
import { baixarDocumento } from '@/services/portal.service';
import type { DocumentoPortal } from '@/types/portal';
import { formatarData } from '@/utils/formatacao';
import { ROTULO_TIPO_DOCUMENTO } from '@/utils/status';

export function DocumentosPortal({ documentos }: { documentos: readonly DocumentoPortal[] }) {
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar(documento: DocumentoPortal) {
    setErro(null);
    setBaixando(documento.id);
    try {
      salvarArquivo(await baixarDocumento(documento.id));
    } catch (falha) {
      setErro(
        falha instanceof ApiError
          ? `Não foi possível baixar "${documento.nome}": ${falha.message}`
          : `Não foi possível baixar "${documento.nome}".`,
      );
    } finally {
      setBaixando(null);
    }
  }

  return (
    <Card titulo="Documentos">
      {erro && (
        <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      {documentos.length === 0 ? (
        <Vazio titulo="Nenhum documento disponível">
          <p className="text-sm">Os documentos liberados pela empresa aparecerão aqui.</p>
        </Vazio>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documentos.map((documento) => (
            <li key={documento.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <FileText className="size-5 shrink-0 text-slate-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{documento.nome}</p>
                <p className="text-xs text-slate-600">
                  {ROTULO_TIPO_DOCUMENTO[documento.tipo]} · Disponível desde{' '}
                  {formatarData(documento.createdAt)}
                </p>
              </div>
              <Button
                variante="secondary"
                tamanho="sm"
                carregando={baixando === documento.id}
                onClick={() => baixar(documento)}
                aria-label={`Baixar ${documento.nome}`}
              >
                {baixando !== documento.id && <Download className="size-4" aria-hidden="true" />}
                <span className="hidden sm:inline">Baixar</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
