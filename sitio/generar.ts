import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { aHex, evaluarContraste, leerColor, razonContraste, redondear } from '../src/nucleo/color.js';
import { cargarComponente, codigoDe, listarComponentes, seccion } from '../src/nucleo/componentes.js';
import { exportarTokens, nombreVariable, valorCss } from '../src/nucleo/exportadores.js';
import { carpetaMarca, leerTexto } from '../src/nucleo/rutas.js';
import { cargarTokens, type Token } from '../src/nucleo/tokens.js';
import { escaparHtml as esc, markdownAHtml } from './markdown.js';

/**
 * Genera la página pública /marca (estática) desde marca/: tokens, componentes y reglas.
 * Usa rutas relativas: la carpeta resultante puede copiarse tal cual a /marca de otro sitio.
 */
export function generarSitio(destino: string): { html: string } {
  const marca = carpetaMarca();
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(join(destino, 'assets'), { recursive: true });
  cpSync(join(marca, 'assets'), join(destino, 'assets'), { recursive: true });
  copyFileSync(join(marca, 'tokens.json'), join(destino, 'tokens.json'));
  writeFileSync(join(destino, 'marca.css'), exportarTokens('css').contenido);
  writeFileSync(join(destino, 'marca-tailwind.css'), exportarTokens('tailwind4').contenido);
  writeFileSync(join(destino, 'tokens.plano.json'), exportarTokens('json').contenido);

  const { tokens, extension } = cargarTokens();
  const grupo = (prefijo: string) => tokens.filter((t) => t.ruta.startsWith(prefijo));
  const inlineSvg = (nombre: string) => readFileSync(join(marca, 'assets', `${nombre}.svg`), 'utf8').replace(/ width="\d+" height="\d+"/, '');

  // ── Colores ──
  const tarjetaColor = (t: Token) => {
    const hex = aHex(leerColor(String(t.valor))!);
    return `<li class="color"><span class="color__chip" style="background:var(${nombreVariable(t.ruta)})" aria-hidden="true"></span>
      <div><p class="color__nombre">${esc(t.ruta)}</p><p class="color__hex">${hex}</p><p class="color__var"><code>${nombreVariable(t.ruta)}</code></p><p class="color__uso">${esc(t.descripcion)}</p></div></li>`;
  };
  const coloresClaros = grupo('color.').filter((t) => !t.ruta.startsWith('color.oscuro.'));
  const coloresOscuros = grupo('color.oscuro.');
  const filasContraste = extension.pares
    .map((p) => {
      const t = cargarTokens().porRuta.get(p.texto)!;
      const f = cargarTokens().porRuta.get(p.fondo)!;
      const razon = razonContraste(leerColor(String(t.valor))!, leerColor(String(f.valor))!);
      const n = evaluarContraste(razon);
      return `<tr><td><code>${p.texto}</code> sobre <code>${p.fondo}</code></td><td class="num">${redondear(razon)}:1</td><td>${n.AAA.normal ? 'AAA' : n.AA.normal ? 'AA' : 'solo texto grande'}</td><td>${esc(p.uso)}</td></tr>`;
    })
    .join('');
  const filasProhibidas = extension.paresProhibidos
    .map((p) => `<tr><td><code>${p.texto}</code> sobre <code>${p.fondo}</code></td><td colspan="3">${esc(p.motivo)}</td></tr>`)
    .join('');

  // ── Tipografía ──
  const tamanos = grupo('tipografia.tamano.');
  const filasEscala = tamanos
    .map((t) => {
      const n = t.ruta.split('.').pop()!;
      const lh = cargarTokens().porRuta.get(`tipografia.interlineado.${n}`)!;
      const px = parseFloat(String(t.valor));
      const familia = px >= 28 ? 'titulo' : 'texto';
      return `<tr><td><code>${n}</code></td><td class="num">${t.valor} / ${lh.valor}</td><td><span class="muestra muestra--${familia}" style="font-size:min(var(${nombreVariable(t.ruta)}),9vw);line-height:var(${nombreVariable(lh.ruta)})">Interfaces pensadas</span></td><td>${esc(t.descripcion)}</td></tr>`;
    })
    .join('');

  // ── Espaciado, radios, sombras ──
  const barrasEspaciado = grupo('espaciado.')
    .map((t) => `<li><span class="esp__barra" style="width:var(${nombreVariable(t.ruta)})"></span><code>${t.ruta.split('.').pop()}</code> <span>${t.valor}</span></li>`)
    .join('');
  const radios = grupo('radio.')
    .map((t) => `<li class="radio"><span class="radio__caja" style="border-radius:var(${nombreVariable(t.ruta)})"></span><p><code>${t.ruta}</code><br>${t.valor}</p></li>`)
    .join('');
  const sombras = grupo('sombra.')
    .map((t) => `<li class="sombra"><span class="sombra__caja" style="box-shadow:var(${nombreVariable(t.ruta)})"></span><p><code>${t.ruta}</code><br>${esc(t.descripcion)}</p></li>`)
    .join('');

  // ── Componentes (demo en vivo con el mismo HTML+CSS de la documentación) ──
  const placeholderImagen =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#ECEDEF"/><g transform="translate(250 150)"><rect width="50" height="50" rx="10" fill="#0E1116"/><rect x="60" width="50" height="50" rx="10" fill="#FAFAF8"/><rect y="60" width="110" height="50" rx="25" fill="#043565"/></g></svg>'
    );
  const placeholderQr =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/>' +
        [[0, 0], [14, 0], [0, 14]].map(([x, y]) => `<path fill="#0E1116" d="M${x} ${y}h7v7h-7z"/><path fill="#fff" d="M${x! + 1} ${y! + 1}h5v5h-5z"/><path fill="#0E1116" d="M${x! + 2} ${y! + 2}h3v3h-3z"/>`).join('') +
        Array.from({ length: 60 }, (_, i) => `<rect fill="#0E1116" x="${(i * 7) % 21}" y="${(i * 11 + 3) % 21}" width="1" height="1"/>`).join('') +
        '</svg>'
    );
  const componentes = listarComponentes()
    .map((c) => {
      const bloque = (f: 'html' | 'react' | 'impresion') => codigoDe(cargarComponente(c.nombre)!, f);
      const html = bloque('html').replace(/^```\w*\n/, '').replace(/\n```[\s\S]*$/, '');
      const demo = html
        .replace(/\/marca\/assets\//g, 'assets/')
        .replace(/href="\/[^"]*"/g, 'href="#"')
        .replace(/src="proyecto\.jpg"/g, `src="${placeholderImagen}"`)
        .replace(/src="qr-portafolio\.svg"/g, `src="${placeholderQr}"`);
      const nota = c.nombre === 'bloque-de-contacto' ? '<p class="demo__nota">El código QR es un marcador de posición.</p>' : c.nombre === 'tarjeta-de-proyecto' ? '<p class="demo__nota">La imagen es un marcador de posición.</p>' : '';
      return `<article class="comp" id="comp-${c.nombre}">
        <header><p class="eyebrow">Componente</p><h3>${esc(c.titulo)}</h3><p class="lead">${esc(c.resumen)}</p></header>
        <div class="demo demo--${c.nombre}">${demo}</div>${nota}
        <div class="comp__cols">
          <section><h4>Para qué sirve</h4>${markdownAHtml(seccion(c.cuerpo, 'Para qué sirve'), 4)}</section>
          <section><h4>Cuándo no usarlo</h4>${markdownAHtml(seccion(c.cuerpo, 'Cuándo no usarlo'), 4)}</section>
          <section><h4>Variantes y estados</h4>${markdownAHtml(seccion(c.cuerpo, 'Variantes y estados'), 4)}</section>
          <section><h4>Accesibilidad</h4>${markdownAHtml(seccion(c.cuerpo, 'Accesibilidad'), 4)}</section>
        </div>
        <p class="comp__tokens"><strong>Tokens:</strong> ${c.tokens.map((t) => `<code>${t}</code>`).join(' ')}</p>
        <details><summary>Código · HTML + CSS</summary>${markdownAHtml(bloque('html'))}</details>
        <details><summary>Código · React + Tailwind v4</summary>${markdownAHtml(bloque('react'))}</details>
        <details><summary>Código · Impresión (PDF)</summary>${markdownAHtml(bloque('impresion'))}</details>
      </article>`;
    })
    .join('\n');

  const reglas = markdownAHtml(leerTexto('reglas.md').replace(/^# .*\n+/, ''), 3);
  const fuentes = [
    ['Bricolage Grotesque', 800, 'bricolage-grotesque-latin-800-normal'],
    ['Instrument Sans', 400, 'instrument-sans-latin-400-normal'],
    ['Instrument Sans', 500, 'instrument-sans-latin-500-normal'],
    ['Instrument Sans', 600, 'instrument-sans-latin-600-normal'],
    ['Instrument Sans', 700, 'instrument-sans-latin-700-normal'],
    ['JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal']
  ] as const;
  const fontFace = fuentes
    .map(([f, p, a]) => `@font-face{font-family:"${f}";font-weight:${p};font-style:normal;font-display:swap;src:url("assets/fuentes/${a}.woff2") format("woff2");}`)
    .join('\n');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marca · Nehemias Pérez</title>
<meta name="description" content="Sistema de diseño de la marca personal de Nehemias Pérez, Diseñador UI/UX: colores, tipografías, motivo, componentes y reglas de uso.">
<link rel="icon" href="assets/motivo-mini-claro.svg" type="image/svg+xml">
<link rel="stylesheet" href="marca.css">
<style>
${fontFace}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
section.bloque,.comp{scroll-margin-top:80px}
body{margin:0;background:var(--color-fondo);color:var(--color-texto);font:var(--text-base)/var(--text-base--line-height) var(--font-texto)}
code{font-family:var(--font-codigo);font-size:var(--text-sm);background:var(--color-suave);color:var(--color-tinta);padding:1px 6px;border-radius:var(--radius-sm)}
pre{background:var(--color-tinta);color:var(--color-oscuro-texto);padding:var(--spacing-lg);border-radius:var(--radius-md);overflow:auto;font-size:var(--text-sm);line-height:var(--text-sm--line-height)}
pre code{background:none;color:inherit;padding:0;border-radius:0;font-size:inherit}
a{color:var(--color-azul)}
a:focus-visible,summary:focus-visible{outline:2px solid var(--color-azul);outline-offset:2px}
.salto{position:absolute;left:-999px;top:0;background:var(--color-tinta);color:var(--color-blanco);padding:var(--spacing-md)}
.salto:focus{left:var(--spacing-md);top:var(--spacing-md);z-index:10}
.contenedor{max-width:1120px;margin:0 auto;padding:0 var(--spacing-lg)}
.barra{border-bottom:1px solid var(--color-linea);background:var(--color-fondo);position:sticky;top:0;z-index:5}
.barra .contenedor{display:flex;align-items:center;justify-content:space-between;gap:var(--spacing-lg);min-height:64px;flex-wrap:wrap}
.barra img{height:36px;width:auto;display:block}
.barra nav{display:flex;gap:var(--spacing-lg);flex-wrap:wrap}
.barra nav a{color:var(--color-tinta);text-decoration:none;font-weight:var(--font-weight-seminegrita);font-size:var(--text-sm)}
.barra nav a:hover{color:var(--color-azul)}
.eyebrow{margin:0 0 var(--spacing-md);font:var(--font-weight-negrita) var(--text-xs)/var(--text-xs--line-height) var(--font-texto);letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-azul)}
h1,h2,h3{font-family:var(--font-titulo);font-weight:var(--font-weight-extranegrita);letter-spacing:var(--tracking-titulo);color:var(--color-tinta);margin:0}
h1{font-size:clamp(2.5rem,7vw,var(--text-5xl));line-height:1.02}
h2{font-size:var(--text-3xl);line-height:var(--text-3xl--line-height)}
h3{font-size:var(--text-2xl);line-height:var(--text-2xl--line-height)}
h4{font:var(--font-weight-negrita) var(--text-base)/var(--text-base--line-height) var(--font-texto);color:var(--color-tinta);margin:0 0 var(--spacing-sm)}
em{font-style:normal;color:var(--color-azul)}
.lead{font-size:var(--text-lg);line-height:var(--text-lg--line-height);max-width:62ch;margin:var(--spacing-md) 0 0}
.hero{padding:var(--spacing-3xl) 0}
.hero .contenedor{display:grid;grid-template-columns:1.3fr 1fr;gap:var(--spacing-xl);align-items:center}
.hero__motivo{width:100%;height:auto;display:block}
section.bloque{padding:var(--spacing-3xl) 0;border-top:1px solid var(--color-linea)}
section.bloque>.contenedor>header{margin-bottom:var(--spacing-xl)}
.cuadricula{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--spacing-lg)}
.color{display:flex;gap:var(--spacing-md);align-items:flex-start;background:var(--color-blanco);border:1px solid var(--color-linea);border-radius:var(--radius-lg);padding:var(--spacing-md)}
.color__chip{flex:none;width:56px;height:56px;border-radius:var(--radius-md);border:1px solid var(--color-linea)}
.color p{margin:0}.color__nombre{font-weight:var(--font-weight-seminegrita);color:var(--color-tinta)}
.color__hex{font-variant-numeric:tabular-nums}.color__uso{font-size:var(--text-sm);line-height:var(--text-sm--line-height);margin-top:var(--spacing-sm)!important}
.panel-oscuro{background:var(--color-tinta);border-radius:var(--radius-lg);padding:var(--spacing-xl);margin-top:var(--spacing-xl)}
.panel-oscuro h3{color:var(--color-oscuro-texto)}
.panel-oscuro .color{background:var(--color-oscuro-cuadro);border-color:var(--color-oscuro-linea);color:var(--color-oscuro-texto-apagado)}
.panel-oscuro .color__nombre{color:var(--color-oscuro-texto)}
.panel-oscuro .color__chip{border-color:var(--color-oscuro-linea)}
.panel-oscuro code{background:var(--color-tinta);color:var(--color-oscuro-texto)}
.tabla-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:var(--text-sm);line-height:var(--text-sm--line-height)}
thead th{background:var(--color-tinta);color:var(--color-blanco);text-align:left;padding:var(--spacing-md) var(--spacing-lg);font-weight:var(--font-weight-seminegrita)}
td{padding:var(--spacing-md) var(--spacing-lg);border-bottom:1px solid var(--color-linea);vertical-align:top}
td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.muestra{display:block;color:var(--color-tinta);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.muestra--titulo{font-family:var(--font-titulo);font-weight:var(--font-weight-extranegrita);letter-spacing:var(--tracking-titulo)}
.muestra--texto{font-family:var(--font-texto)}
.familias{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--spacing-lg);margin-bottom:var(--spacing-xl)}
.familia{background:var(--color-blanco);border:1px solid var(--color-linea);border-radius:var(--radius-lg);padding:var(--spacing-lg)}
.familia__a{font-size:var(--text-4xl);line-height:1;color:var(--color-tinta);margin:0 0 var(--spacing-md)}
.familia--titulo .familia__a{font-family:var(--font-titulo);font-weight:var(--font-weight-extranegrita);letter-spacing:var(--tracking-titulo)}
.familia--texto .familia__a{font-family:var(--font-texto);font-weight:var(--font-weight-medio)}
.pesos{display:flex;flex-wrap:wrap;gap:var(--spacing-md);font-size:var(--text-lg);margin:0;padding:0;list-style:none}
.esp{list-style:none;margin:0;padding:0;display:grid;gap:var(--spacing-sm)}.esp li{display:flex;align-items:center;gap:var(--spacing-md)}
.esp__barra{display:block;height:16px;background:var(--color-azul);border-radius:var(--radius-sm);flex:none}
.fila{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:var(--spacing-xl)}
.radio,.sombra{display:flex;flex-direction:column;gap:var(--spacing-md);margin:0}
.radio p,.sombra p{margin:0;font-size:var(--text-sm);line-height:var(--text-sm--line-height);max-width:20ch}
.radio__caja{display:block;width:96px;height:96px;background:var(--color-tinta)}
.radio:last-child .radio__caja{width:160px;height:56px}
.sombra__caja{display:block;width:160px;height:96px;background:var(--color-blanco);border:1px solid var(--color-linea);border-radius:var(--radius-lg)}
.motivos{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--spacing-lg)}
.motivo-panel{border-radius:var(--radius-lg);padding:var(--spacing-xl);display:flex;gap:var(--spacing-xl);align-items:center;flex-wrap:wrap;border:1px solid var(--color-linea)}
.motivo-panel--claro{background:var(--color-blanco)}.motivo-panel--oscuro{background:var(--color-tinta);border-color:var(--color-tinta)}
.motivo-panel svg{display:block;height:auto}
.motivo-panel .grande{width:200px}.motivo-panel .mini{width:64px}
.logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--spacing-lg);margin-top:var(--spacing-lg)}
.logo-panel{border-radius:var(--radius-lg);padding:var(--spacing-xl);border:1px solid var(--color-linea);background:var(--color-blanco)}
.logo-panel--oscuro{background:var(--color-tinta);border-color:var(--color-tinta)}.logo-panel img{width:100%;max-width:340px;height:auto;display:block}
.comp{padding:var(--spacing-xl) 0;border-top:1px solid var(--color-linea)}
.comp:first-of-type{border-top:0;padding-top:0}
.demo{background:var(--color-blanco);border:1px solid var(--color-linea);border-radius:var(--radius-lg);padding:var(--spacing-xl);margin:var(--spacing-lg) 0 var(--spacing-sm);overflow:auto}
.demo--portada-de-documento .portada{min-height:520px}
.demo--tarjeta-de-proyecto .tarjeta{max-width:380px}
.demo__nota{margin:0 0 var(--spacing-lg);font-size:var(--text-sm);color:var(--color-apagado)}
.comp__cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--spacing-lg);margin:var(--spacing-lg) 0;font-size:var(--text-sm);line-height:var(--text-sm--line-height)}
.comp__cols ul{margin:0;padding-left:var(--spacing-lg)}.comp__cols p{margin:0 0 var(--spacing-sm)}
.comp__tokens{font-size:var(--text-sm)}.comp__tokens code{margin-right:4px;display:inline-block;margin-bottom:4px}
details{border-top:1px solid var(--color-linea);padding:var(--spacing-md) 0}
summary{cursor:pointer;font-weight:var(--font-weight-seminegrita);color:var(--color-tinta)}
.reglas h3{font-size:var(--text-xl);line-height:var(--text-xl--line-height);margin:var(--spacing-xl) 0 var(--spacing-md)}
.reglas ul{padding-left:var(--spacing-lg)}.reglas li{margin-bottom:var(--spacing-sm)}
.descargas{display:flex;flex-wrap:wrap;gap:var(--spacing-md);list-style:none;margin:var(--spacing-lg) 0 0;padding:0}
.descargas a{display:inline-block;min-height:44px;line-height:44px;padding:0 var(--spacing-lg);border:1px solid var(--color-linea);border-radius:var(--radius-md);text-decoration:none;color:var(--color-tinta);font-weight:var(--font-weight-seminegrita);font-size:var(--text-sm);background:var(--color-blanco)}
.descargas a:hover{border-color:var(--color-tinta)}
footer{border-top:1px solid var(--color-linea);padding:var(--spacing-xl) 0;font-size:var(--text-sm);color:var(--color-apagado)}
@media (max-width:760px){.hero .contenedor{grid-template-columns:1fr}.hero__motivo{max-width:260px}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<a class="salto" href="#contenido">Saltar al contenido</a>
<div class="barra"><div class="contenedor">
  <img src="assets/logo-claro.svg" alt="Nehemias Pérez · Diseñador UI/UX" width="340" height="56">
  <nav aria-label="Secciones"><a href="#colores">Colores</a><a href="#tipografia">Tipografía</a><a href="#forma">Forma</a><a href="#motivo">Motivo</a><a href="#componentes">Componentes</a><a href="#reglas">Reglas</a></nav>
</div></div>
<main id="contenido">
<section class="hero"><div class="contenedor">
  <div><p class="eyebrow">Sistema de diseño</p>
  <h1>Interfaces pensadas para <em>implementarse.</em></h1>
  <p class="lead">Colores, tipografías, motivo, componentes y reglas de la marca personal de Nehemias Pérez, Diseñador UI/UX. Esta página se genera desde <code>tokens.json</code> y los componentes: es la misma fuente de verdad que lee el servidor MCP «Marca».</p>
  <ul class="descargas"><li><a href="tokens.json">tokens.json (DTCG)</a></li><li><a href="marca.css">marca.css</a></li><li><a href="marca-tailwind.css">Tailwind v4 (@theme)</a></li><li><a href="tokens.plano.json">JSON plano</a></li></ul></div>
  <div class="hero__motivo" aria-hidden="true">${inlineSvg('motivo-claro')}</div>
</div></section>

<section class="bloque" id="colores"><div class="contenedor">
  <header><p class="eyebrow">Color</p><h2>Una paleta corta, con <em>un solo</em> acento.</h2>
  <p class="lead">El azul es solo acento: la palabra destacada, los eyebrows y la píldora del motivo. Nunca en bloques grandes.</p></header>
  <ul class="cuadricula">${coloresClaros.map(tarjetaColor).join('')}</ul>
  <div class="panel-oscuro"><h3>Sobre fondo oscuro</h3><p class="lead" style="color:var(--color-oscuro-texto-apagado)">Cuando el fondo es <code>color.tinta</code>, se usan estas variantes.</p>
  <ul class="cuadricula" style="margin-top:var(--spacing-lg)">${coloresOscuros.map(tarjetaColor).join('')}</ul></div>
  <h3 style="margin:var(--spacing-3xl) 0 var(--spacing-lg)">Pares de texto permitidos</h3>
  <div class="tabla-scroll"><table><thead><tr><th>Par</th><th>Contraste</th><th>Nivel</th><th>Uso</th></tr></thead><tbody>${filasContraste}${filasProhibidas}</tbody></table></div>
</div></section>

<section class="bloque" id="tipografia"><div class="contenedor">
  <header><p class="eyebrow">Tipografía</p><h2>Dos familias, <em>una</em> jerarquía.</h2></header>
  <div class="familias">
    <div class="familia familia--titulo"><p class="familia__a">Bricolage Grotesque</p><p><code>${nombreVariable('tipografia.familia.titulo')}</code> · peso 800 · letras a −0.02em. Títulos, nombre y cifras grandes.</p></div>
    <div class="familia familia--texto"><p class="familia__a">Instrument Sans</p><ul class="pesos"><li style="font-weight:400">400</li><li style="font-weight:500">500</li><li style="font-weight:600">600</li><li style="font-weight:700">700</li></ul><p><code>${nombreVariable('tipografia.familia.texto')}</code> · texto, interfaz y etiquetas.</p></div>
  </div>
  <p class="eyebrow">Eyebrow · Instrument Sans 700 · mayúsculas · 0.12em</p>
  <h3 style="margin:var(--spacing-xl) 0 var(--spacing-lg)">Escala tipográfica</h3>
  <div class="tabla-scroll"><table><thead><tr><th>Token</th><th>Tamaño / línea</th><th>Muestra</th><th>Uso</th></tr></thead><tbody>${filasEscala}</tbody></table></div>
</div></section>

<section class="bloque" id="forma"><div class="contenedor">
  <header><p class="eyebrow">Forma y espacio</p><h2>Espaciado, radios y <em>sombras.</em></h2><p class="lead">Base de 4 px. Sin sombras por defecto: las dos que existen son la excepción.</p></header>
  <h3 style="margin-bottom:var(--spacing-lg)">Espaciado</h3><ul class="esp">${barrasEspaciado}</ul>
  <h3 style="margin:var(--spacing-xl) 0 var(--spacing-lg)">Radios</h3><ul class="fila">${radios}</ul>
  <h3 style="margin:var(--spacing-xl) 0 var(--spacing-lg)">Sombras</h3><ul class="fila">${sombras}</ul>
</div></section>

<section class="bloque" id="motivo"><div class="contenedor">
  <header><p class="eyebrow">Motivo de marca</p><h2>Una rejilla y <em>una píldora.</em></h2>
  <p class="lead">Cuadros redondeados de 4 columnas por 3 filas (tinta, suaves y vacíos) y una píldora azul de dos columnas. Existe una versión mini de 2 × 2. Nunca va detrás de texto largo.</p></header>
  <div class="motivos">
    <div class="motivo-panel motivo-panel--claro"><div class="grande" role="img" aria-label="Motivo completo, claro">${inlineSvg('motivo-claro')}</div><div class="mini" role="img" aria-label="Motivo mini, claro">${inlineSvg('motivo-mini-claro')}</div></div>
    <div class="motivo-panel motivo-panel--oscuro"><div class="grande" role="img" aria-label="Motivo completo, oscuro">${inlineSvg('motivo-oscuro')}</div><div class="mini" role="img" aria-label="Motivo mini, oscuro">${inlineSvg('motivo-mini-oscuro')}</div></div>
  </div>
  <div class="logos"><div class="logo-panel"><img src="assets/logo-claro.svg" alt="Logo sobre fondo claro"></div><div class="logo-panel logo-panel--oscuro"><img src="assets/logo-oscuro.svg" alt="Logo sobre fondo oscuro"></div></div>
</div></section>

<section class="bloque" id="componentes"><div class="contenedor">
  <header><p class="eyebrow">Componentes</p><h2>Piezas listas para <em>implementar.</em></h2><p class="lead">Cada componente se muestra en vivo con el mismo HTML y CSS de su documentación, e incluye código para React + Tailwind v4 y para impresión (PDF).</p></header>
  ${componentes}
</div></section>

<section class="bloque" id="reglas"><div class="contenedor">
  <header><p class="eyebrow">Reglas</p><h2>Qué sí y <em>qué no.</em></h2></header>
  <div class="reglas">${reglas}</div>
</div></section>
</main>
<footer><div class="contenedor">Generado desde <code>marca/tokens.json</code>, los componentes y las reglas de Marca MCP. Fuentes: Bricolage Grotesque e Instrument Sans (SIL OFL 1.1).</div></footer>
</body>
</html>
`;
  writeFileSync(join(destino, 'index.html'), html);
  return { html };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = resolve(import.meta.dirname, 'publico');
  const { html } = generarSitio(destino);
  console.log(`Sitio generado en sitio/publico/ (${Math.round(html.length / 1024)} KB de HTML).`);
}
