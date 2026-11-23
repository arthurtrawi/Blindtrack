/** Formatação de datas (pt-BR, fuso do navegador) e de dados exibidos ao usuário. */
import { format } from 'date-fns/format';
import { isValid } from 'date-fns/isValid';
import { parseISO } from 'date-fns/parseISO';
import { ptBR } from 'date-fns/locale/pt-BR';

function comoData(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null;
  const data = typeof valor === 'string' ? parseISO(valor) : valor;
  return isValid(data) ? data : null;
}

/** 23/12/2026 */
export function formatarData(valor: string | Date | null | undefined): string {
  const data = comoData(valor);
  return data ? format(data, 'dd/MM/yyyy', { locale: ptBR }) : '—';
}

/** 23/12/2026 às 14:30 */
export function formatarDataHora(valor: string | Date | null | undefined): string {
  const data = comoData(valor);
  return data ? format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';
}

/** 23 de dez. (rótulos curtos na timeline) */
export function formatarDataCurta(valor: string | Date | null | undefined): string {
  const data = comoData(valor);
  return data ? format(data, "dd 'de' MMM", { locale: ptBR }) : '—';
}

/** A data já passou em relação a "agora"? (datas inválidas ou ausentes: não) */
export function dataVencida(valor: string | null | undefined, agora: Date = new Date()): boolean {
  const data = comoData(valor);
  return data !== null && data.getTime() < agora.getTime();
}

/**
 * Exposição controlada da placa: mostra 3 primeiros e 2 últimos caracteres.
 * BRA2E19 → BRA••19 | ABC1234 → ABC••34
 */
export function mascararPlaca(placa: string): string {
  if (placa.length <= 5) return placa;
  return `${placa.slice(0, 3)}${'•'.repeat(placa.length - 5)}${placa.slice(-2)}`;
}

/** Placa legível: ABC1234 → ABC-1234; Mercosul (ABC1D23) fica sem hífen. */
export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/**
 * Data de um <input type="date"> (aaaa-mm-dd, fuso do navegador) → ISO 8601 com fuso,
 * como o backend exige. O horário padrão de 18:00 representa "até o fim do expediente".
 */
export function dataParaIso(dataLocal: string, hora = '18:00'): string {
  return new Date(`${dataLocal}T${hora}:00`).toISOString();
}

/** ISO → aaaa-mm-dd no fuso do navegador (valor de <input type="date">). */
export function isoParaData(iso: string | null | undefined): string {
  const data = comoData(iso);
  return data ? format(data, 'yyyy-MM-dd') : '';
}

/** Data de hoje (aaaa-mm-dd), útil como `min` de inputs de previsão. */
export function hojeLocal(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** "1 dia", "2 dias", "0 registros". */
export function plural(quantidade: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${quantidade} ${Math.abs(quantidade) === 1 ? singular : pluralTexto}`;
}
