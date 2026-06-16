import type * as Types from '@app/types.ts'
import Globals from '@app/globals.ts'
import Helpers from '@app/helpers.ts'

/**
 * Contract definition entry point.
 * @description Defines contracts and stateful contract builders.
 */
export const Define: typeof Helpers.defineFn & Types.StatefulApi = Object.assign(Helpers.defineFn, {
  /**
   * Build a stateful contract.
   * @description Stores initial state and a step reducer.
   * @param initialState - Initial state seed value
   * @param stepFn - Reducer advancing the state
   * @returns Stateful contract entry
   * @template ValueType - Stored state value type
   * @template ArgsType - Step argument tuple type
   */
  state<ValueType, ArgsType extends [] | [unknown]>(
    initialState: ValueType,
    stepFn: Types.StepFn<ValueType, ArgsType>
  ): Types.StatefulContract<ValueType, Types.PayloadOf<ArgsType>> {
    const statefulEntry: Types.StatefulEntry<ValueType> = {
      [Globals.statefulMark]: true,
      initialState,
      stepFn
    }
    return statefulEntry as unknown as Types.StatefulContract<ValueType, Types.PayloadOf<ArgsType>>
  }
})

/**
 * Activate a contract map.
 * @description Converts entries into live callable facade.
 * @param contractMap - Map of contract entries
 * @returns Facade with live entries
 * @template ContractMapType - Contract map type
 */
export function Loader<ContractMapType extends Types.ContractMap>(
  contractMap: ContractMapType
): Types.LoadedFacade<ContractMapType> {
  const liveFacade: Types.FacadeRecord = {}
  for (const [entryName, contractEntry] of Object.entries(contractMap)) {
    if (contractEntry === undefined) {
      continue
    }
    liveFacade[entryName] = Helpers.isStateful(contractEntry)
      ? Helpers.liveStateful(contractEntry)
      : contractEntry
  }
  return liveFacade as Types.LoadedFacade<ContractMapType>
}

/** Re-export all public type definitions */
export type * from '@app/types.ts'
