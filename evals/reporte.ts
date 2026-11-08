import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metricas } from './medir.js';
import { CONDICIONES, TAREAS, type Condicion } from './tareas.js';

export interface Traza {
  costoUsd?: number;
  turnos?: number;
  duracionSeg?: number;
  herramientasDeMarca: string[];
  /** Solo en la variante con hook: veces que corrió y veces que devolvió errores al agente (código de salida 2). */
  hooks?: { disparos: number; bloqueos: number };
  respuesta?: string;
  error?: string;
}
export interface Resultado { tarea: string; condicion: Condicion; metricas: Metricas; traza: Traza }

export const CARPETA_EVALS = join(import.meta.dirname);
export const CARPETA_SALIDAS = join(CARPETA_EVALS, 'salidas');

export function leerResultados(): Resultado[] {
  const r: Resultado[] = [];
  for (const t of TAREAS) {
    for (const c of CONDICIONES) {
      const dir = join(CARPETA_SALIDAS, c, t.id);
      const m = join(dir, 'metricas.json');
      if (!existsSync(m)) continue;
      const traza = existsSync(join(dir, 'traza.json')) ? (JSON.parse(readFileSync(join(dir, 'traza.json'), 'utf8')) as Traza) : { herramientasDeMarca: [] };
      r.push({ tarea: t.id, condicion: c, metricas: JSON.parse(readFileSync(m, 'utf8')) as Metricas, traza });
    }
  }
  return r;
}

// ───────────── Plantilla de calificación (1 a 5) ─────────────
const ARCHIVO_CALIFICACIONES = join(CARPETA_EVALS, 'calificaciones.md');

export function asegurarPlantillaDeCalificacion(): void {
  if (existsSync(ARCHIVO_CALIFICACIONES)) return; // nunca pisa lo que usted ya llenó
  const filas = TAREAS.map(
    (t) =>
      `| ${t.titulo} (\`${t.id}\`) | ![sin](salidas/sin/${t.id}/captura.png) | ![con](salidas/con/${t.id}/captura.png) |  |  |  |`
  );
  writeFileSync(
    ARCHIVO_CALIFICACIONES,
    [
      '# Calificación visual',
      '',
      'Califique de **1 a 5** qué tanto se parece cada resultado a su marca (1 = nada, 5 = idéntico a lo que usted habría hecho).',
      'Escriba solo el número en las columnas «Nota». Al correr `npm run evals` se promedian en `reporte.md`.',
      '',
      '| Tarea | Sin servidor | Con servidor | Nota sin (1–5) | Nota con (1–5) | Comentarios |',
      '|---|---|---|:---:|:---:|---|',
      ...filas,
      ''
    ].join('\n')
  );
}

export interface Calificacion { tarea: string; sin?: number; con?: number }

export function leerCalificaciones(): Calificacion[] {
  if (!existsSync(ARCHIVO_CALIFICACIONES)) return [];
  const salida: Calificacion[] = [];
  for (const linea of readFileSync(ARCHIVO_CALIFICACIONES, 'utf8').split('\n')) {
    const celdas = linea.split('|').map((c) => c.trim());
    const id = /`([a-z0-9-]+)`/.exec(celdas[1] ?? '')?.[1];
    if (!id) continue;
    const nota = (c: string | undefined) => {
      const n = Number(c);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
    };
    salida.push({ tarea: id, sin: nota(celdas[4]), con: nota(celdas[5]) });
  }
  return salida;
}

// ───────────── Reporte ─────────────
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const media = (xs: number[]) => (xs.length ? suma(xs) / xs.length : NaN);
const f1 = (n: number) => (Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : '—');
const usd = (n: number | undefined) => (n === undefined ? '—' : `$${n.toFixed(2)}`);

