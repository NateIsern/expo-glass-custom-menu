# Estado actual del menú de vidrio

Última revisión: 2026-11-09. Fuente: el código del working tree, no el historial.

Casi todo el trabajo de submenús y web está **sin commitear**: `docs/`, `GlassSubmenuLayer.kt`,
`src/components/menu-submenu/` y los `*.web.*` de `menu-trigger/` aparecen como no trackeados en git.

Documentos relacionados:
- [`submenu-layers-wip.md`](submenu-layers-wip.md): historia y detalles de las capas (nativo y web).
- [`glass-web-architecture.md`](glass-web-architecture.md): arquitectura del vidrio en web (Skia).
- [`../README.md`](../README.md): API pública y uso.

## Qué existe

- **Submenús**: `Menu.Submenu` (`ISubmenu` en `src/interface.ts`, parseado en `parse-menu-content.util.ts`).
  Un submenú es una fila con chevron que abre sus hijos.
- **Capas nativas**: `GlassSubmenuLayer.kt`, activadas con `GLASS_SUBMENU_LAYERS = true` en
  `overlay/GlassMenuSession.kt`. Un solo panel con un progreso: la fila del padre es la cabecera del hijo
  y se dibuja con el mismo código (`GlassMenuContent.drawRow`). Las filas nunca superan la opacidad del vidrio
  al cerrar (`min(rowsOpacity, contentProgress)`).
- **Capas web**: `openFlyout` en `menu-trigger.web.tsx`. Se abren por toque y, con puntero fino, también por hover.

## Gesto predictivo (Android 14+)

- Requisitos: `app.json` con `android.predictiveBackGestureEnabled: true` y, en el manifest generado,
  `android:enableOnBackInvokedCallback="true"`. El manifest está en `android/` (gitignored); se regenera con prebuild.
- Registro: `GlassMenuOverlay.registerBack` con `PredictiveBack` (`OnBackAnimationCallback`), prioridad
  `PRIORITY_OVERLAY`. Por debajo de API 34 el callback cierra sin progreso.
- Con submenú abierto, el gesto lleva el panel hijo de vuelta a su fila (`GlassSubmenuLayer.dragTo`).
- Solo con el raíz abierto, el gesto hace scrub de la línea de tiempo de cierre (`GlassMotion.beginScrub/scrubTo/endScrub`).
- Commit y cancelación: los decide el sistema. Al invocar, se completa; al cancelar, se reabre. No hay umbral propio.
- Pendiente: verificar en dispositivo la cancelación lenta (no reproducible con adb).

## Motion

- `GlassMotion.beginScrub / scrubTo / endScrub` y `GlassSpring.copyFrom`: API aditiva para el control manual
  del progreso (opción A decidida). Medido en el Pixel: 112 µs de mediana y 190 µs de máximo por llamada.

## Web

- **Atrás y Escape**: a nivel de componente (`menu-trigger.web.tsx`). Dos pasos: submenú -> raíz, raíz -> cerrar.
  El atrás del navegador usa una entrada de historial propia (`popstate`).
- **Tocar fuera con submenú abierto**: vuelve al raíz (igual que la cabecera). Nativo: `closeChild` en `dismissOnUp`.
- **Modo escritorio**: `DESKTOP_MENU_SCALE = 0.7` cuando hay puntero fino. Menú compacto (decidido).
- **Probe**: `?perf=1` activa contadores y el overlay de tiempos de frame (`glass-perf.web.ts`).
  `&exp=noblur,noglass` sirve para A/B.

## Medidas

| Caso | Resultado | Notas |
| --- | --- | --- |
| Nativo, apertura (Pixel) | 0 frames > 33 ms en apertura estable | La primera apertura tras lanzar la app: 4 frames > 33 ms. |
| Web, apertura del hijo, táctil (390x844) | 17 de 59 frames > 33 ms | **No cumple objetivo.** Headless, GL por software. |
| Web, apertura del hijo, escritorio (1280x800) | 14 de 76 frames > 33 ms | **No cumple objetivo.** |
| Web, mismo caso con `noglass` | 0 frames > 33 ms | El vidrio vivo del hijo es la causa medida. No medido en GPU real. |

## Pendientes (no hechos)

a. Submenú sobre GlassMotion: no hecho. Requiere decisión de diseño.
b. Segundo menú de prueba: no hecho.
c. Paridad del modelo de capas en web con el nativo: pendiente. Ver la contradicción abierta abajo.
d. Respuesta visible del gesto desde progreso 0,05: no probada en el Pixel.
e. Cancelación de gesto lento: no reproducible con adb.
f. Coste del vidrio vivo del hijo en web: sin solución; el objetivo de frames no se cumple.

## Decisiones tomadas

1. Opción A: control de progreso manual en GlassMotion, aditivo (no cambia el timeline existente).
2. Menú web compacto en escritorio (`DESKTOP_MENU_SCALE = 0.7`).
3. Tocar fuera con submenú abierto vuelve al raíz; no cierra todo.
4. Predictive back en todos los menús, a nivel de componente.
5. Sin trucos: nada de umbrales propios ni de gestos simulados en código de producción.

## Verificación

- **Gesto con adb**: swipe desde el borde izquierdo (x=5) hacia la derecha, con la duración del gesto en ms:
  `adb shell input swipe 5 Y X2 Y DURACION_MS`. El script con la duración usada no está en el repo.
- **Grabación a 15 fps y hoja de fotogramas**:
  `adb shell screenrecord /sdcard/rec.mp4`, luego
  `ffmpeg -i rec.mp4 -vf "fps=15,tile=8x4" -frames:v 1 sheet.png`
  (el tamaño de la rejilla es un ejemplo).
- **Web**: `?perf=1` en la ruta del menú; lectura de `window.__glassCounts` en las sondas headless.
- Herramientas de medición (fuera del repo): `/home/nate/scratch-webcheck/` (p. ej. `device/run-phases.sh`,
  que tiene los taps y los `motionevent` de la fase de scrub). No son parte del repo.
