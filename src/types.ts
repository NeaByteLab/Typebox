import type Globals from '@app/globals.ts'

/** Unique brand for no-payload marker */
declare const noPayloadMark: unique symbol

/**
 * Callable handle for stateful contracts.
 * @description Advances state and exposes current value.
 * @template ValueType - Stored state value type
 * @template PayloadType - Step payload argument type
 */
export interface StateHandle<ValueType, PayloadType> {
  (...args: [PayloadType] extends [NoPayload] ? [] : [payload: PayloadType]): ValueType
  /** Read the current immutable state */
  get(): DeepImmutable<ValueType>
}

/**
 * Public stateful contract builder API.
 * @description Creates stateful contract entries from steps.
 */
export interface StatefulApi {
  state<ValueType, ArgsType extends [] | [unknown]>(
    initialState: ValueType,
    stepFn: StepFn<ValueType, ArgsType>
  ): StatefulContract<ValueType, PayloadOf<ArgsType>>
}

/**
 * Base shape for stateful entries.
 * @description Carries the unique stateful identity mark.
 */
export interface StatefulBase {
  /** Unique mark identifying stateful entries */
  readonly [Globals.statefulMark]: true
}

/**
 * Fully typed stateful contract.
 * @description Holds initial state and a step function.
 * @template ValueType - Stored state value type
 * @template PayloadType - Step payload argument type
 */
export interface StatefulContract<ValueType, PayloadType> extends StatefulBase {
  /** Initial state value for the contract */
  readonly initialState: ValueType
  /** Reducer advancing state with a payload */
  readonly stepFn: (state: ValueType, payload: PayloadType) => ValueType
}

/**
 * Untyped stateful entry record.
 * @description Internal stateful entry before activation.
 * @template ValueType - Stored state value type
 */
export interface StatefulEntry<ValueType> extends StatefulBase {
  /** Initial state value for the entry */
  readonly initialState: ValueType
  /** Reducer stored without payload typing */
  readonly stepFn: unknown
}

/** Contract function or stateful base entry */
export type ContractEntry = ContractFn | StatefulBase

/** Single-input contract function signature */
export type ContractFn = (input: never) => unknown

/** First parameter type of a contract */
export type ContractInput<ContractType extends ContractFn> = Parameters<ContractType>[0]

/** Record mapping names to contract entries */
export type ContractMap = Record<string, ContractEntry>

/**
 * Recursively immutable version of a type.
 * @description Deeply marks objects, maps, and sets readonly.
 * @template SourceType - Source type to make immutable
 */
export type DeepImmutable<SourceType> = SourceType extends (...args: never[]) => unknown
  ? SourceType
  : SourceType extends ReadonlyMap<infer KeyType, infer ValueType>
    ? ReadonlyMap<KeyType, DeepImmutable<ValueType>>
  : SourceType extends ReadonlySet<infer ValueType> ? ReadonlySet<DeepImmutable<ValueType>>
  : SourceType extends object
    ? { readonly [Key in keyof SourceType]: DeepImmutable<SourceType[Key]> }
  : SourceType

/** Generic record backing a live facade */
export type FacadeRecord = Record<string, unknown>

/**
 * Synchronous guard for contract input.
 * @description Validates input and returns a verdict.
 * @template ContractType - Contract function type
 */
export type GuardFn<ContractType extends ContractFn> = (
  input: NoInfer<ContractInput<ContractType>>
) => GuardVerdict

/** One guard or guard list */
export type GuardInput<ContractType extends ContractFn> =
  | GuardFn<ContractType>
  | readonly GuardFn<ContractType>[]

/** Guard pass flag or reasons */
export type GuardVerdict = true | string | readonly string[]

/**
 * Activated entry from a map.
 * @description Resolves stateful or plain contract entries.
 * @template EntryType - Source contract entry type
 */
export type LiveEntry<EntryType> = EntryType extends
  StatefulContract<infer ValueType, infer PayloadType> ? StateHandle<ValueType, PayloadType>
  : EntryType extends (...args: infer ArgsType) => infer OutputType
    ? (...args: ArgsType) => UnwrapOutput<OutputType>
  : never

/**
 * Facade with activated contract entries.
 * @description Maps each entry to its live form.
 * @template ContractMapType - Source contract map type
 */
export type LoadedFacade<ContractMapType extends ContractMap> = {
  readonly [Key in keyof ContractMapType]: LiveEntry<ContractMapType[Key]>
}

/**
 * Payload type derived from step arguments.
 * @description Extracts payload or marks absence of payload.
 * @template ArgsType - Step argument tuple type
 */
export type PayloadOf<ArgsType extends [] | [unknown]> = ArgsType extends [infer PayloadType]
  ? PayloadType
  : NoPayload

/**
 * Reducer advancing state by a step.
 * @description Computes next state from current and args.
 * @template ValueType - Stored state value type
 * @template ArgsType - Step argument tuple type
 */
export type StepFn<ValueType, ArgsType extends [] | [unknown]> = (
  state: ValueType,
  ...args: ArgsType
) => ValueType

/** Object with an optional then property */
export type ThenableLike = { readonly then?: unknown }

/**
 * Normalized contract output for the facade.
 * @description Flattens promise outputs to single await.
 * @template OutputType - Raw contract return type
 */
export type UnwrapOutput<OutputType> = OutputType extends PromiseLike<unknown>
  ? Promise<Awaited<OutputType>>
  : OutputType

/** Unique marker for payload-less steps */
type NoPayload = { readonly [noPayloadMark]: true }