const METRICAS: { clave: keyof Metricas; nombre: string }[] = [
  { clave: 'codigoErrores', nombre: 'Valores fuera de los tokens en el código (`auditar_codigo`, errores)' },
  { clave: 'coloresFueraDePaleta', nombre: 'Colores renderizados fuera de la paleta' },
  { clave: 'fuentesAjenas', nombre: 'Fuentes ajenas a la marca (renderizadas)' },
  { clave: 'fallosContraste', nombre: 'Textos que no llegan a AA de contraste' },
  { clave: 'vozErrores', nombre: 'Fallos de voz (`revisar_texto`, errores)' },
  { clave: 'vozAvisos', nombre: 'Avisos de voz (cifras por verificar, relleno)' }
];

/** Corridas de la condición «con servidor», en orden. La actual vive en salidas/; las otras se guardan aparte. */
const CORRIDAS_CON: { etiqueta: string; base: string; condicion: Condicion }[] = [
  { etiqueta: 'Con servidor · corrida 1 (skill original)', base: join(CARPETA_EVALS, 'historial', 'corrida-1-skill-original'), condicion: 'con' },
  { etiqueta: 'Con servidor · corrida 2 (skill reforzada)', base: CARPETA_SALIDAS, condicion: 'con' },
  { etiqueta: 'Con servidor · corrida 3 (skill reforzada + hook)', base: join(CARPETA_EVALS, 'variantes', 'hook'), condicion: 'con' },
  { etiqueta: 'Sin servidor · con hook', base: join(CARPETA_EVALS, 'variantes', 'hook-sin'), condicion: 'sin' },
  { etiqueta: 'Sin servidor (corrida principal)', base: CARPETA_SALIDAS, condicion: 'sin' }
];

