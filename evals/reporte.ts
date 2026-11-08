import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metricas } from './medir.js';
import { CONDICIONES, TAREAS, type Condicion } from './tareas.js';

export interface Traza {
  costoUsd?: number;
  turnos?: number;
  duracionSeg?: number;
  herramientasDeMarca: string[];
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

  // Totales
  L.push('## Resumen', '');
  L.push('| Métrica (menos es mejor) | Sin servidor (total) | Con servidor (total) | Sin (promedio por tarea) | Con (promedio por tarea) |', '|---|---:|---:|---:|---:|');
  for (const m of METRICAS) {
    const a = sin.map((r) => Number(r.metricas[m.clave]));
    const b = con.map((r) => Number(r.metricas[m.clave]));
    L.push(`| ${m.nombre} | ${suma(a)} | ${suma(b)} | ${f1(media(a))} | ${f1(media(b))} |`);
  }
  const sinCumple = sin.filter((r) => METRICAS.every((m) => Number(r.metricas[m.clave]) === 0)).length;
  const conCumple = con.filter((r) => METRICAS.every((m) => Number(r.metricas[m.clave]) === 0)).length;
  L.push(`| **Tareas sin ningún hallazgo** | ${sinCumple} de ${sin.length} | ${conCumple} de ${con.length} | | |`);
  const costo = (rs: Resultado[]) => suma(rs.map((r) => r.traza.costoUsd ?? 0));
  const turnos = (rs: Resultado[]) => media(rs.map((r) => r.traza.turnos ?? NaN).filter(Number.isFinite));
  L.push(`| Costo de las corridas (USD) | ${usd(costo(sin))} | ${usd(costo(con))} | ${usd(costo(sin) / (sin.length || 1))} | ${usd(costo(con) / (con.length || 1))} |`);
  L.push(`| Turnos del agente (promedio) | ${f1(turnos(sin))} | ${f1(turnos(con))} | | |`, '');

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
  L.push('## Detalle por tarea', '');
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
