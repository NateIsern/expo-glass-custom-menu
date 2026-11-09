package expo.modules.glassmenuandroid.harness

import android.graphics.RectF
import expo.modules.glassmenuandroid.motion.*
import expo.modules.glassmenuandroid.records.GlassAbsorbRecord
import expo.modules.glassmenuandroid.records.GlassShrinkRecord

// Fixed input (dp): trigger pill and toolbar-like absorb 0.48, panel 250x378, corner 34dp.
const val DP = 2.875f

fun rect(l: Float, t: Float, r: Float, b: Float) = RectF(l * DP, t * DP, r * DP, b * DP)

internal fun frameLine(t: Float, m: GlassMotion): String {
  val f = m.frame
  return listOf(
    t, f.bounds.left, f.bounds.top, f.bounds.right, f.bounds.bottom,
    f.radiusX, f.radiusY, f.contentProgress, f.rowsOpacity,
    f.sourceLobe.left, f.sourceLobe.top, f.sourceLobe.right, f.sourceLobe.bottom,
    f.sourceRadius, f.smoothing, f.sourceOpacity, f.sourceBlur, f.sourceZoom,
    f.contentBlur, f.contentZoom, f.portalBlur, f.lensHeight,
  ).joinToString(",")
}

fun main() {
  val out = StringBuilder()
  val src = rect(201f, 66f, 355f, 110f)
  val target = rect(105f, 66f, 355f, 444f)
  val through = RectF(src)
  val step = 1f / 60f

  // Spring trace.
  val spring = GlassSpring()
  spring.reset(0f)
  spring.target(100f, GlassSpringSpec(0.75f, 0.32f))
  for (i in 0..60) { out.append("spring,${i * step},${spring.value}\n"); spring.advance(step) }

  // Open, with default tuning.
  val motion = GlassMotion()
  motion.initialize(src, target, 34f * DP, DP, through, false, GlassMorphTuning(null, null))
  motion.retarget(true)
  var t = 0f
  for (i in 0..90) { out.append("open," + frameLine(t, motion) + "\n"); motion.advanceBy(step); t += step }

  // Close, toolbar absorb duration 0.48.
  val close = GlassMotion()
  close.initialize(src, target, 34f * DP, DP, through, false, GlassMorphTuning(null, GlassAbsorbRecord(0.48f, null)))
  close.retarget(true)
  for (i in 0..90) close.advanceBy(step)
  close.updateSource(src, through)
  close.retarget(false)
  t = 0f
  for (i in 0..90) { out.append("close," + frameLine(t, close) + "\n"); close.advanceBy(step); t += step }

  // Jelly: press inside, drag, release.
  val jelly = GlassJelly()
  val cx = (target.left + target.right) / 2f
  val cy = (target.top + target.bottom) / 2f
  jelly.down(cx, cy)
  for (i in 0..60) {
    if (i == 20) jelly.move(cx + 40f, cy + 25f)
    if (i == 45) jelly.release()
    jelly.advance(step)
    val o = RectF(target)
    jelly.deformMenu(o, 1f, 1f, DP, 1f)
    val c = RectF(src)
    jelly.deformControl(c, DP, 1f)
    out.append("jelly,${i * step},${o.left},${o.top},${o.right},${o.bottom},${c.left},${c.top},${c.right},${c.bottom}\n")
  }
  java.io.File(System.getenv("OUT") ?: "out.csv").writeText(out.toString())
}
