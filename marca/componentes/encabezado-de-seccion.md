---
nombre: encabezado-de-seccion
titulo: Encabezado de sección
resumen: Eyebrow en azul, título grande con una sola palabra destacada y línea superior. Abre cada sección.
palabras: [encabezado, sección, seccion, título, titulo, eyebrow, heading, header, hero, cabecera, subtítulo]
tokens: [color.azul, color.tinta, color.linea, color.apagado, tipografia.familia.titulo, tipografia.peso.extranegrita, tipografia.tamano.3xl, tipografia.tamano.xs, tipografia.espaciado-letras.titulo, tipografia.espaciado-letras.eyebrow, espaciado.md, espaciado.lg]
variantes: [claro, oscuro]
estados: [reposo]
---

# Encabezado de sección

## Para qué sirve
Abre una sección con tres piezas: una **línea superior** de 1px (`color.linea`), un **eyebrow** (etiqueta corta en mayúsculas, `color.azul`) y un **título** en Bricolage Grotesque 800 con **una sola palabra destacada** en azul.

## Cuándo no usarlo
- Dentro de tarjetas o componentes pequeños: use `tipografia.tamano.xl` sin eyebrow.
- Con dos o más palabras destacadas en el título (ver `reglas`).
- Con el motivo de cuadros detrás del texto.
- Sin eyebrow si no hay nada que clasificar: omita el eyebrow, no invente uno.

## Variantes y estados
- **Claro:** título `color.tinta`, eyebrow `color.azul`, línea `color.linea`.
- **Oscuro:** título `color.oscuro.texto`, eyebrow y palabra destacada `color.oscuro.acento`, línea `color.oscuro.linea`.
Sin estados interactivos.

## Tokens que usa
`color.azul`, `color.tinta`, `color.linea`, `color.apagado` (bajada), `tipografia.familia.titulo` (800, `-0.02em`), eyebrow en Instrument Sans 700 con `0.12em`, `tipografia.tamano.3xl` (hasta `5xl` en portadas), `espaciado.md` y `espaciado.lg`.

## Accesibilidad
- El título es el encabezado real (`<h2>`); el eyebrow no es un encabezado: use `<p>`.
- La palabra destacada se marca con `<em>` o `<span>`; el color no debe ser el único portador de significado.
- Azul `#043565` sobre `#FAFAF8` cumple AAA; el acento oscuro sobre tinta cumple AA.
- Respete la jerarquía de encabezados (h1 → h2 → h3).

## Ejemplos de código

### HTML + CSS
```html
<header class="encabezado">
  <p class="encabezado__eyebrow">Proyectos</p>
  <h2 class="encabezado__titulo">Interfaces pensadas para <em>implementarse.</em></h2>
</header>

<style>
  .encabezado { border-top: 1px solid var(--color-linea); padding-top: var(--spacing-lg); }
  .encabezado__eyebrow {
    margin: 0 0 var(--spacing-md);
    font: var(--font-weight-negrita) var(--text-xs)/var(--text-xs--line-height) var(--font-texto);
    letter-spacing: var(--tracking-eyebrow); text-transform: uppercase; color: var(--color-azul);
  }
  .encabezado__titulo {
    margin: 0; color: var(--color-tinta);
    font: var(--font-weight-extranegrita) var(--text-3xl)/var(--text-3xl--line-height) var(--font-titulo);
    letter-spacing: var(--tracking-titulo);
  }
  .encabezado__titulo em { font-style: normal; color: var(--color-azul); }
</style>
```

### React + Tailwind v4
```tsx
export function EncabezadoDeSeccion({ eyebrow, antes, destacada }: { eyebrow: string; antes: string; destacada: string }) {
  return (
    <header className="border-t border-linea pt-lg">
      <p className="mb-md font-texto text-xs font-negrita uppercase tracking-eyebrow text-azul">{eyebrow}</p>
      <h2 className="font-titulo text-3xl font-extranegrita tracking-titulo text-tinta">
        {antes} <em className="not-italic text-azul">{destacada}</em>
      </h2>
    </header>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .encabezado { break-after: avoid; break-inside: avoid; }
  .encabezado__titulo { font-size: 28pt; line-height: 1.1; }
  .encabezado__eyebrow { font-size: 8pt; }
}
```
