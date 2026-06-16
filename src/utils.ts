import Globals from '@app/globals.ts'
import { Immutable } from '@neabyte/utils-core'

/**
 * Internal helper utilities for typebox.
 * @description Provides freezing, cloning, and type checks.
 */
export default class Utils {
  /**
   * Recursively freeze a value.
   * @description Deep freezes objects, maps, and sets.
   * @param value - Value to deeply freeze
   * @returns Deeply frozen value
   * @throws TypeError when nesting or a string value exceeds its limit
   * @template ValueType - Type of the value
   */
  static deepFreeze<ValueType>(value: ValueType): ValueType {
    return Utils.freezeNode(value, new WeakSet<object>(), 0)
  }

  /**
   * Check if value is object.
   * @description Returns true for non-null object values.
   * @param value - Value to inspect
   * @returns True when value is an object
   */
  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  /**
   * Clone a value structurally.
   * @description Uses structuredClone with a typed failure.
   * @param value - Value to clone
   * @returns Structured clone of the value
   * @throws TypeError when value is not cloneable
   * @template ValueType - Type of the value
   */
  static safeClone<ValueType>(value: ValueType): ValueType {
    try {
      return structuredClone(value)
    } catch {
      throw new TypeError('stateful initial state must be structured cloneable')
    }
  }

  /**
   * Freeze a node guarded against cycles.
   * @description Skips frozen nodes, views, and seen references.
   * @param value - Value to freeze in place
   * @param seen - Set of already visited references
   * @param depth - Current recursion depth
   * @returns Deeply frozen value
   * @throws TypeError when nesting or a string value exceeds its limit
   * @template ValueType - Type of the value
   */
  private static freezeNode<ValueType>(
    value: ValueType,
    seen: WeakSet<object>,
    depth: number
  ): ValueType {
    if (typeof value === 'string' && value.length > Globals.maxGuardInputLength) {
      const reason = `input exceeds ${Globals.maxGuardInputLength} characters`
      throw new TypeError(reason, { cause: [reason] })
    }
    if (!Utils.isObject(value) || Object.isFrozen(value) || ArrayBuffer.isView(value)) {
      return value
    }
    if (seen.has(value)) {
      return value
    }
    if (depth >= Globals.maxFreezeDepth) {
      const reason = `input nesting exceeds ${Globals.maxFreezeDepth} levels`
      throw new TypeError(reason, { cause: [reason] })
    }
    seen.add(value)
    if (value instanceof Map) {
      const frozen = new Map<unknown, unknown>()
      for (const [key, item] of value) {
        frozen.set(key, Utils.freezeNode(item, seen, depth + 1))
      }
      return Immutable.freezeMap(frozen) as ValueType
    }
    if (value instanceof Set) {
      const frozen = new Set<unknown>()
      for (const item of value) {
        frozen.add(Utils.freezeNode(item, seen, depth + 1))
      }
      return Immutable.freezeSet(frozen) as ValueType
    }
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor !== undefined && 'value' in descriptor) {
        Utils.freezeNode(descriptor.value, seen, depth + 1)
      }
    }
    return Object.freeze(value) as ValueType
  }
}
