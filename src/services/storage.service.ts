/**
 * Armazenamento de arquivos em disco local (ADR-12).
 * Os services dependem só destas funções; trocar para S3/MinIO não afeta o restante.
 *
 * Segurança:
 * - o nome em disco é gerado (UUID), nunca vem do usuário: sem path traversal;
 * - o tipo é conferido pelo CONTEÚDO (assinatura binária), não pela extensão nem pelo MIME
 *   declarado pelo cliente;
 * - os arquivos ficam fora de qualquer diretório servido estaticamente.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { BusinessRuleError, NotFoundError } from '../utils/app-error.js';

interface TipoPermitido {
  mime: string;
  extensao: string;
  assinatura: number[];
}

/** Tipos aceitos (RNF22) e seus "magic numbers". */
const TIPOS_PERMITIDOS: TipoPermitido[] = [
  { mime: 'application/pdf', extensao: 'pdf', assinatura: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: 'image/png', extensao: 'png', assinatura: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', extensao: 'jpg', assinatura: [0xff, 0xd8, 0xff] },
];

const diretorioBase = (): string => path.resolve(env.UPLOAD_DIR);

export function detectarTipo(conteudo: Buffer): TipoPermitido | null {
  return TIPOS_PERMITIDOS.find((t) => t.assinatura.every((byte, i) => conteudo[i] === byte)) ?? null;
}

export interface ArquivoSalvo {
  chave: string;
  mimeType: string;
  tamanhoBytes: number;
  hashSha256: string;
}

export async function salvarArquivo(conteudo: Buffer): Promise<ArquivoSalvo> {
  if (conteudo.length === 0) throw new BusinessRuleError('Arquivo vazio', 'ARQUIVO_INVALIDO');
  const tipo = detectarTipo(conteudo);
  if (!tipo) {
    throw new BusinessRuleError('Tipo de arquivo não permitido. Envie PDF, PNG ou JPEG.', 'ARQUIVO_INVALIDO');
  }

  const agora = new Date();
  const subpasta = `${agora.getUTCFullYear()}/${String(agora.getUTCMonth() + 1).padStart(2, '0')}`;
  const chave = `${subpasta}/${randomUUID()}.${tipo.extensao}`;
  const destino = path.join(diretorioBase(), chave);

  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, conteudo, { flag: 'wx', mode: 0o600 });

  return {
    chave,
    mimeType: tipo.mime,
    tamanhoBytes: conteudo.length,
    hashSha256: createHash('sha256').update(conteudo).digest('hex'),
  };
}

/** Caminho absoluto de uma chave, garantindo que fica dentro do diretório base. */
export function caminhoAbsoluto(chave: string): string {
  const base = diretorioBase();
  const absoluto = path.resolve(base, chave);
  if (!absoluto.startsWith(base + path.sep)) throw new NotFoundError('Arquivo');
  return absoluto;
}

/** Remoção compensatória: usada só quando a gravação no banco falha após salvar o arquivo. */
export async function removerArquivo(chave: string): Promise<void> {
  await rm(caminhoAbsoluto(chave), { force: true });
}
