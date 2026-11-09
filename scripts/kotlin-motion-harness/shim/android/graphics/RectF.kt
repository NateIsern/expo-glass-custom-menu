// Minimal stand-in for android.graphics.RectF (same field semantics as the Android class).
package android.graphics

class RectF {
  var left = 0f
  var top = 0f
  var right = 0f
  var bottom = 0f
  constructor()
  constructor(other: RectF) { set(other) }
  constructor(l: Float, t: Float, r: Float, b: Float) { set(l, t, r, b) }
  fun set(l: Float, t: Float, r: Float, b: Float) { left = l; top = t; right = r; bottom = b }
  fun set(other: RectF) { set(other.left, other.top, other.right, other.bottom) }
  fun width(): Float = right - left
  fun height(): Float = bottom - top
  fun centerX(): Float = (left + right) * 0.5f
  fun centerY(): Float = (top + bottom) * 0.5f
  fun isEmpty(): Boolean = left >= right || top >= bottom
}
