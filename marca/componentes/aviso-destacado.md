---
nombre: aviso-destacado
titulo: Aviso destacado
resumen: Bloque con fondo azul suave y borde izquierdo azul para una nota, advertencia o dato clave dentro de un texto.
palabras: [aviso, nota, alerta, advertencia, callout, destacado, mensaje, información, informacion, importante, tip]
tokens: [color.azul-suave, color.azul, color.texto, color.tinta, tipografia.familia.texto, tipografia.tamano.base, radio.md, espaciado.lg, espaciado.sm, tipografia.peso.negrita, tipografia.interlineado.base]
variantes: [informativo, con-titulo]
estados: [reposo]
---

# Aviso destacado

## Para qué sirve
Resalta una nota o dato clave dentro de un texto: una condición, un plazo, una aclaración. Fondo `color.azul-suave` con **borde izquierdo de 4px en `color.azul`**.

## Cuándo no usarlo
- Para mensajes de error o éxito de formularios: la marca no define rojo ni verde; use texto claro y un icono.
- Más de uno por pantalla o por página impresa: pierde su función.
- Para bloques largos: máximo tres líneas.
- Como fondo de secciones enteras: el azul es acento, no bloque grande.

## Variantes y estados
- **Informativo:** solo texto.
- **Con título:** primera línea en negrita (`tipografia.peso.negrita`) con `color.tinta`.
Texto siempre `color.texto` (o `color.tinta` para el título). Sin estados.

## Tokens que usa
`color.azul-suave`, `color.azul`, `color.texto`, `color.tinta`, `tipografia.tamano.base`, `radio.md` (solo esquinas derechas), `espaciado.lg` (relleno), `espaciado.sm` (separación título-texto). También usa `tipografia.peso.negrita`, `tipografia.interlineado.base`, `tipografia.familia.texto`.

## Accesibilidad
- Contraste `color.texto` sobre `color.azul-suave`: AAA.
- Use `role="note"` para notas; `role="status"` solo si aparece dinámicamente.
- El significado no depende del color: incluya un título como «Importante» o «Nota».

## Ejemplos de código

### HTML + CSS
```html
<aside class="aviso" role="note">
  <p class="aviso__titulo">Importante</p>
  <p class="aviso__texto">La propuesta incluye dos rondas de revisión y tiene vigencia de 15 días.</p>
</aside>

<style>
  .aviso { background: var(--color-azul-suave); border-left: 4px solid var(--color-azul); border-radius: 0 var(--radius-md) var(--radius-md) 0; padding: var(--spacing-lg); }
  .aviso__titulo { margin: 0 0 var(--spacing-sm); font: var(--font-weight-negrita) var(--text-base)/var(--text-base--line-height) var(--font-texto); color: var(--color-tinta); }
  .aviso__texto { margin: 0; font: var(--text-base)/var(--text-base--line-height) var(--font-texto); color: var(--color-texto); }
</style>
```

### React + Tailwind v4
```tsx
export function AvisoDestacado({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <aside role="note" className="rounded-r-md border-l-4 border-azul bg-azul-suave p-lg">
      {titulo && <p className="mb-sm font-texto text-base font-negrita text-tinta">{titulo}</p>}
      <p className="font-texto text-base text-texto">{children}</p>
    </aside>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .aviso { break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```
