**Lo que dicen los números** (una corrida por tarea y condición; ver limitaciones):

1. **Con el servidor, las 7 piezas salieron sin hallazgos**; sin él, ninguna. Sin servidor hubo 130 valores fuera de los tokens en el código, 47 colores renderizados fuera de la paleta, 8 fuentes ajenas (system-ui en 5 tareas, Helvetica Neue en 2 y Georgia en 1) y 26 textos con contraste por debajo de AA. Con el servidor, todo en cero.
2. **Sin servidor, el agente inventa una identidad distinta cada vez**: un hero oscuro con naranja, serif en cursiva y un degradado; una tabla con azul índigo y amarillo. Son piezas correctas como diseño genérico, pero no son su marca: el acento, las fuentes y el motivo no aparecen en ninguna.
3. **El título y la voz no fueron el problema principal.** Solo 1 error de voz sin servidor (trato de «tú» en la tabla para clientes) y 2 avisos por cifras: la tarjeta sin servidor inventó métricas («+18%», «94%», «2.4k visitas») que nadie pidió. El agente sin servidor escribió «diseñador» a secas porque el pedido lo decía; la regla del título importará más cuando el pedido no lo mencione.
4. **El beneficio viene del paso «antes»**, no del «después». Con el servidor, el agente leyó tokens y componentes en las 7 tareas (`obtener_tokens`, `buscar_componente`, `obtener_componente`) y copió sus patrones. En cambio, la verificación posterior fue irregular: `revisar_texto` en 5 de 7, `auditar_codigo` en 1 de 7 y `revisar_contraste` en ninguna, aunque la skill la pide como obligatoria. Aun así quedó en cero porque los componentes ya salen limpios.
5. **Costo:** con el servidor, cada pieza usó ~3 veces más turnos (7.1 contra 2.3) y ~2.3 veces el costo ($0.09 contra $0.04 por tarea). Es barato, pero no es gratis.

**Cómo leerlo con cuidado**
- Es una evaluación **parcialmente circular**: se mide con las mismas herramientas que el agente puede usar y con los mismos tokens que copia. Mide *fidelidad a los tokens*, no que el diseño sea bueno; para eso está la calificación 1–5 de sus ojos.
- Es la **mejor corrida posible de la condición «con»** porque los componentes del servidor ya están auditados con el mismo auditor (hay una prueba que lo exige). Una marca documentada peor daría un resultado peor.

**Qué haría después:** repetir cada tarea 3 veces para ver la variación; probar «solo servidor, sin skill» para aislar su efecto; y que el agente use la verificación posterior de forma fiable (por ejemplo, con un hook que corra `auditar_codigo` al terminar).

**Nota sobre un cambio de criterio.** La primera medición dio 117 valores fuera de los tokens sin servidor. Después de volver el auditor más estricto (las familias genéricas solo valen como respaldo y ahora lee el `rx` de los SVG), se midieron **las mismas salidas** y el total subió a 130. Con servidor sigue en cero. La comparación es válida porque las dos condiciones se miden con el mismo auditor; lo que no sirve es comparar el 117 con el 130.
