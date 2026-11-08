---
nombre: tabla
titulo: Tabla
resumen: Tabla con encabezado en tinta y texto blanco; filas separadas por una línea. Para precios, comparativas y datos.
palabras: [tabla, precios, tarifas, datos, comparativa, cuadro, filas, columnas, table, planes, cotización, cotizacion]
tokens: [color.tinta, color.blanco, color.texto, color.linea, color.apagado, tipografia.familia.texto, tipografia.tamano.sm, tipografia.peso.seminegrita, espaciado.md, espaciado.lg, radio.md]
variantes: [simple, con-total]
estados: [reposo, hover-fila]
---

# Tabla

## Para qué sirve
Presenta datos comparables: precios, planes, entregables, calendarios. **Encabezado en `color.tinta` con texto blanco** y filas separadas por una línea de 1px `color.linea`; sin cebra ni rejilla completa.

## Cuándo no usarlo
- Para maquetar (alinear tarjetas o formularios): use CSS grid.
- Con más de cinco columnas en móvil: pase a lista o tarjetas apiladas.
- Con cifras o precios inventados (ver `voz`): use solo valores reales.
- Con celdas combinadas complejas: divida en dos tablas.

## Variantes y estados
- **Simple:** encabezado + filas.
- **Con total:** última fila con borde superior `color.tinta` y peso 700.
- Estado **hover de fila** opcional: fondo `color.fondo`. Cifras alineadas a la derecha; texto a la izquierda.

## Tokens que usa
`color.tinta` y `color.blanco` (encabezado), `color.texto` (celdas), `color.linea` (separadores), `color.apagado` (nota al pie, solo sobre `color.fondo`), `tipografia.tamano.sm`, `espaciado.md` (vertical) y `espaciado.lg` (horizontal), `radio.md` (esquinas superiores del encabezado).

## Accesibilidad
- Use `<table>`, `<caption>`, `<thead>`, `<th scope="col">` y `<th scope="row">`.
- Blanco sobre tinta: AAA.
- En pantallas estrechas, envuelva en un contenedor con `overflow-x: auto` y `tabindex="0"` con `role="region"` y `aria-label`.
- Alinee cifras con `font-variant-numeric: tabular-nums`.

## Ejemplos de código

### HTML + CSS
```html
<div class="tabla-contenedor" role="region" aria-label="Tarifas" tabindex="0">
  <table class="tabla">
    <caption class="tabla__caption">Tarifas por entregable</caption>
    <thead><tr><th scope="col">Entregable</th><th scope="col">Plazo</th><th scope="col" class="tabla__num">Precio</th></tr></thead>
    <tbody>
      <tr><th scope="row">Sistema de diseño</th><td>4 semanas</td><td class="tabla__num">$ …</td></tr>
      <tr><th scope="row">Prototipo navegable</th><td>2 semanas</td><td class="tabla__num">$ …</td></tr>
    </tbody>
  </table>
</div>

<style>
  .tabla-contenedor { overflow-x: auto; }
  .tabla { width: 100%; border-collapse: collapse; font: var(--text-sm)/var(--text-sm--line-height) var(--font-texto); color: var(--color-texto); }
  .tabla__caption { text-align: left; padding-bottom: var(--spacing-md); color: var(--color-apagado); }
  .tabla thead th { background: var(--color-tinta); color: var(--color-blanco); font-weight: var(--font-weight-seminegrita); text-align: left; padding: var(--spacing-md) var(--spacing-lg); }
  .tabla thead th:first-child { border-top-left-radius: var(--radius-md); }
  .tabla thead th:last-child { border-top-right-radius: var(--radius-md); }
  .tabla tbody th, .tabla tbody td { padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--color-linea); text-align: left; font-weight: var(--font-weight-normal); }
  .tabla tbody th { color: var(--color-tinta); font-weight: var(--font-weight-seminegrita); }
  .tabla tbody tr:hover { background: var(--color-fondo); }
  .tabla__num { text-align: right !important; font-variant-numeric: tabular-nums; }
</style>
```
Nota: los precios del ejemplo son marcadores; use solo valores reales.

### React + Tailwind v4
```tsx
type Fila = { entregable: string; plazo: string; precio: string };

export function Tabla({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  return (
    <div role="region" aria-label={titulo} tabIndex={0} className="overflow-x-auto">
      <table className="w-full border-collapse font-texto text-sm text-texto">
        <caption className="pb-md text-left text-apagado">{titulo}</caption>
        <thead>
          <tr className="bg-tinta text-blanco">
            <th scope="col" className="rounded-tl-md px-lg py-md text-left font-seminegrita">Entregable</th>
            <th scope="col" className="px-lg py-md text-left font-seminegrita">Plazo</th>
            <th scope="col" className="rounded-tr-md px-lg py-md text-right font-seminegrita">Precio</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.entregable} className="hover:bg-fondo">
              <th scope="row" className="border-b border-linea px-lg py-md text-left font-seminegrita text-tinta">{f.entregable}</th>
              <td className="border-b border-linea px-lg py-md">{f.plazo}</td>
              <td className="border-b border-linea px-lg py-md text-right tabular-nums">{f.precio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .tabla thead { display: table-header-group; }          /* repite el encabezado en cada página */
  .tabla tr { break-inside: avoid; }
  .tabla thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tabla-contenedor { overflow: visible; }
}
```
