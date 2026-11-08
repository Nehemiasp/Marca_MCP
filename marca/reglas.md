# Reglas de uso de la marca

Qué sí y qué no. Cada regla tiene un identificador (`R-…`) para citarla en revisiones. Las reglas de color, tipografía, radios y degradados las comprueba `auditar_codigo`; las de contraste, `revisar_contraste`; las de voz están en `voz`.

## Color
- **R-COLOR-1 · Solo la paleta.** Todo color sale de `tokens.json`. Si necesita uno nuevo, primero se agrega como token. *Sí:* `var(--color-tinta)`. *No:* `#000`, `#333`, `gray`.
- **R-COLOR-2 · El azul es solo acento.** `color.azul` (y `color.oscuro.acento`) se reserva para la palabra destacada, los eyebrows, la píldora del motivo, enlaces y el borde del aviso. **Nunca para bloques grandes** ni fondos de sección. *No:* un hero entero en azul.
- **R-COLOR-3 · Sin degradados.** Ni en fondos, ni en botones, ni en el motivo. Color plano.
- **R-COLOR-4 · Blanco puro solo sobre tinta o azul.** El fondo de página es `color.fondo` (`#FAFAF8`), no `#FFF`. `color.blanco` se usa como texto sobre `color.tinta` o `color.azul`, y como fondo de tarjetas sobre `color.fondo`.
- **R-COLOR-5 · Sobre fondo oscuro, la variante oscura.** Sobre `color.tinta` use `color.oscuro.*`; no use `color.azul` ni `color.apagado` allí.
- **R-COLOR-6 · Contraste mínimo.** Texto normal ≥ 4.5:1 (AA); texto de lectura, títulos y navegación ≥ 7:1 (AAA) cuando el par lo permite. No use `color.apagado` sobre `color.suave`.

## Tipografía
- **R-TIPO-1 · Dos familias.** Bricolage Grotesque (solo peso 800) para títulos, nombre y cifras grandes; Instrument Sans (400, 500, 600, 700) para todo lo demás. Ninguna otra.
- **R-TIPO-2 · Una sola palabra destacada por título**, en `color.azul`. *Sí:* «Interfaces pensadas para **implementarse.**» *No:* dos o tres palabras en azul, ni negrita más color.
- **R-TIPO-3 · Espaciado de letras.** Títulos con `-0.02em`; eyebrows con `0.12em`, en mayúsculas, Instrument Sans 700, `color.azul`.
- **R-TIPO-4 · Solo tamaños de la escala** (`tipografia.tamano.*`) con su interlineado. Sin tamaños sueltos como `17px` o `2.3rem`.
- **R-TIPO-5 · Texto de lectura** en `color.texto`, 16px/26px, a un máximo de ~70 caracteres por línea.

## Forma y espacio
- **R-FORMA-1 · Radios del set** (`radio.*`). *No:* `border-radius: 8px` ni `3px`.
- **R-FORMA-2 · Sin sombras por defecto.** Se usa solo `sombra.suave` (tarjetas, hover) o `sombra.elevada` (menús, diálogos). Nunca sombras de color.
- **R-FORMA-3 · Espaciado de la escala** (`espaciado.*`, base 4px).
- **R-FORMA-4 · Bordes de 1px** en `color.linea` (o `color.oscuro.linea`). El único borde grueso es el izquierdo de 4px del aviso destacado.

## Motivo de cuadros
- **R-MOTIVO-1 · Nunca detrás de texto largo.** Ocupa su propio espacio (columna, esquina, cierre) y deja aire alrededor.
- **R-MOTIVO-2 · Uno por pantalla o página.** Completo (4×3) desde 120px de ancho; por debajo, mini (2×2).
- **R-MOTIVO-3 · Colores del motivo solo los definidos** (claro y oscuro). Sin recolorear, sin degradados, sin deformar.
- **R-MOTIVO-4 · Es decorativo:** `alt=""` o `aria-hidden`.

## Composición
- **R-COMP-1 · Un solo botón principal por vista.**
- **R-COMP-2 · Un solo aviso destacado por pantalla.**
- **R-COMP-3 · La frase de marca** es «Interfaces pensadas para implementarse.», con «implementarse.» en azul. No se traduce ni se abrevia.
- **R-COMP-4 · Documentos:** portada con nombre arriba, título grande, metadatos abajo y motivo a la derecha; cierre con bloque de contacto.

## Accesibilidad
- **R-A11Y-1 · Foco visible** siempre (`outline` de 2px `color.azul`).
- **R-A11Y-2 · Áreas táctiles** de al menos 44 × 44 px.
- **R-A11Y-3 · El color no es el único portador de significado.**
- **R-A11Y-4 · Imágenes con `alt`**; decorativas con `alt=""`.

## Cómo agregar una regla
Agregue una viñeta con su identificador en la sección que corresponda y, si puede comprobarse con código, un caso en `tests/`.
