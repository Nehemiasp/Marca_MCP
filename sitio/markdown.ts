/** Convertidor mínimo de Markdown a HTML para las reglas y la documentación de componentes (sin dependencias). */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const escaparHtml = esc;

function enLinea(texto: string): string {
  return esc(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*([^*\s][^*]*)\*(?![*\w])/g, '<em>$1</em>');
}

export function markdownAHtml(md: string, nivelBase = 2): string {
  const lineas = md.replace(/\r/g, '').split('\n');
  const salida: string[] = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i]!;
    if (l.startsWith('```')) {
      const cuerpo: string[] = [];
      i++;
      while (i < lineas.length && !lineas[i]!.startsWith('```')) cuerpo.push(lineas[i++]!);
      i++;
      salida.push(`<pre><code>${esc(cuerpo.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(l);
    if (h) {
      const n = Math.min(6, h[1]!.length - 1 + nivelBase);
      salida.push(`<h${n}>${enLinea(h[2]!)}</h${n}>`);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i]!)) items.push(`<li>${enLinea(lineas[i++]!.replace(/^\s*[-*]\s+/, ''))}</li>`);
      salida.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (l.startsWith('|') && /^\|?\s*:?-{2,}/.test(lineas[i + 1] ?? '')) {
      const celdas = (x: string) => x.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const cab = celdas(l);
      i += 2;
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i]!.startsWith('|')) filas.push(celdas(lineas[i++]!));
      salida.push(
        `<div class="tabla-scroll"><table><thead><tr>${cab.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>${filas
          .map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }
    if (!l.trim()) {
      i++;
      continue;
    }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i]!.trim() && !/^(#{1,6}\s|```|\s*[-*]\s|\|)/.test(lineas[i]!)) parrafo.push(lineas[i++]!);
    salida.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
  }
  return salida.join('\n');
}
