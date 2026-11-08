# La fuente que mi marca no tenía

> **Borrador para el «Laboratorio» de nehemiasperez.com.** Primera persona, a partir de lo que ocurrió en el proyecto Marca MCP. Ajústelo a su voz y responda los pasajes marcados con **[Suyo]**. Referencia: commit `1ce17b7`, donde quedó resuelto.

**En corto.** Mi marca tiene dos fuentes y una regla que prohíbe una tercera. Al construir la página pública necesité una para mostrar código. El sistema me lo impidió, y descubrí que le faltaba una decisión.

## El problema

La regla R-TIPO-1 dice: dos familias, Bricolage Grotesque para títulos e Instrument Sans para todo lo demás. Ninguna otra.

En la fase 8 construí la página pública `/marca`. Muestra el código de cada componente, y el código se lee en una fuente monoespaciada. Escribí lo que escribe cualquier desarrollador por reflejo:

```css
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .88em; }
```

## Cómo apareció

La página debía cumplir mi propia marca, así que hay una prueba que la audita con mis herramientas. Falló con 8 errores. Tres eran reales, en esa sola regla:

```
L1:6  [error] fuente: La fuente «SFMono-Regular» no es de la marca (solo Bricolage Grotesque e Instrument Sans).
L1:6  [error] fuente: La fuente «Menlo» no es de la marca (solo Bricolage Grotesque e Instrument Sans).
L1:62 [error] tamano: .88em (14.08px) no está en la escala tipográfica. Más cercano: tipografia.tamano.sm (14px).
```

![Salida real de la prueba](../errores/2026-11-08-fuente-monoespaciada.png)

Los otros cinco eran falsos positivos. La página muestra código como texto, y el auditor no distingue el código que se ejecuta del código que se muestra. Vio `#000` en una explicación de las reglas y `font-family` dentro de un ejemplo. La solución fue excluir los bloques `<pre>` y `<code>` de la prueba. Un auditor que da falsas alarmas se deja de usar.

## Qué decidí

El sistema no tenía fuente para código. Había tres caminos:

**1. Usar Instrument Sans.** Cumple la regla, pero el código se lee mal: la sangría mide menos y cada carácter tiene un ancho distinto.

![El mismo código en dos familias](img/mono-alineacion.png)

**2. Escribir solo `monospace`.** Es lo más fácil, y el auditor lo habría dejado pasar. Ese es justamente el problema: pasar la auditoría sin haber decidido nada. Cada sistema operativo pone una fuente distinta.

**3. Un token nuevo.** Lo elegí. Agregué `tipografia.familia.codigo` con una descripción que dice dos cosas: es la pila monoespaciada del sistema, y **no es una fuente de la marca visual**. No se usa en piezas de diseño.

La regla cambió una línea: «Única excepción: fragmentos de código en documentación, con la pila del sistema `tipografia.familia.codigo`.» Paridad, mi comparador de diseño y código, ignora ese token.

Hay un detalle que me gusta. Si alguien escribe a mano una fuente concreta de la pila, como Consolas, el auditor sigue fallando:

```
auditar_codigo(css) sobre code{font-family:Consolas,monospace}
→ [error] fuente: La fuente «Consolas» no es de la marca
```

Con `var(--font-codigo)` pasa. Las fuentes concretas solo entran a través del token.

## Lo que costó

- **Una excepción repetida en tres lugares:** el token, la regla y Paridad. Si cambio uno y olvido otro, se desfasan. Hoy no hay una prueba que lo vigile.
- **No empaqueté ninguna fuente monoespaciada.** La pila usa lo que tenga cada sistema. Mi página se ve distinta en un Mac, en Windows y en Linux.

## Lo que encontré al escribir este caso

Dos hallazgos nuevos, ya en el registro de errores:

**El auditor deja pasar `sans-serif` y `monospace` como única familia.**

```
auditar_codigo(css) sobre body{font-family:sans-serif}
→ {"total":0,"errores":0,"avisos":0,"cumple":true}
```

Una pieza sin ninguna fuente de la marca pasa la auditoría. Y no coincide con otra de mis herramientas: la medición de la evaluación, que mira lo que se renderiza, sí cuenta una genérica en primer lugar como fuente ajena. En la evaluación, sin servidor, `system-ui` apareció como primera familia en cinco de las siete tareas. La medición de renderizado la contó. El auditor no.

![Salida real](../errores/2026-11-08-el-auditor-deja-pasar-monospace-y-sans-serif.png)

## Lo que aprendí

1. **El sistema tenía un hueco que solo apareció al usarlo.** No lo vi al diseñarlo. Lo vi al construir una página.
2. **Una excepción explícita es mejor que una prohibición ciega.** La regla «ninguna otra» era demasiado simple. La versión nueva dice dónde se rompe y por qué.
3. **Un auditor tiene que distinguir lo que ejecuta de lo que muestra.** Sin eso, sus alarmas pierden valor.
4. **Dos herramientas que miden lo mismo con criterios distintos no se pueden comparar.** Y yo las estaba comparando en el reporte.

## Lo que haría distinto

- Incluir una fuente para código en el sistema desde el primer día. **[Suyo: ¿empaquetar una fuente monoespaciada libre para que se vea igual en todas partes?]**
- Que el auditor permita las genéricas solo como respaldo, después de una familia de la marca.
- Una prueba que verifique que la excepción aparece en el token, la regla y Paridad.
- Probar la página en tres sistemas operativos antes de darla por terminada.

## Evidencia

- Resolución: commit `1ce17b7`
- Registro de errores: [fuente monoespaciada](../errores/2026-11-08-fuente-monoespaciada.png), [el auditor deja pasar monospace y sans-serif](../errores/2026-11-08-el-auditor-deja-pasar-monospace-y-sans-serif.png)
- Imagen reproducible: `npm run casos`
