---
nombre: tarjeta-de-proyecto
titulo: Tarjeta de proyecto
resumen: Tarjeta con imagen, título, descripción breve, etiquetas y enlace. Presenta un proyecto del portafolio.
palabras: [tarjeta, card, proyecto, portafolio, caso de estudio, miniatura, trabajo, project card]
tokens: [color.fondo, color.blanco, color.linea, color.tinta, color.texto, color.apagado, color.azul, tipografia.familia.titulo, tipografia.tamano.xl, tipografia.tamano.base, radio.lg, espaciado.lg, espaciado.md, sombra.suave]
variantes: [claro, oscuro, destacada]
estados: [reposo, hover, foco]
---

# Tarjeta de proyecto

## Para qué sirve
Presenta un proyecto del portafolio en una rejilla: imagen, año o categoría (eyebrow), título, una frase de descripción, etiquetas con las tecnologías y un enlace al caso de estudio.

## Cuándo no usarlo
- Para contenido que no es un proyecto (artículos, avisos): use `aviso-destacado` o una lista.
- Con descripciones largas: máximo dos líneas; el detalle va en el caso de estudio.
- Con cifras o clientes que no sean reales (ver `voz`).
- Anidada dentro de otra tarjeta.

## Variantes y estados
- **Claro:** fondo `color.blanco`, borde 1px `color.linea`, radio `radio.lg`, sin sombra en reposo.
- **Oscuro:** fondo `color.oscuro.cuadro`, borde `color.oscuro.linea`.
- **Destacada:** igual que la clara pero ocupa dos columnas; el título sube a `tipografia.tamano.2xl`.
Estados: **hover** (borde pasa a `color.tinta` y aparece `sombra.suave`), **foco** (anillo azul de 2px en toda la tarjeta, que es un solo enlace).

## Tokens que usa
`color.blanco`, `color.linea`, `color.tinta`, `color.texto`, `color.azul` (eyebrow), `tipografia.familia.titulo` (título), `tipografia.tamano.xl`, `radio.lg`, `espaciado.lg` (relleno), `espaciado.md` (separación interna), `sombra.suave`.

## Accesibilidad
- Toda la tarjeta es **un único enlace** (`<a>` en el título con `::after` que cubre la tarjeta); evite enlaces anidados.
- La imagen necesita `alt` descriptivo; si es decorativa, `alt=""`.
- El título es un encabezado (`<h3>`) dentro de una lista (`<ul>`).
- El foco visible debe rodear toda la tarjeta.

## Ejemplos de código

### HTML + CSS
```html
<article class="tarjeta">
  <img class="tarjeta__imagen" src="proyecto.jpg" alt="Pantalla principal del panel de métricas" width="640" height="400" />
  <div class="tarjeta__cuerpo">
    <p class="tarjeta__eyebrow">Panel de datos · 2026</p>
    <h3 class="tarjeta__titulo"><a href="/proyectos/panel">Panel de métricas</a></h3>
    <p class="tarjeta__texto">Lectura rápida de indicadores para equipos pequeños.</p>
    <ul class="etiquetas" role="list"><li class="etiqueta">Figma</li><li class="etiqueta">React</li></ul>
  </div>
</article>

<style>
  .tarjeta { position: relative; background: var(--color-blanco); border: 1px solid var(--color-linea); border-radius: var(--radius-lg); overflow: hidden; transition: border-color .15s, box-shadow .15s; }
  .tarjeta:hover { border-color: var(--color-tinta); box-shadow: var(--shadow-suave); }
  .tarjeta:focus-within { outline: 2px solid var(--color-azul); outline-offset: 2px; }
  .tarjeta__imagen { display: block; width: 100%; height: auto; aspect-ratio: 8 / 5; object-fit: cover; }
  .tarjeta__cuerpo { padding: var(--spacing-lg); display: grid; gap: var(--spacing-md); }
  .tarjeta__eyebrow { margin: 0; font: var(--font-weight-negrita) var(--text-xs)/var(--text-xs--line-height) var(--font-texto); letter-spacing: var(--tracking-eyebrow); text-transform: uppercase; color: var(--color-azul); }
  .tarjeta__titulo { margin: 0; font: var(--font-weight-extranegrita) var(--text-xl)/var(--text-xl--line-height) var(--font-titulo); letter-spacing: var(--tracking-titulo); }
  .tarjeta__titulo a { color: var(--color-tinta); text-decoration: none; }
  .tarjeta__titulo a::after { content: ""; position: absolute; inset: 0; }
  .tarjeta__texto { margin: 0; color: var(--color-texto); font: var(--text-base)/var(--text-base--line-height) var(--font-texto); }
</style>
```

### React + Tailwind v4
```tsx
type Props = { href: string; imagen: string; alt: string; eyebrow: string; titulo: string; texto: string; etiquetas: string[] };

export function TarjetaDeProyecto({ href, imagen, alt, eyebrow, titulo, texto, etiquetas }: Props) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-linea bg-blanco transition hover:border-tinta hover:shadow-suave focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-azul">
      <img src={imagen} alt={alt} width={640} height={400} className="aspect-[8/5] w-full object-cover" />
      <div className="grid gap-md p-lg">
        <p className="font-texto text-xs font-negrita uppercase tracking-eyebrow text-azul">{eyebrow}</p>
        <h3 className="font-titulo text-xl font-extranegrita tracking-titulo text-tinta">
          <a href={href} className="after:absolute after:inset-0">{titulo}</a>
        </h3>
        <p className="font-texto text-base text-texto">{texto}</p>
        <ul role="list" className="flex flex-wrap gap-sm">
          {etiquetas.map((e) => (
            <li key={e} className="rounded-pill bg-suave px-md py-sm font-texto text-xs font-seminegrita text-tinta">{e}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .tarjeta { break-inside: avoid; box-shadow: none; border-color: var(--color-linea); }
  .tarjeta__imagen { max-height: 5cm; }
  .tarjeta__titulo a::after { content: none; }
  .tarjeta__titulo a[href]::after { content: " (" attr(href) ")"; font-size: var(--text-xs); color: var(--color-apagado); position: static; }
}
```