export function generarReporte(resultados: Resultado[]): string {
  const por = (c: Condicion) => resultados.filter((r) => r.condicion === c);
  const sin = por('sin');
  const con = por('con');
  const cal = leerCalificaciones();
  const L: string[] = [];

  L.push('# Reporte de evaluación · ¿el servidor ayuda de verdad?', '');
  L.push(`Generado por \`npm run evals\` el ${new Date().toISOString().slice(0, 10)}. Tareas: ${TAREAS.length}; corridas medidas: ${resultados.length} (${sin.length} sin servidor, ${con.length} con servidor).`, '');
  L.push(
    '**Método.** Cada tarea se pide con el mismo texto en dos condiciones: **sin** servidor (agente sin acceso a la marca) y **con** servidor (servidor MCP `marca` conectado + skill `/marca`). ' +
      'Después, con las propias herramientas del servidor y un navegador, se mide lo que sale: valores fuera de los tokens, colores y fuentes realmente renderizados, contraste y voz. Menos es mejor en todas las métricas.',
    ''
  );

  // Totales: sin servidor, y con servidor en la corrida 1 (antes de cambiar la skill) y en la corrida 2 (la última)
  const c1 = leerCorrida(CORRIDAS_CON[0]!.base, 'con');
  const filasSin = sin.map((r) => ({ tarea: r.tarea, metricas: r.metricas, traza: r.traza }));
  const filasC2 = con.map((r) => ({ tarea: r.tarea, metricas: r.metricas, traza: r.traza }));
  const tSin = totalesDeCorrida(filasSin);
  const tC1 = totalesDeCorrida(c1.length ? c1 : filasC2);
  const tC2 = totalesDeCorrida(filasC2);
  L.push('## Resumen', '');
  L.push('«Con servidor» se midió dos veces: la **corrida 1** es la primera medición; en la **corrida 2** ya se había reforzado la skill. Más corridas y variantes en [Todas las corridas](#todas-las-corridas).', '');
  L.push('| Métrica (menos es mejor) | Sin servidor | Con servidor · corrida 1 | Con servidor · corrida 2 |', '|---|---:|---:|---:|');
  const filaResumen = (nombre: string, f: (t: ReturnType<typeof totalesDeCorrida>) => string | number) => L.push(`| ${nombre} | ${f(tSin)} | ${f(tC1)} | ${f(tC2)} |`);
  filaResumen('Valores fuera de los tokens en el código (`auditar_codigo`, errores)', (t) => t.codigo);
  filaResumen('Colores renderizados fuera de la paleta', (t) => t.colores);
  filaResumen('Fuentes ajenas a la marca (renderizadas)', (t) => t.fuentes);
  filaResumen('Textos que no llegan a AA de contraste', (t) => t.contraste);
  filaResumen('Fallos de voz (`revisar_texto`, errores)', (t) => t.voz);
  filaResumen('Avisos de voz (cifras por verificar, relleno)', (t) => suma(((t === tSin ? filasSin : t === tC1 ? (c1.length ? c1 : filasC2) : filasC2)).map((f) => f.metricas.vozAvisos)));
  filaResumen('**Tareas sin ningún hallazgo**', (t) => `${t.sinHallazgos} de ${t.tareas}`);
  filaResumen('Costo de las corridas (USD)', (t) => usd(t.costo));
  filaResumen('Turnos del agente (promedio)', (t) => f1(t.turnos));
  L.push('');

  // Corridas de la condición «con servidor»
  const corridas = CORRIDAS_CON.map((c) => ({ ...c, filas: leerCorrida(c.base, c.condicion) })).filter((c) => c.filas.length > 0);
  if (corridas.length > 1) {
    L.push('## Todas las corridas', '');
    L.push('Las condiciones se corrieron más de una vez para ver cuánto varía y si reforzar la skill o agregar un hook de verificación cambia algo. Todas se miden con el mismo auditor y las mismas métricas. El hook revisa cada archivo de diseño que el agente guarda y le devuelve los errores.', '');
    const ts = corridas.map((c) => totalesDeCorrida(c.filas));
    L.push(`| | ${corridas.map((c) => c.etiqueta).join(' | ')} |`, `|---|${corridas.map(() => '---:').join('|')}|`);
    const fila = (nombre: string, f: (t: ReturnType<typeof totalesDeCorrida>) => string | number) => L.push(`| ${nombre} | ${ts.map((t) => f(t)).join(' | ')} |`);
    fila('Valores fuera de los tokens (código)', (t) => t.codigo);
    fila('Colores renderizados fuera de la paleta', (t) => t.colores);
    fila('Fuentes ajenas', (t) => t.fuentes);
    fila('Textos bajo AA', (t) => t.contraste);
    fila('Fallos de voz', (t) => t.voz);
    fila('**Tareas sin ningún hallazgo**', (t) => `${t.sinHallazgos} de ${t.tareas}`);
    fila('Tareas donde el agente corrió `auditar_codigo`', (t) => `${t.usoRevision['auditar_codigo']} de ${t.tareas}`);
    fila('Tareas donde el agente corrió `revisar_contraste`', (t) => `${t.usoRevision['revisar_contraste']} de ${t.tareas}`);
    fila('Tareas donde el agente corrió `revisar_texto`', (t) => `${t.usoRevision['revisar_texto']} de ${t.tareas}`);
    if (ts.some((t) => t.hookDisparos > 0)) fila('Veces que el hook devolvió errores al agente (guardados bloqueados / guardados revisados)', (t) => (t.hookDisparos > 0 ? `${t.hookBloqueos} / ${t.hookDisparos}` : '—'));
    fila('Turnos (promedio)', (t) => f1(t.turnos));
    fila('Costo total (USD)', (t) => usd(t.costo));
    L.push('');
  }

  // Calificación visual
  const notasSin = cal.map((c) => c.sin).filter((n): n is number => n !== undefined);
  const notasCon = cal.map((c) => c.con).filter((n): n is number => n !== undefined);
  L.push('## Calificación visual (1 a 5, la llena usted)', '');
  if (notasSin.length + notasCon.length === 0) {
    L.push('Aún sin calificar. Llene [`calificaciones.md`](calificaciones.md) y vuelva a correr `npm run evals -- --solo-reporte`.', '');
  } else {
    L.push(`Promedio sin servidor: **${f1(media(notasSin))}** (${notasSin.length} notas). Promedio con servidor: **${f1(media(notasCon))}** (${notasCon.length} notas).`, '');
  }

  // Detalle
  L.push('## Detalle por tarea (última corrida de cada condición)', '');
  L.push('| Tarea | Condición | Código | Colores fuera | Fuentes ajenas | Contraste | Voz | Usó el servidor | Costo | Turnos |', '|---|---|---:|---:|---:|---:|---:|---|---:|---:|');
  for (const t of TAREAS) {
    for (const c of CONDICIONES) {
      const r = resultados.find((x) => x.tarea === t.id && x.condicion === c);
      if (!r) {
        L.push(`| ${t.titulo} | ${c} | — | — | — | — | — | — | — | — |`);
        continue;
      }
      const m = r.metricas;
      const llamadas = r.traza.herramientasDeMarca.length;
      L.push(`| ${t.titulo} | ${c} | ${m.codigoErrores} | ${m.coloresFueraDePaleta} | ${m.fuentesAjenas} | ${m.fallosContraste} | ${m.vozErrores} | ${c === 'con' ? `${llamadas} llamadas` : '—'} | ${usd(r.traza.costoUsd)} | ${r.traza.turnos ?? '—'} |`);
    }
  }
  L.push('');

  // Qué falló
  L.push('## Qué salió fuera de la marca', '');
  for (const t of TAREAS) {
    for (const c of CONDICIONES) {
      const r = resultados.find((x) => x.tarea === t.id && x.condicion === c);
      if (!r) continue;
      const m = r.metricas;
      const items: string[] = [];
      if (m.coloresFueraDePaleta) items.push(`colores: ${m.coloresFueraDePaletaLista.slice(0, 8).join(', ')}${m.coloresFueraDePaletaLista.length > 8 ? '…' : ''}`);
      if (m.fuentesAjenas) items.push(`fuentes: ${m.fuentesAjenasLista.join(', ')}`);
      if (m.vozDetalle.length) items.push(`voz: ${m.vozDetalle.slice(0, 5).join('; ')}`);
      if (m.degradados) items.push(`degradados: ${m.degradados}`);
      if (r.traza.error) items.push(`error de ejecución: ${r.traza.error}`);
      L.push(`- **${t.titulo} · ${c}:** ${items.length ? items.join(' · ') : 'sin hallazgos'}`);
    }
  }
  L.push('');

  // Conclusiones (a mano, si existen) y automáticas
  const conclusiones = join(CARPETA_EVALS, 'conclusiones.md');
  L.push('## Conclusiones', '');
  if (existsSync(conclusiones)) L.push(readFileSync(conclusiones, 'utf8').trim(), '');
  else L.push('(Agregue sus conclusiones en `evals/conclusiones.md`; se incluyen aquí al regenerar el reporte.)', '');

  L.push('## Capturas', '', 'Cada captura está en `salidas/<condición>/<tarea>/captura.png` y el HTML en `salida.html`.', '');
  L.push('| Tarea | Sin servidor | Con servidor |', '|---|---|---|');
  for (const t of TAREAS) L.push(`| ${t.titulo} | ![sin](salidas/sin/${t.id}/captura.png) | ![con](salidas/con/${t.id}/captura.png) |`);
  L.push('');

  L.push('## Limitaciones', '');
  L.push(
    '- Una sola corrida por tarea y condición: el modelo es no determinista, así que una diferencia pequeña puede ser ruido. Repita (`--forzar`) para más confianza.',
    '- Las métricas automáticas miden **consistencia con los tokens**, no calidad de diseño: por eso existe la calificación visual.',
    '- La condición «con servidor» incluye la skill `/marca`; no aísla el efecto del servidor solo.',
    '- Los pedidos no mencionan la marca. Si se la describiera al agente, la diferencia sería menor (pero esa es justo la repetición que el servidor evita).',
    '- Las fuentes de la marca se tratan como instaladas al renderizar las capturas, igual en ambas condiciones.',
    '- Contraste: se calcula sobre el color de fondo opaco más cercano; no considera imágenes ni degradados de fondo.',
    ''
  );
  return L.join('\n');
}

