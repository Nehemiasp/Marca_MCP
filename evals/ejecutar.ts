import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { medirSalida } from './medir.js';
import { asegurarPlantillaDeCalificacion, CARPETA_EVALS, CARPETA_SALIDAS, escribirReporte, leerResultados, resumirVariante, type Traza } from './reporte.js';
import { CONDICIONES, SUFIJO_DE_ENTREGA, TAREAS, type Condicion, type Tarea } from './tareas.js';

const RAIZ = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const bandera = (n: string) => args.includes(`--${n}`);
const valor = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

const soloReporte = bandera('solo-reporte');
const soloMedir = bandera('medir');
const forzar = bandera('forzar');
/** Variante experimental (p. ej. «hook»): corre la condición «con servidor» con algo extra y guarda aparte, sin tocar el reporte principal. */
const variante = valor('variante');
const SALIDAS = variante ? join(CARPETA_EVALS, 'variantes', variante) : CARPETA_SALIDAS;
const tareasPedidas = valor('tareas')?.split(',');
const condicionesPedidas = (variante ? [variante === 'hook-sin' ? 'sin' : 'con'] : (valor('condicion')?.split(',') ?? [...CONDICIONES])) as Condicion[];
const concurrencia = Number(valor('concurrencia') ?? 3);
const modelo = valor('modelo') ?? process.env['EVALS_MODEL'];
const TIEMPO_MAX_MS = 15 * 60_000;

function ejecutarClaude(cond: Condicion, tarea: Tarea, carpetaTrabajo: string): Promise<Traza> {
  const mcpPath = join(carpetaTrabajo, '..', `mcp-${cond}.json`);
  writeFileSync(
    mcpPath,
    JSON.stringify({ mcpServers: cond === 'con' ? { marca: { command: 'node', args: [join(RAIZ, 'dist', 'stdio.js')] } } : {} })
  );
  const permitidas = cond === 'con' ? 'mcp__marca__*,Write,Edit,Read' : 'Write,Edit,Read';
  const argv = [
    '-p', tarea.pedido + SUFIJO_DE_ENTREGA,
    '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits',
    '--max-turns', '40',
    '--no-session-persistence',
    '--setting-sources', 'project',
    '--tools', 'Write,Edit,Read',
    '--allowedTools', permitidas,
    '--strict-mcp-config', '--mcp-config', mcpPath
  ];
  if (cond === 'sin') argv.push('--disable-slash-commands');
  if (modelo) argv.push('--model', modelo);

  return new Promise((resolver) => {
    const traza: Traza = { herramientasDeMarca: [] };
    const proceso = spawn('claude', argv, { cwd: carpetaTrabajo, stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    let stderr = '';
    const reloj = setTimeout(() => { traza.error = 'tiempo agotado'; proceso.kill('SIGKILL'); }, TIEMPO_MAX_MS);
    const procesarLinea = (linea: string) => {
      if (!linea.trim()) return;
      try {
        const ev = JSON.parse(linea);
        if (ev.type === 'assistant') {
          for (const c of ev.message?.content ?? []) {
            if (c.type === 'tool_use' && typeof c.name === 'string' && c.name.startsWith('mcp__marca__')) traza.herramientasDeMarca.push(c.name.replace('mcp__marca__', ''));
          }
        } else if (ev.type === 'system' && ev.subtype === 'hook_response') {
          traza.hooks ??= { disparos: 0, bloqueos: 0 };
          traza.hooks.disparos++;
          if (ev.exit_code === 2) traza.hooks.bloqueos++;
        } else if (ev.type === 'result') {
          traza.costoUsd = ev.total_cost_usd;
          traza.turnos = ev.num_turns;
          traza.duracionSeg = Math.round((ev.duration_ms ?? 0) / 1000);
          traza.respuesta = typeof ev.result === 'string' ? ev.result.slice(0, 1500) : undefined;
          if (ev.is_error) traza.error = String(ev.subtype ?? 'error');
        }
      } catch { /* línea que no es JSON */ }
    };
    proceso.stdout.on('data', (d: Buffer) => {
      buffer += d.toString();
      const lineas = buffer.split('\n');
      buffer = lineas.pop() ?? '';
      lineas.forEach(procesarLinea);
    });
    proceso.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proceso.on('close', (codigo) => {
      clearTimeout(reloj);
      procesarLinea(buffer);
      if (codigo !== 0 && !traza.error) traza.error = `salió con código ${codigo}: ${stderr.slice(0, 300)}`;
      resolver(traza);
    });
    proceso.on('error', (e) => { clearTimeout(reloj); traza.error = `no se pudo ejecutar claude: ${e.message}`; resolver(traza); });
  });
}

async function generar(cond: Condicion, tarea: Tarea): Promise<void> {
  const salida = join(SALIDAS, cond, tarea.id);
  mkdirSync(salida, { recursive: true });
  if (!forzar && existsSync(join(salida, 'salida.html'))) {
    console.log(`= ${cond}/${tarea.id}: ya existe (use --forzar para repetir)`);
    return;
  }
  // Se ejecuta fuera del repositorio para que ningún CLAUDE.md ni skill del proyecto contamine la condición «sin».
  const base = join(tmpdir(), 'marca-evals', `${cond}-${tarea.id}-${Date.now()}`);
  const trabajo = join(base, 'trabajo');
  mkdirSync(trabajo, { recursive: true });
  if (cond === 'con') cpSync(join(RAIZ, '.claude', 'skills', 'marca'), join(trabajo, '.claude', 'skills', 'marca'), { recursive: true });
  if (variante === 'hook' || variante === 'hook-sin') {
    // El hook revisa cada archivo de diseño que el agente guarda y le devuelve los errores (código de salida 2).
    mkdirSync(join(trabajo, '.claude'), { recursive: true });
    writeFileSync(join(trabajo, '.claude', 'settings.json'), JSON.stringify({
      hooks: { PostToolUse: [{ matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command: `node ${join(RAIZ, 'dist', 'hook.js')}`, timeout: 30 }] }] }
    }, null, 2));
  }
  console.log(`→ ${cond}/${tarea.id}: generando…`);
  const traza = await ejecutarClaude(cond, tarea, trabajo);
  const html = existsSync(join(trabajo, 'salida.html'))
    ? join(trabajo, 'salida.html')
    : readdirSync(trabajo).filter((f) => f.endsWith('.html')).map((f) => join(trabajo, f))[0];
  if (html) copyFileSync(html, join(salida, 'salida.html'));
  else traza.error = traza.error ?? 'el agente no entregó ningún HTML';
  writeFileSync(join(salida, 'traza.json'), JSON.stringify(traza, null, 2));
  rmSync(base, { recursive: true, force: true });
  console.log(`✓ ${cond}/${tarea.id}: ${html ? 'listo' : 'SIN HTML'} (${traza.turnos ?? '?'} turnos, ${traza.costoUsd !== undefined ? '$' + traza.costoUsd.toFixed(2) : '?'}${traza.herramientasDeMarca.length ? `, ${traza.herramientasDeMarca.length} llamadas al servidor` : ''})`);
}

