# Submenu layers: estado (en curso)

Estado resumido en [`ESTADO.md`](ESTADO.md). Este documento guarda el detalle para retomar el trabajo.

## Qué está activo

- **Nativo (Android)**: capa de submenú activa. `GLASS_SUBMENU_LAYERS = true` en `overlay/GlassMenuSession.kt`.
  La clase `overlay/GlassSubmenuLayer.kt` es la segunda superficie: un panel con un solo progreso
  (0 = la fila del padre, 1 = el panel a ancho de raíz, anclado a la fila). La fila del padre es la cabecera del hijo
  y se dibuja con `GlassMenuContent.drawRow`.
  - Tocar fuera con el submenú abierto vuelve al raíz (`closeChild` en `dismissOnUp`). Tocar la cabecera también.
  - El atrás predictivo lleva el panel hijo a la fila (`dragTo`) y, si se invoca, cierra el hijo.
  - Cada panel tiene su propio `GlassRenderer` (`GlassMenuAndroidView.newRenderer`). Compartir uno rompe el dibujo del raíz.
- **Web**: capa de submenú en `menu-trigger.web.tsx` (`openFlyout`), con `GlassSurface` para el vidrio.
  Táctil: la capa cubre el raíz. Puntero fino: la capa va al lado de la fila (a la izquierda si no hay sitio),
  el raíz no se reduce. Atrás y Escape: submenú -> raíz; raíz -> cerrar.

## Qué no está hecho

- Submenú sobre `GlassMotion` (morph igual en capa y en raíz): requiere decisión de diseño.
- Segundo menú de prueba: no hecho.
- Paridad del modelo de capas en web con el nativo: pendiente de confirmar (ver contradicciones en `ESTADO.md`).
- Coste del vidrio vivo del hijo en web: la apertura del hijo no cumple el objetivo de frames (17/59 táctil,
  14/76 escritorio, headless con GL por software). Con `noglass` no hay frames > 33 ms: el shader del vidrio vivo es la causa medida.
- Cancelación de gesto lento: no reproducible con adb.

## Hallazgos que hay que conservar

1. **Dos superficies no comparten un `GlassRenderer`.** El renderer graba en sus propios `RenderNode`
   (`glassNode`, `foregroundNode`). Dibujar el hijo con el renderer del raíz sobrescribe las grabaciones del raíz en el mismo frame.
2. **Fantasma durante la transición (nativo).** Al abrir, el lóbulo de expulsión crece desde la fila (~300 ms);
   al volver, la cabecera del hijo y una cápsula en la fila permanecen unos 300 ms. Es la física del morph, no un RenderNode
   obsoleto. Pendiente de decisión de diseño. (Un ajuste `LayerAbsorbScale = 0.5` citado en sesiones anteriores no existe en el código actual.)
3. **Web: el hover abre la capa.** Con puntero fino, salir de la fila y del panel la cierra a los ~180 ms.
   Un clic deja la capa abierta.
4. **Toques durante el colapso del hijo** se ignoran explícitamente (antes caían en las filas del raíz).
5. **`screencap` tarda 0,3 a 0,5 s por fotograma** en el Pixel. Para medir el morph, usar `screenrecord` (ver `ESTADO.md`).
6. **Reanudar en web**: el probe `?perf=1` y `&exp=` están en `glass-perf.web.ts`.

## Medidas de referencia

- Nativo, build final (gfxinfo, apertura): 0 frames > 33 ms en apertura estable; primera apertura tras lanzar, 4.
- Web, apertura del hijo (headless, GL por software): táctil 17 de 59 frames > 33 ms; escritorio 14 de 76.
  Objetivo no cumplido. No medido en GPU real.

## Para retomar

- Mantener el camino de navegación funcionando. Un cambio de morph va detrás de una bandera o en otra rama.
- Reproducir en el Pixel con el raíz abierto y con capturas temporizadas (`screenrecord` a 15 fps).
- Web: medir con `?perf=1` sin el menú tapando el overlay.
- Hidratación en el índice web ("A tree hydrated but some attributes..."): sin investigar.
