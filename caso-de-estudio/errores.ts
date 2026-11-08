/// <reference lib="dom" />
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { exportarTokens } from '../src/nucleo/exportadores.js';
import { carpetaMarca } from '../src/nucleo/rutas.js';
import { esPrincipal } from '../src/nucleo/principal.js';

/**
 * Registro de errores para casos de estudio del portafolio.
 *   npm run error -- --fase=3 --titulo="..." --salida="texto del error" --causa="..." --solucion="..." --aprendizaje="..."
 *   (o --archivo=ruta.txt, o el texto del error por stdin)
 *   npm run error -- --regenerar      vuelve a dibujar todas las capturas y registro.md
 * Cada entrada queda en errores/registro.json, con su captura en errores/<id>.png.
 */
export interface Entrada {
  id: string;
  fecha: string;
  fase: string;
  titulo: string;
  salida: string;
  causa: string;
  solucion: string;
  aprendizaje: string;
}

const DIR = resolve(import.meta.dirname, 'errores');
const REGISTRO = join(DIR, 'registro.json');
mkdirSync(DIR, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const leerRegistro = (): Entrada[] => (existsSync(REGISTRO) ? JSON.parse(readFileSync(REGISTRO, 'utf8')) : []);
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function fuentes(): string {
  const f = join(carpetaMarca(), 'assets', 'fuentes');
  const face = (n: string, p: number, a: string) => `@font-face{font-family:"${n}";font-weight:${p};src:url("file://${f}/${a}.woff2") format("woff2")}`;
  return [face('Bricolage Grotesque', 800, 'bricolage-grotesque-latin-800-normal'), ...[400, 600, 700].map((p) => face('Instrument Sans', p, `instrument-sans-latin-${p}-normal`)), face('JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal')].join('');
}

function tarjeta(e: Entrada): string {
  const enLinea = (t: string) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');
  const linea = (rotulo: string, texto: string) => (texto ? `<div class="fila"><p class="rotulo">${rotulo}</p><p>${enLinea(texto)}</p></div>` : '');
  return `<!doctype html><meta charset="utf-8"><style>${exportarTokens('css').contenido}${fuentes()}
    *{box-sizing:border-box}body{margin:0;background:var(--color-fondo);padding:var(--spacing-xl);font:var(--text-base)/var(--text-base--line-height) "Instrument Sans",system-ui,sans-serif;color:var(--color-texto);width:1200px}
    .meta{display:flex;justify-content:space-between;margin:0 0 var(--spacing-md);font:700 var(--text-xs)/var(--text-xs--line-height) "Instrument Sans";letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-azul)}
    h1{margin:0 0 var(--spacing-lg);font:800 var(--text-3xl)/var(--text-3xl--line-height) "Bricolage Grotesque";letter-spacing:var(--tracking-titulo);color:var(--color-tinta)}
    pre{margin:0 0 var(--spacing-lg);background:var(--color-tinta);color:var(--color-oscuro-texto);padding:var(--spacing-lg);border-radius:var(--radius-md);font:var(--text-sm)/1.55 var(--font-codigo);white-space:pre-wrap;word-break:break-word}
    pre::before{content:"salida";display:block;margin-bottom:var(--spacing-md);font:700 var(--text-xs) "Instrument Sans";letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-oscuro-acento)}
    .fila{display:grid;grid-template-columns:140px 1fr;gap:var(--spacing-md);padding:var(--spacing-md) 0;border-top:1px solid var(--color-linea)}
    .fila p{margin:0}.rotulo{font-weight:700;color:var(--color-tinta)}
    code{font-family:var(--font-codigo);font-size:var(--text-sm);background:var(--color-suave);color:var(--color-tinta);padding:1px 6px;border-radius:var(--radius-sm)}</style>
    <p class="meta"><span>Error · fase ${esc(e.fase)}</span><span>${esc(e.fecha)}</span></p>
    <h1>${esc(e.titulo)}</h1>
    <pre>${esc(e.salida.trim())}</pre>
    ${linea('Causa', e.causa)}${linea('Solución', e.solucion)}${linea('Aprendizaje', e.aprendizaje)}`;
}

async function dibujar(entradas: Entrada[]) {
  const nav = await chromium.launch();
  for (const e of entradas) {
    // Desde un archivo real (no about:blank) para que el navegador permita cargar las fuentes locales.
    const temporal = join(DIR, `.${e.id}.html`);
    writeFileSync(temporal, tarjeta(e));
    const p = await nav.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
    await p.goto(`file://${temporal}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: join(DIR, `${e.id}.png`), fullPage: true });
    await p.close();
    rmSync(temporal);
  }
  await nav.close();
  const md = [
    '# Registro de errores', '',
    'Errores reales del proyecto, con su captura, causa, solución y aprendizaje: material para casos de estudio del portafolio.',
    'Se agregan con `npm run error -- --titulo="…" --salida="…"` (ver `errores.ts`).', '',
    '| # | Fase | Error | Fecha |', '|---|---|---|---|',
    ...entradas.map((e, i) => `| ${i + 1} | ${e.fase} | [${e.titulo}](#${e.id}) | ${e.fecha} |`), '',
    ...entradas.flatMap((e) => [`## ${e.titulo} <a id="${e.id}"></a>`, '', `![${e.titulo}](errores/${e.id}.png)`, '', `- **Causa:** ${e.causa}`, `- **Solución:** ${e.solucion}`, `- **Aprendizaje:** ${e.aprendizaje}`, ''])
  ].join('\n');
  writeFileSync(join(import.meta.dirname, 'registro-de-errores.md'), md);
}

async function main() {
  const args = process.argv.slice(2);
  const v = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const registro = leerRegistro();
  if (!args.includes('--regenerar')) {
    const titulo = v('titulo');
    if (!titulo) throw new Error('Falta --titulo="…". Use --regenerar para redibujar todo.');
    const salida = v('salida') ?? (v('archivo') ? readFileSync(v('archivo')!, 'utf8') : process.stdin.isTTY ? '' : readFileSync(0, 'utf8'));
    const fecha = new Date().toISOString().slice(0, 10);
    registro.push({ id: `${fecha}-${slug(titulo)}`, fecha, fase: v('fase') ?? '—', titulo, salida, causa: v('causa') ?? '', solucion: v('solucion') ?? '', aprendizaje: v('aprendizaje') ?? '' });
    writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + '\n');
  }
  await dibujar(registro);
  console.log(`Registro: ${registro.length} error(es) → caso-de-estudio/registro-de-errores.md`);
}
if (esPrincipal(import.meta.url)) await main();
