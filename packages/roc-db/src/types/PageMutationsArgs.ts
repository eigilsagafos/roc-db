import type { MutationRef } from "./MutationRef"
import type { Ref } from "./Ref"

/**
 * Which change-set bucket to read from. Explicitly tri-state so "root only" is
 * a value you have to ask for by name:
 *
 * - a `Ref`  -> only mutations belonging to that change set
 * - `"none"` -> only mutations with no change set (committed history)
 * - `"any"`  -> no change-set filter at all (the default, and the behaviour
 *               every pre-existing caller gets)
 *
 * `null`/`undefined` deliberately do NOT mean "none": a caller threading a
 * nullable change-set ref through this would otherwise silently switch from
 * "everything" to "root only". `changeSet: null` is a hard error; the legacy
 * `changeSetRef: null` keeps its historic meaning of "no filter".
 */
export type ChangeSetFilter = Ref | "none" | "any"

export type PageMutationsArgs = {
    /**
     * Page size. `null` means unbounded — every matching row. The
     * `pageMutations` operation defaults this to 30; the adapter functions
     * themselves treat a missing `size` as unbounded.
     */
    size?: number | null
    /** Change-set tri-state. Defaults to `"any"`. */
    changeSet?: ChangeSetFilter
    /**
     * @deprecated Use `changeSet`. Kept for backwards compatibility: a ref
     * behaves like `changeSet: <ref>`, `null`/`undefined` like `"any"`.
     * Passing both this and `changeSet` is a `BadRequestError`.
     */
    changeSetRef?: Ref | null
    /**
     * Keyset cursor: only mutations strictly older than this ISO timestamp.
     * Pass the `timestamp` of the last row of the previous page.
     */
    before?: string
    /**
     * Tiebreak for `before`, for exact keyset paging when several mutations
     * share a timestamp: pass the `ref` of the last row of the previous page
     * alongside its `timestamp`. Requires `before`.
     */
    beforeRef?: MutationRef
    /** Match one operation name, or any of several. */
    operationName?: string | string[]
    /** Match one identity ref, or any of several. */
    identityRef?: string | string[]
    /**
     * Match mutations whose log touches ALL of these refs (array containment,
     * `log_refs @> ARRAY[...]` in postgres). A single ref is the common case:
     * "every mutation that touched this entity".
     */
    logRefs?: Ref | Ref[]
}

/**
 * `PageMutationsArgs` after `normalizePageMutationsArgs`: every field is
 * present, the tri-state is resolved, and the scalar-or-array fields are
 * always arrays. Adapters consume this shape, never the raw args.
 */
export type NormalizedPageMutationsArgs = {
    size: number | null
    changeSet: ChangeSetFilter
    before: { timestamp: string; ref: MutationRef | null } | null
    operationName: string[] | null
    identityRef: string[] | null
    logRefs: Ref[] | null
}
