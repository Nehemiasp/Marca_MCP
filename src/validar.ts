import { leerTokensCrudos } from './nucleo/tokens.js';
import { validarTokens } from './nucleo/validador.js';

const informe = validarTokens(leerTokensCrudos());
for (const a of informe.avisos) console.warn(`aviso: ${a}`);
for (const e of informe.errores) console.error(`error: ${e}`);
if (informe.errores.length > 0) {
  console.error(`\nmarca/tokens.json no es válido (${informe.errores.length} error(es)).`);
  process.exit(1);
}
console.log(`marca/tokens.json es válido: ${informe.tokens} tokens, ${informe.pares} pares de contraste verificados.`);
