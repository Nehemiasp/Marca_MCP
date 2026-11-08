# Registro de errores

Errores reales del proyecto, con su captura, causa, solución y aprendizaje: material para casos de estudio del portafolio.
Se agregan con `npm run error -- --titulo="…" --salida="…"` (ver `errores.ts`).

| # | Fase | Error | Fecha |
|---|---|---|---|
| 1 | 1 | [Un componente apunta a un token que no existe](#2026-11-08-token-inexistente) | 2026-11-08 |
| 2 | 3 | [Mi propio componente incumple mi propia regla](#2026-11-08-radio-fuera-de-escala) | 2026-11-08 |
| 3 | 8 | [La página pública rompió la regla de las dos fuentes](#2026-11-08-fuente-monoespaciada) | 2026-11-08 |
| 4 | 1 | [`font-titulo` significaba dos cosas](#2026-11-08-nombre-ambiguo) | 2026-11-08 |
| 5 | 1 | [Un par de colores que «se ve bien» no pasa AA](#2026-11-08-contraste-apagado-suave) | 2026-11-08 |
| 6 | 6 | [La medición falló dentro del navegador](#2026-11-08-playwright-name) | 2026-11-08 |
| 7 | 3 | [`revisar_texto` contaba dos veces la misma frase](#2026-11-08-voz-duplicada) | 2026-11-08 |
| 8 | 7 | [Rechazaba un host que sí estaba permitido](#2026-11-08-host-sin-cabecera) | 2026-11-08 |
| 9 | 6 | [El agente se saltó la revisión que la skill pedía como obligatoria](#2026-11-08-skill-ignorada) | 2026-11-08 |
| 10 | 9 | [Un script de apoyo falló por el formato de módulo](#2026-11-08-un-script-de-apoyo-fallo-por-el-formato-de-modul) | 2026-11-08 |
| 11 | 9 | [El auditor no mira los radios de un SVG](#2026-11-08-el-auditor-no-mira-los-radios-de-un-svg) | 2026-11-08 |
| 12 | 9 | [El auditor deja pasar «monospace» y «sans-serif»](#2026-11-08-el-auditor-deja-pasar-monospace-y-sans-serif) | 2026-11-08 |

## Un componente apunta a un token que no existe <a id="2026-11-08-token-inexistente"></a>

![Un componente apunta a un token que no existe](errores/2026-11-08-token-inexistente.png)

- **Causa:** Renombré el peso a `extranegrita` para evitar una colisión de nombres en Tailwind y quedó una referencia vieja en la documentación de un componente.
- **Solución:** Actualicé la referencia en todos los .md y la prueba pasó.
- **Aprendizaje:** Una prueba que cruza la documentación con los tokens atrapa lo que una persona no vería: renombrar un token rompe en silencio todo lo que lo cita.

## Mi propio componente incumple mi propia regla <a id="2026-11-08-radio-fuera-de-escala"></a>

![Mi propio componente incumple mi propia regla](errores/2026-11-08-radio-fuera-de-escala.png)

- **Causa:** El ejemplo del motivo mini usaba `border-radius: 5px`, un valor que no existe en la escala de radios.
- **Solución:** Primero cambié el ejemplo a `var(--radius-sm)` (6 px) y el logo SVG a 6. Después medí que eso alejaba la pieza del motivo oficial y agregué el token `radio.cuadro-mini` (4 px): ahora lo usan el CSS, React y los cuadros del logo.
- **Aprendizaje:** Cuando las reglas son código, el sistema se corrige a sí mismo. Escribí el componente a ojo y el auditor me lo devolvió.

## La página pública rompió la regla de las dos fuentes <a id="2026-11-08-fuente-monoespaciada"></a>

![La página pública rompió la regla de las dos fuentes](errores/2026-11-08-fuente-monoespaciada.png)

- **Causa:** Los bloques de código de la página necesitaban una fuente monoespaciada, y el sistema no tenía ninguna.
- **Solución:** Agregué el token `tipografia.familia.codigo` como excepción documentada solo para código, y usé la escala para el tamaño. Los ejemplos con `#000` eran texto de documentación y se excluyen de la auditoría.
- **Aprendizaje:** Hay huecos que solo aparecen al usar el sistema en serio. También: un auditor necesita distinguir código que se ejecuta de código que se muestra.

## `font-titulo` significaba dos cosas <a id="2026-11-08-nombre-ambiguo"></a>

![`font-titulo` significaba dos cosas](errores/2026-11-08-nombre-ambiguo.png)

- **Causa:** Llamé `titulo` a una familia tipográfica y a un peso. Una persona lo resuelve con el contexto; Tailwind no.
- **Solución:** Renombré el peso a `extranegrita` y actualicé los componentes.
- **Aprendizaje:** Los nombres de un sistema para máquinas deben ser únicos entre categorías, no solo dentro de cada una.

## Un par de colores que «se ve bien» no pasa AA <a id="2026-11-08-contraste-apagado-suave"></a>

![Un par de colores que «se ve bien» no pasa AA](errores/2026-11-08-contraste-apagado-suave.png)

- **Causa:** El gris de texto secundario (#6A707A) sobre el fondo de las etiquetas (#ECEDEF) no llega a 4.5:1. A simple vista parecía bien.
- **Solución:** Lo documenté como par prohibido en `tokens.json` (el validador lo vigila): dentro de etiquetas se usa `color.tinta`.
- **Aprendizaje:** Un validador convierte una impresión visual en una regla que nadie puede olvidar.

## La medición falló dentro del navegador <a id="2026-11-08-playwright-name"></a>

![La medición falló dentro del navegador](errores/2026-11-08-playwright-name.png)

- **Causa:** tsx (esbuild) envuelve las funciones con `__name()` y el navegador, donde corre `page.evaluate`, no lo conoce.
- **Solución:** Definí `window.__name = (f) => f` antes de cargar la página.
- **Aprendizaje:** Una herramienta que funciona en mi máquina puede fallar donde el código viaja: aquí, de Node al navegador.

## `revisar_texto` contaba dos veces la misma frase <a id="2026-11-08-voz-duplicada"></a>

![`revisar_texto` contaba dos veces la misma frase](errores/2026-11-08-voz-duplicada.png)

- **Causa:** «siguiente nivel» y «al siguiente nivel» están en la lista y se solapan: una misma frase generaba dos hallazgos.
- **Solución:** Dentro de cada regla, un fragmento que se solapa con otro se cuenta una vez: gana el más largo.
- **Aprendizaje:** Un revisor ruidoso se deja de usar. Reducir falsos duplicados importa tanto como detectar.

## Rechazaba un host que sí estaba permitido <a id="2026-11-08-host-sin-cabecera"></a>

![Rechazaba un host que sí estaba permitido](errores/2026-11-08-host-sin-cabecera.png)

- **Causa:** En la prueba, una `Request` creada desde una URL no trae la cabecera `Host`; la validación la exigía y rechazaba todo.
- **Solución:** La prueba ahora envía la cabecera `Host` como lo hace un servidor real.
- **Aprendizaje:** El error estaba en la prueba, no en el servidor: conviene preguntarse cuál de los dos miente antes de arreglar.

## El agente se saltó la revisión que la skill pedía como obligatoria <a id="2026-11-08-skill-ignorada"></a>

![El agente se saltó la revisión que la skill pedía como obligatoria](errores/2026-11-08-skill-ignorada.png)

- **Causa:** Una instrucción en una skill es una petición, no una garantía. El agente leyó tokens y componentes, pero no verificó.
- **Solución:** Lo dejé como hallazgo de la evaluación: revisar_contraste no se usó en ninguna de las 7 tareas. Propuesta pendiente: un hook que corra `auditar_codigo` al terminar.
- **Aprendizaje:** Lo que importa se automatiza; lo que se pide por favor, a veces no ocurre.

## Un script de apoyo falló por el formato de módulo <a id="2026-11-08-un-script-de-apoyo-fallo-por-el-formato-de-modul"></a>

![Un script de apoyo falló por el formato de módulo](errores/2026-11-08-un-script-de-apoyo-fallo-por-el-formato-de-modul.png)

- **Causa:** El script vivía fuera del proyecto, sin package.json con type module, y tsx lo compiló como CommonJS.
- **Solución:** Lo renombré a .mts para forzar módulos ES.
- **Aprendizaje:** Un archivo de apoyo hereda las reglas del lugar donde vive, no las del proyecto al que sirve. Además: la primera vez escribí en el registro una salida vacía sin notarlo; verificar lo que se guarda es parte del trabajo.

## El auditor no mira los radios de un SVG <a id="2026-11-08-el-auditor-no-mira-los-radios-de-un-svg"></a>

![El auditor no mira los radios de un SVG](errores/2026-11-08-el-auditor-no-mira-los-radios-de-un-svg.png)

- **Causa:** El auditor revisa border-radius, pero no el atributo rx de un SVG. El logo tenía rx=5 dos veces y lo corregí yo a mano, sin que ninguna prueba lo exigiera.
- **Solución:** Pendiente. Propuesta: que el auditor lea rx y ry y los compare con los radios de la escala.
- **Aprendizaje:** Una verificación en verde solo cubre donde mira. El valor incorrecto estaba en dos lugares y el sistema vigilaba uno.

## El auditor deja pasar «monospace» y «sans-serif» <a id="2026-11-08-el-auditor-deja-pasar-monospace-y-sans-serif"></a>

![El auditor deja pasar «monospace» y «sans-serif»](errores/2026-11-08-el-auditor-deja-pasar-monospace-y-sans-serif.png)

- **Causa:** Las familias genéricas están permitidas en cualquier posición. Con solo «sans-serif», una pieza pasa la auditoría sin usar ninguna fuente de la marca. La medición de render de la evaluación sí cuenta una genérica en primer lugar como fuente ajena, así que las dos herramientas no coinciden.
- **Solución:** Pendiente. Propuesta: permitir las genéricas solo como respaldo, después de una familia de la marca.
- **Aprendizaje:** Dos herramientas que miden lo mismo con criterios distintos producen resultados que no se pueden comparar. Lo encontré al escribir este caso, no al construir la herramienta.
