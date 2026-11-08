---
nombre: etiqueta
titulo: Etiqueta o píldora
resumen: Texto corto en píldora para clasificar (tecnología, categoría, estado). Fondo suave, texto tinta.
palabras: [etiqueta, píldora, pildora, tag, chip, badge, categoría, categoria, estado, tecnología]
tokens: [color.suave, color.tinta, color.azul, color.azul-suave, tipografia.familia.texto, tipografia.peso.seminegrita, tipografia.tamano.xs, radio.pill, espaciado.sm, espaciado.md, tipografia.interlineado.xs, color.linea]
variantes: [neutra, acento, oscura]
estados: [reposo]
---

# Etiqueta o píldora

## Para qué sirve
Clasifica o marca un elemento con una palabra o dos: tecnologías de un proyecto, categoría, año, estado. Es informativa; no se pulsa.

## Cuándo no usarlo
- Como botón o enlace: use `boton`.
- Para frases completas o más de tres palabras.
- Para decorar: cada etiqueta debe decir algo.
- Más de cinco juntas en una fila: agrupe o recorte.

## Variantes y estados
- **Neutra:** fondo `color.suave`, texto `color.tinta`. Es la predeterminada.
- **Acento:** fondo `color.azul-suave`, texto `color.azul`.
- **Oscura:** sobre `color.tinta`, fondo `color.oscuro.cuadro`, texto `color.oscuro.texto`.
Solo tiene estado de reposo. No use `color.apagado` sobre `color.suave` (contraste insuficiente).

## Tokens que usa
`color.suave`, `color.tinta`, `color.azul`, `color.azul-suave`, `tipografia.tamano.xs` (Instrument Sans 600), `radio.pill`, `espaciado.sm` (vertical) y `espaciado.md` (horizontal). También usa `tipografia.interlineado.xs`, `color.linea`, `tipografia.familia.texto`, `tipografia.peso.seminegrita`.

## Accesibilidad
- Contraste tinta sobre suave: AAA.
- No comunique estado solo por color: incluya texto («Activo», «En revisión»).
- Si es una lista de etiquetas, use `<ul>` con `role="list"` para que lectores de pantalla anuncien la cantidad.

## Ejemplos de código

### HTML + CSS
```html
<ul class="etiquetas" role="list">
  <li class="etiqueta">Figma</li>
  <li class="etiqueta">React</li>
  <li class="etiqueta etiqueta--acento">2026</li>
</ul>

<style>
  .etiquetas { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); list-style: none; margin: 0; padding: 0; }
  .etiqueta {
    font: var(--font-weight-seminegrita) var(--text-xs)/var(--text-xs--line-height) var(--font-texto);
    background: var(--color-suave); color: var(--color-tinta);
    padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-pill);
  }
  .etiqueta--acento { background: var(--color-azul-suave); color: var(--color-azul); }
</style>
```

### React + Tailwind v4
```tsx
export function Etiqueta({ children, acento = false }: { children: React.ReactNode; acento?: boolean }) {
  return (
    <li
      className={`rounded-pill px-md py-sm font-texto text-xs font-seminegrita ${
        acento ? 'bg-azul-suave text-azul' : 'bg-suave text-tinta'
      }`}
    >
      {children}
    </li>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .etiqueta { background: none; border: 1px solid var(--color-linea); color: var(--color-tinta); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```
