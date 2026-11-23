/**
 * Executado uma vez antes de toda a suíte (Vitest globalSetup).
 * Aplica as migrations no banco de TESTES, para que o schema dos testes seja sempre o
 * mesmo das migrations versionadas. Se o banco estiver fora do ar, avisa e segue: os
 * testes que dependem dele se marcam como ignorados.
 */
import { execSync } from 'node:child_process';
import 'dotenv/config';

export default function setup(): void {
  const urlTeste = process.env['TEST_DATABASE_URL'];
  if (!urlTeste) {
    throw new Error('TEST_DATABASE_URL não definida no .env');
  }
  if (urlTeste === process.env['DATABASE_URL']) {
    throw new Error('TEST_DATABASE_URL não pode ser igual a DATABASE_URL');
  }

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: urlTeste },
      stdio: 'pipe',
    });
  } catch (erro) {
    const saida = erro instanceof Error && 'stderr' in erro ? String(erro.stderr) : String(erro);
    console.warn(`\n⚠ Não foi possível aplicar migrations no banco de testes:\n${saida.slice(0, 500)}`);
  }
}
