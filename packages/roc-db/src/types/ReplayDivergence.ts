/**
 * Replay-divergence detection: when a stored mutation is re-executed on load
 * (replay), roc-db reconstructs client state by running the operation callback
 * again rather than applying the stored effect. That assumes every operation is
 * perfectly deterministic on re-execution. When it isn't, the reconstructed
 * state silently diverges from what was originally built. These types configure
 * the check that catches that divergence at the point it happens.
 */

export type ReplayDivergencePolicy = "off" | "warn" | "strict"

/**
 * How a recomputed mutation effect diverged from the stored one.
 * - `entry-count`: the recomputed log has more/fewer entries than stored.
 * - `entry-order`: an entry landed at a different position (same set, different
 *   order — the classic "processed items in a different order on replay").
 * - `action`: an entry for the same ref recorded a different action
 *   (create/update/delete).
 * - `update-field`: an update entry changed a different structural field, or the
 *   same field to/from a different value.
 * - `delete-field`: a delete entry's captured document differs structurally.
 */
export type ReplayDivergenceKind =
    | "entry-count"
    | "entry-order"
    | "action"
    | "update-field"
    | "delete-field"

export type ReplayDivergenceInfo = {
    /** Ref of the mutation whose replay diverged. */
    mutationRef: string
    /** Operation name that produced the mutation (may be undefined). */
    operation: string | undefined
    /** Ref of the first entity whose effect diverged. */
    entity: string
    /** Dotted field path of the first diverging value (e.g. `children.items[2]`). */
    field: string
    kind: ReplayDivergenceKind
    /** The stored (original) value. */
    expected: unknown
    /** The recomputed (replayed) value. */
    actual: unknown
}

export type ReplayDivergenceConfig = {
    /**
     * `strict` throws a {@link ReplayDivergenceError} on the first divergence
     * (recommended for dev/test). `warn` logs and continues, so a possibly-wrong
     * draft still loads but the divergence is observable (recommended for prod).
     * `off` disables the check entirely. Defaults to `warn`.
     */
    policy?: ReplayDivergencePolicy
    /**
     * Telemetry hook, invoked with divergence details before the policy acts
     * (i.e. before a `strict` throw). Exceptions thrown by the hook are ignored.
     */
    onDivergence?: (info: ReplayDivergenceInfo) => void
}
