---
name: marca
description: Construye o revisa piezas visuales (páginas, componentes, PDF, presentaciones, publicaciones) con la marca personal de Nehemias Pérez usando el servidor MCP «marca». Úsela siempre que se pida algo visual o de texto de marca, y para auditar lo construido.
---

# /marca · Trabajar con la marca personal

Esta skill usa el servidor MCP **marca** (herramientas `mcp__marca__…`). Si no aparecen, pida al usuario que lo conecte (`.mcp.json` del proyecto o `claude mcp add`) y no invente valores de marca.

## Antes de construir
1. **Cargue los tokens** que necesita con `obtener_tokens` (color y tipografía casi siempre; espaciado, radio y sombra según la pieza). No escriba colores, tamaños ni radios de memoria.
2. **Encuentre el componente** con `buscar_componente` («tarjeta de proyecto», «aviso», «tabla de precios») y **léalo** con `obtener_componente` en el formato que corresponde (`html`, `react` o `impresion`). Parta de su código, no lo reinvente.
3. Para el motivo o el logo use `obtener_asset`; no los redibuje.
4. Lea las reglas (`marca://reglas`) y la voz (`marca://voz`) si va a escribir texto. Resumen que nunca debe olvidar:
   - Título: **«Diseñador UI/UX»**, jamás «Product Designer».
   - Azul solo como acento; **una sola palabra destacada** por título; **sin degradados**; el motivo nunca detrás de texto largo.
   - Solo Bricolage Grotesque 800 (títulos) e Instrument Sans (todo lo demás).
   - Con clientes, trato de **usted**. Sin cifras ni clientes que no sean reales.
5. Si el proyecto usa CSS o Tailwind, genere los tokens con `exportar_tokens` (`css` o `tailwind4`) y úselos como variables o utilidades.

## Mientras construye
- Todo valor sale de un token: `var(--color-azul)`, `var(--text-lg)`, `var(--radius-md)` o la utilidad equivalente de Tailwind.
- No agregue un color, una fuente ni un radio que no esté en los tokens. Si hace falta uno nuevo, avise en vez de inventarlo.

## Después de construir (obligatorio)
1. `auditar_codigo` sobre el CSS/HTML/JSX final (`lenguaje`: `css`, `html` o `jsx`).
2. `revisar_contraste` en cada par texto/fondo (acepta tokens como `color.texto`).
3. `revisar_texto` sobre los textos visibles (`contexto: "cliente"` si es para un cliente).
4. **Corrija** lo que marquen los errores y vuelva a revisar hasta que no queden errores. Los avisos (valor correcto escrito a mano) también conviene resolverlos con la variable.
5. **Reporte** al usuario, en español y de «usted», con esta forma:

```
Revisión de marca
- auditar_codigo: N errores, M avisos (resueltos / pendientes)
- contraste: pares revisados y resultado (AA/AAA)
- voz: hallazgos y qué se cambió
Pendiente o fuera de la marca: …
```

Si algo no se pudo cumplir (por ejemplo, un par de colores que no alcanza AA), dígalo explícitamente en lugar de ocultarlo.

## Notas
- Las herramientas de revisión **no corrigen archivos**: devuelven hallazgos. La corrección la hace usted.
- Las utilidades de Tailwind se auditan suponiendo el `@theme` de `exportar_tokens` (formato `tailwind4`).
- Los prompts del servidor (`/mcp__marca__crear_componente`, `/mcp__marca__revisar_pantalla`, `/mcp__marca__pieza_de_marca`) arman el contexto completo en un paso.