export function escribirReporte(resultados: Resultado[]): void {
  writeFileSync(join(CARPETA_EVALS, 'reporte.md'), generarReporte(resultados));
}

// ───────────── Variantes experimentales y corridas anteriores ─────────────
export interface FilaCorrida { tarea: string; metricas: Metricas; traza: Traza }

export function leerCorrida(base: string, condicion: Condicion = 'con'): FilaCorrida[] {
  const filas: FilaCorrida[] = [];
  for (const t of TAREAS) {
    const dir = join(base, condicion, t.id);
    const m = join(dir, 'metricas.json');
    if (!existsSync(m)) continue;
    filas.push({
      tarea: t.id,
      metricas: JSON.parse(readFileSync(m, 'utf8')) as Metricas,
      traza: existsSync(join(dir, 'traza.json')) ? (JSON.parse(readFileSync(join(dir, 'traza.json'), 'utf8')) as Traza) : { herramientasDeMarca: [] }
    });
  }
  return filas;
}

const REVISIONES = ['auditar_codigo', 'revisar_contraste', 'revisar_texto'];

/** Totales de una corrida: las cinco métricas, las tareas sin hallazgos y cuántas usaron cada herramienta de revisión. */
export function totalesDeCorrida(filas: FilaCorrida[]) {
  const total = (k: keyof Metricas) => suma(filas.map((f) => Number(f.metricas[k])));
  return {
    tareas: filas.length,
    codigo: total('codigoErrores'), colores: total('coloresFueraDePaleta'), fuentes: total('fuentesAjenas'), contraste: total('fallosContraste'), voz: total('vozErrores'),
    sinHallazgos: filas.filter((f) => METRICAS.every((m) => Number(f.metricas[m.clave]) === 0)).length,
    usoRevision: Object.fromEntries(REVISIONES.map((h) => [h, filas.filter((f) => f.traza.herramientasDeMarca.includes(h)).length])),
    hookDisparos: suma(filas.map((f) => f.traza.hooks?.disparos ?? 0)),
    hookBloqueos: suma(filas.map((f) => f.traza.hooks?.bloqueos ?? 0)),
    costo: suma(filas.map((f) => f.traza.costoUsd ?? 0)),
    turnos: media(filas.map((f) => f.traza.turnos ?? NaN).filter(Number.isFinite))
  };
}

