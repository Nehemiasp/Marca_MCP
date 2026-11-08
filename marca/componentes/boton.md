---
nombre: boton
titulo: Botón
resumen: Acción principal, secundaria o de texto. Tres variantes; solo una principal por pantalla.
palabras: [botón, boton, acción, accion, cta, llamado a la acción, enviar, contactar, enlace de acción, button]
tokens: [color.tinta, color.blanco, color.fondo, color.linea, color.azul, color.oscuro.texto, tipografia.familia.texto, tipografia.peso.seminegrita, tipografia.tamano.sm, radio.md, espaciado.md, espaciado.lg]
variantes: [principal, secundario, texto]
estados: [reposo, hover, foco, deshabilitado]
---

# Botón

## Para qué sirve
Dispara una acción (enviar, contactar, descargar). Tiene tres variantes con jerarquía clara: **principal** (tinta con texto blanco), **secundario** (borde de línea, fondo transparente) y **de texto** (solo texto con subrayado al pasar el cursor).

## Cuándo no usarlo
- Para navegar entre secciones del mismo documento: use un enlace de texto.
- Más de un botón principal por vista: la jerarquía deja de leerse.
- Con fondo azul: el azul es solo acento y no se usa en bloques grandes (ver `reglas`).
- Sobre el motivo de cuadros o sobre texto largo.

## Variantes y estados
| Variante | Fondo | Texto | Borde |
|---|---|---|---|
| Principal | `color.tinta` | `color.blanco` | ninguno |
| Secundario | transparente | `color.tinta` | 1px `color.linea` |
| Texto | transparente | `color.azul` | ninguno; subrayado en hover |

Estados: **hover** (principal: se aclara a `color.texto`; secundario: borde `color.tinta`), **foco** (anillo de 2px `color.azul` con separación de 2px), **deshabilitado** (opacidad .45 y sin cursor de acción). Sobre fondo oscuro: principal pasa a fondo `color.blanco` con texto `color.tinta`.

## Tokens que usa
`color.tinta`, `color.blanco`, `color.texto`, `color.linea`, `color.azul`, `tipografia.familia.texto` (Instrument Sans 600), `tipografia.tamano.sm`, `radio.md`, `espaciado.md` / `espaciado.lg` (relleno vertical / horizontal).

## Accesibilidad
- Use `<button>` para acciones y `<a>` para navegación; nunca un `<div>` con clic.
- Contraste: blanco sobre tinta supera 7:1 (AAA).
- Área táctil mínima de 44 × 44 px (alto de 44px con `padding` de `espaciado.md` + línea de 20px y borde).
- El foco debe verse siempre: no quite el `outline` sin reemplazarlo.
- El texto debe describir la acción («Escribirme», no «Click aquí»).

## Ejemplos de código

### HTML + CSS
```html
<button class="boton boton--principal" type="button">Escribirme</button>
<button class="boton boton--secundario" type="button">Ver proyectos</button>
<button class="boton boton--texto" type="button">Más información</button>

<style>
  .boton {
    font: var(--font-weight-seminegrita) var(--text-sm)/var(--text-sm--line-height) var(--font-texto);
    min-height: 44px;
    padding: var(--spacing-md) var(--spacing-lg);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color .15s, border-color .15s;
  }
  .boton:focus-visible { outline: 2px solid var(--color-azul); outline-offset: 2px; }
  .boton:disabled { opacity: .45; cursor: not-allowed; }
  .boton--principal { background: var(--color-tinta); color: var(--color-blanco); }
  .boton--principal:hover:not(:disabled) { background: var(--color-texto); }
  .boton--secundario { background: transparent; color: var(--color-tinta); border-color: var(--color-linea); }
  .boton--secundario:hover:not(:disabled) { border-color: var(--color-tinta); }
  .boton--texto { background: transparent; color: var(--color-azul); padding-inline: var(--spacing-sm); }
  .boton--texto:hover:not(:disabled) { text-decoration: underline; }
</style>
```

### React + Tailwind v4
```tsx
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'principal' | 'secundario' | 'texto';
};

const base =
  'min-h-11 rounded-md border border-transparent px-lg py-md font-texto text-sm font-seminegrita ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul ' +
  'disabled:cursor-not-allowed disabled:opacity-45';

const variantes = {
  principal: 'bg-tinta text-blanco hover:bg-texto',
  secundario: 'border-linea bg-transparent text-tinta hover:border-tinta',
  texto: 'bg-transparent px-sm text-azul hover:underline'
} as const;

export function Boton({ variante = 'principal', className = '', ...props }: Props) {
  return <button type="button" className={`${base} ${variantes[variante]} ${className}`} {...props} />;
}
```
Requiere el bloque `@theme` de `exportar_tokens` (formato `tailwind4`).

### Impresión (PDF)
Los botones no se imprimen como botones: se convierten en enlaces con su destino visible.
```css
@media print {
  .boton { border: 0; background: none; color: var(--color-tinta); padding: 0; min-height: 0; text-decoration: underline; }
  a.boton[href]::after { content: " (" attr(href) ")"; font-size: var(--text-xs); color: var(--color-apagado); }
  .boton:disabled { display: none; }
}
```
