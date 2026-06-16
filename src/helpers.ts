import type * as Types from '@app/types.ts'
import Globals from '@app/globals.ts'
import Utils from '@app/utils.ts'

/**
 * Core helpers for contract handling.
 * @description Builds, validates, and runs contract entries.
 */
export default class Helpers {
  /** Unique mark for stateful contract entries */
  static readonly statefulMark = Globals.statefulMark

  /**
   * Wrap a contract with guards.
   * @description Validates input then delegates to the contract.
   * @param contract - Contract function to wrap
   * @param guard - Optional guard or list of guards
   * @returns Wrapped contract function
   * @throws TypeError when guard is async, input invalid, or input too long
   * @template ContractType - Contract function type
   */
  static defineFn<ContractType extends Types.ContractFn>(
    contract: ContractType,
    guard?: Types.GuardInput<ContractType>
  ): ContractType {
    if (guard === undefined) {
      return contract
    }
    const guards = Array.isArray(guard) ? guard : [guard]
    return ((input: Types.ContractInput<ContractType>) => {
      if (typeof input === 'string' && (input as string).length > Globals.maxGuardInputLength) {
        const reason = `input exceeds ${Globals.maxGuardInputLength} characters`
        throw new TypeError(reason, { cause: [reason] })
      }
      const guardInput = Utils.isObject(input) ? Utils.deepFreeze(input) : input
      for (const check of guards) {
        const verdict = check(guardInput)
        if (typeof (verdict as Types.ThenableLike | null)?.then === 'function') {
          throw new TypeError('async guard unsupported')
        }
        const failReasons = Helpers.reasonsOf(verdict)
        if (failReasons.length > 0) {
          throw new TypeError(failReasons.join('; '), { cause: failReasons })
        }
      }
      return contract(input as never)
    }) as ContractType
  }

  /**
   * Check if entry is stateful.
   * @description Detects the stateful mark on the entry.
   * @param entry - Contract entry to inspect
   * @returns True when entry is stateful
   */
  static isStateful(entry: Types.ContractEntry): entry is Types.StatefulContract<unknown, never> {
    return Utils.isObject(entry) && Helpers.statefulMark in entry
  }

  /**
   * Build a live stateful handle.
   * @description Creates a callable handle holding frozen state.
   * @param entry - Stateful contract to activate
   * @returns Live state handle for the entry
   */
  static liveStateful(
    entry: Types.StatefulContract<unknown, never>
  ): Types.StateHandle<unknown, never> {
    let currentState = Utils.deepFreeze(Utils.safeClone(entry.initialState))
    const stateHandle = (payload: never): unknown => {
      const nextState = entry.stepFn(currentState, payload)
      currentState = Object.is(nextState, currentState) ? currentState : Utils.deepFreeze(nextState)
      return currentState
    }
    stateHandle.get = (): unknown => currentState
    return stateHandle as Types.StateHandle<unknown, never>
  }

  /**
   * Normalize a guard verdict to reasons.
   * @description Converts verdict into a reasons array.
   * @param verdict - Guard verdict to normalize
   * @returns Array of failure reason strings
   * @throws TypeError when verdict shape is invalid
   */
  static reasonsOf(verdict: Types.GuardVerdict): readonly string[] {
    if (verdict === true) {
      return []
    }
    if (typeof verdict === 'string') {
      return [verdict]
    }
    if (Array.isArray(verdict) && verdict.every((reason) => typeof reason === 'string')) {
      return verdict.length > 0 ? verdict : ['validation failed']
    }
    throw new TypeError('guard returned invalid verdict', { cause: ['validation failed'] })
  }
}