export function resumirVariante(nombre: string, base: string, condicion: Condicion = 'con'): void {
  const filas = leerCorrida(base, condicion);
  const t = totalesDeCorrida(filas);
  const md = [
    `# Variante «${nombre}»`, '',
    `Condición «con servidor» con la variante activa. ${t.tareas} tareas.`, '',
    '| Métrica | Total |', '|---|---:|',
    `| Valores fuera de los tokens (código) | ${t.codigo} |`, `| Colores fuera de la paleta | ${t.colores} |`, `| Fuentes ajenas | ${t.fuentes} |`,
    `| Textos bajo AA | ${t.contraste} |`, `| Fallos de voz | ${t.voz} |`, `| Tareas sin ningún hallazgo | ${t.sinHallazgos} de ${t.tareas} |`,
    `| Costo (USD) | ${usd(t.costo)} |`, `| Turnos (promedio) | ${f1(t.turnos)} |`, '',
    '| Tarea | Código | Colores | Fuentes | Contraste | Voz | Turnos | Costo |', '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...filas.map((f) => `| ${f.tarea} | ${f.metricas.codigoErrores} | ${f.metricas.coloresFueraDePaleta} | ${f.metricas.fuentesAjenas} | ${f.metricas.fallosContraste} | ${f.metricas.vozErrores} | ${f.traza.turnos ?? '—'} | ${usd(f.traza.costoUsd)} |`), ''
  ].join('\n');
  writeFileSync(join(base, 'resumen.md'), md);
}
