---
nombre: bloque-de-contacto
titulo: Bloque de contacto con QR
resumen: Nombre, título, medios de contacto y un código QR. Cierra propuestas, tarjetas y presentaciones.
palabras: [contacto, qr, tarjeta de presentación, tarjeta de presentacion, correo, teléfono, telefono, cierre, firma, enlace, vcard]
tokens: [color.tinta, color.texto, color.apagado, color.azul, color.linea, color.blanco, tipografia.familia.titulo, tipografia.tamano.2xl, tipografia.tamano.sm, radio.md, espaciado.lg, espaciado.md]
variantes: [claro, oscuro]
estados: [reposo]
---

# Bloque de contacto con QR

## Para qué sirve
Cierra una pieza con lo necesario para escribirle: **nombre** (Bricolage Grotesque 800), **título «Diseñador UI/UX»**, medios de contacto (correo, sitio, ubicación) y un **código QR** que lleva al portafolio o a una tarjeta digital.

## Cuándo no usarlo
- En el medio de un documento: va al final o en la contraportada.
- Con un QR que no se haya probado: escanéelo antes de publicar.
- Con el título «Product Designer» (ver `voz`: es «Diseñador UI/UX»).
- Con datos de clientes: solo contacto de la marca personal.

## Variantes y estados
- **Claro:** fondo `color.fondo`, texto `color.texto`, enlaces `color.azul`.
- **Oscuro:** fondo `color.tinta`; el QR va sobre un cuadro `color.blanco` con relleno (el QR necesita fondo claro para escanearse); enlaces `color.oscuro.acento`.
Sin estados; los enlaces siguen las reglas de `boton` (variante texto).

## Tokens que usa
`color.tinta` (nombre), `color.texto`, `color.apagado` (rótulos «Correo», «Web», sobre `color.fondo`), `color.azul`, `color.linea`, `tipografia.familia.titulo`, `tipografia.tamano.2xl`, `tipografia.tamano.sm`, `radio.md` (marco del QR), `espaciado.lg`, `espaciado.md`.

## Accesibilidad
- El QR es un complemento: ofrezca siempre el enlace escrito.
- QR con `alt` que diga a dónde lleva («Código QR al portafolio»).
- Tamaño mínimo impreso de 2.5 × 2.5 cm y zona de silencio de 4 módulos; contraste oscuro sobre claro.
- Enlaces con `mailto:` y `https:` reales y texto visible.

## Ejemplos de código

### HTML + CSS
```html
<section class="contacto">
  <div class="contacto__datos">
    <h2 class="contacto__nombre">Nehemias Pérez</h2>
    <p class="contacto__titulo">Diseñador UI/UX</p>
    <dl class="contacto__lista">
      <dt>Web</dt><dd><a href="https://nehemiasperez.com">nehemiasperez.com</a></dd>
      <dt>Correo</dt><dd><a href="mailto:correo@ejemplo.com">correo@ejemplo.com</a></dd>
    </dl>
  </div>
  <img class="contacto__qr" src="qr-portafolio.svg" alt="Código QR al portafolio" width="120" height="120" />
</section>

<style>
  .contacto { display: flex; gap: var(--spacing-lg); align-items: center; justify-content: space-between; padding: var(--spacing-lg); border-top: 1px solid var(--color-linea); font: var(--text-sm)/var(--text-sm--line-height) var(--font-texto); color: var(--color-texto); }
  .contacto__nombre { margin: 0; font: var(--font-weight-extranegrita) var(--text-2xl)/var(--text-2xl--line-height) var(--font-titulo); letter-spacing: var(--tracking-titulo); color: var(--color-tinta); }
  .contacto__titulo { margin: 0 0 var(--spacing-md); color: var(--color-azul); font-weight: var(--font-weight-negrita); }
  .contacto__lista { display: grid; grid-template-columns: auto 1fr; gap: var(--spacing-sm) var(--spacing-md); margin: 0; }
  .contacto__lista dt { color: var(--color-apagado); }
  .contacto__lista dd { margin: 0; }
  .contacto__lista a { color: var(--color-azul); }
  .contacto__qr { background: var(--color-blanco); padding: var(--spacing-md); border: 1px solid var(--color-linea); border-radius: var(--radius-md); }
</style>
```

### React + Tailwind v4
```tsx
export function BloqueDeContacto({ web, correo, qr }: { web: string; correo: string; qr: string }) {
  return (
    <section className="flex items-center justify-between gap-lg border-t border-linea p-lg font-texto text-sm text-texto">
      <div>
        <h2 className="font-titulo text-2xl font-extranegrita tracking-titulo text-tinta">Nehemias Pérez</h2>
        <p className="mb-md font-negrita text-azul">Diseñador UI/UX</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-sm">
          <dt className="text-apagado">Web</dt><dd><a className="text-azul" href={`https://${web}`}>{web}</a></dd>
          <dt className="text-apagado">Correo</dt><dd><a className="text-azul" href={`mailto:${correo}`}>{correo}</a></dd>
        </dl>
      </div>
      <img src={qr} alt="Código QR al portafolio" width={120} height={120} className="rounded-md border border-linea bg-blanco p-md" />
    </section>
  );
}
```

### Impresión (PDF)
```css
@media print {
  .contacto { break-inside: avoid; }
  .contacto__qr { width: 3cm; height: 3cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .contacto__lista a[href]::after { content: none; }
}
```
