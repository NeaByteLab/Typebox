/**
 * Shared global symbols for typebox.
 * @description Holds unique marks used across modules.
 */
export default class Globals {
  /** Maximum accepted length for a string input under a guard */
  static readonly maxGuardInputLength = 10000
  /** Maximum accepted nesting depth for a guarded object input */
  static readonly maxFreezeDepth = 256
  /** Unique mark for stateful contract entries */
  static readonly statefulMark = Symbol('typebox.stateful')
}