async function medir(cond: Condicion, tarea: Tarea): Promise<void> {
  const salida = join(SALIDAS, cond, tarea.id);
  const html = join(salida, 'salida.html');
  if (!existsSync(html)) return;
  const m = await medirSalida(html, tarea, join(salida, 'captura.png'));
  writeFileSync(join(salida, 'metricas.json'), JSON.stringify(m, null, 2));
  console.log(`· ${cond}/${tarea.id}: código ${m.codigoErrores}, colores ${m.coloresFueraDePaleta}, fuentes ${m.fuentesAjenas}, contraste ${m.fallosContraste}, voz ${m.vozErrores}`);
}

async function enLotes<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const cola = [...items];
  await Promise.all(Array.from({ length: Math.min(n, cola.length) }, async () => { for (let x = cola.shift(); x; x = cola.shift()) await fn(x); }));
}

const tareas = TAREAS.filter((t) => !tareasPedidas || tareasPedidas.includes(t.id));
const pares = tareas.flatMap((t) => condicionesPedidas.map((c) => ({ t, c })));

if (!soloReporte) {
  if (!soloMedir) {
    try { execFileSync('claude', ['--version'], { stdio: 'ignore' }); }
    catch { console.error('No encuentro la CLI «claude». Instálela, o use --medir / --solo-reporte para trabajar con salidas existentes.'); process.exit(1); }
    console.log('Compilando el servidor…');
    execFileSync('npm', ['run', 'build', '--silent'], { cwd: RAIZ, stdio: 'inherit' });
    await enLotes(pares, concurrencia, ({ t, c }) => generar(c, t));
  }
  for (const { t, c } of pares) await medir(c, t);
}

if (variante) {
  resumirVariante(variante, SALIDAS, variante === 'hook-sin' ? 'sin' : 'con');
  console.log(`Resumen: evals/variantes/${variante}/resumen.md`);
} else {
  asegurarPlantillaDeCalificacion();
  escribirReporte(leerResultados());
  console.log('Reporte: evals/reporte.md  ·  Calificación: evals/calificaciones.md');
}
