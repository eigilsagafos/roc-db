import { ReplayDivergenceError } from "../errors/ReplayDivergenceError"
import type {
    ReplayDivergenceConfig,
    ReplayDivergenceInfo,
} from "../types/ReplayDivergence"
import type { WriteTransaction } from "./WriteTransaction"

/**
 * A finalized mutation-log entry (the shape produced by `finalizeMutation` and
 * persisted on `mutation.log`):
 *   - create: `[ref, "create"]`
 *   - update: `[ref, "update", reversePatch]`
 *   - delete: `[ref, "delete", document]`
 */
type FinalizedLogEntry = [string, string, unknown?]

// The comparison detail returned by the log diff, before mutation identity is
// attached by `verifyReplayDivergence`.
type Divergence = Omit<ReplayDivergenceInfo, "mutationRef" | "operation">

// Only these structural fields are compared. Everything else on an update
// reverse-patch or a deleted document (created/updated timestamps + mutationRef,
// the `__` index, ref/entity identity) is metadata that legitimately differs on
// replay and is deliberately ignored.
const STRUCTURAL_FIELDS = ["data", "children", "parents", "ancestors"]

/**
 * Canonicalize a value so that representations which are semantically equal
 * compare equal:
 *   - `null` / `undefined` / absent key are all treated as absent,
 *   - an object whose keys all normalize away collapses to absent, so
 *     `data:{}` ≡ `data:{narrative:null}` ≡ (no data key),
 *   - an empty array collapses to absent too.
 * Array order and length are preserved — order is semantically meaningful for
 * `children.items`, `parents.*`, etc., which is exactly the divergence we hunt.
 */
const canon = (value: unknown): unknown => {
    if (value === null || value === undefined) return undefined
    if (Array.isArray(value)) {
        const arr = value.map(canon)
        return arr.length === 0 ? undefined : arr
    }
    if (typeof value === "object") {
        const source = value as Record<string, unknown>
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(source)) {
            const c = canon(source[key])
            if (c !== undefined) out[key] = c
        }
        return Object.keys(out).length === 0 ? undefined : out
    }
    return value
}

// Pull just the structural fields out of a reverse-patch (update) or a captured
// document (delete), dropping all metadata, then canonicalize for comparison.
// Returns `undefined` (canon's "empty") for a missing/malformed entry so both
// empty representations compare equal rather than `{}` vs `undefined`.
const structural = (value: unknown): unknown => {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of STRUCTURAL_FIELDS) {
        if (key in source) out[key] = source[key]
    }
    return canon(out)
}

/**
 * Return the first structural difference between two already-canonicalized
 * values, as a dotted path, or `null` if equal. Used for deletes, where the
 * stored entry captures the full pre-delete document (real forward state).
 */
const firstDiff = (
    a: unknown,
    b: unknown,
    path: string,
): { path: string; expected: unknown; actual: unknown } | null => {
    if (a === b) return null
    if (a === undefined || b === undefined)
        return { path, expected: a, actual: b }

    const aArr = Array.isArray(a)
    const bArr = Array.isArray(b)
    if (aArr || bArr) {
        if (!aArr || !bArr || a.length !== b.length)
            return { path, expected: a, actual: b }
        for (let i = 0; i < a.length; i++) {
            const d = firstDiff(a[i], b[i], `${path}[${i}]`)
            if (d) return d
        }
        return null
    }

    if (typeof a === "object" && typeof b === "object") {
        const keys = new Set([
            ...Object.keys(a as object),
            ...Object.keys(b as object),
        ])
        for (const key of [...keys].sort()) {
            const d = firstDiff(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key],
                path ? `${path}.${key}` : key,
            )
            if (d) return d
        }
        return null
    }

    return { path, expected: a, actual: b }
}

const describeEntry = (entry: FinalizedLogEntry): string =>
    `${entry[1]} ${entry[0]}`

/**
 * Compare a stored mutation log against the log recomputed by re-executing the
 * operation, returning the first divergence or `null`.
 *
 * What is compared:
 *   - the set and order of every entry (`ref` + action) — catches a different
 *     processing order (an entry moves position, e.g. an operation that
 *     processes items in a different order on replay), a different set of
 *     touched entities (an entry is added/removed), and a changed action;
 *   - for updates, the structural reverse-patch by value — catches a different
 *     set of changed fields AND a diverged pre-state propagating from an earlier
 *     mutation (e.g. two updates replayed in the wrong order because persisted
 *     order disagreed with causal order);
 *   - for deletes, the captured document's structural fields by value (the
 *     stored delete entry holds the real pre-delete forward state).
 *
 * Note: debounce continuations are excluded upstream (see
 * {@link verifyReplayDivergence}); their stored log records incremental steps
 * that are deliberately collapsed on replay, so it can't be compared this way.
 */
export const compareReplayLogs = (
    stored: unknown,
    recomputed: unknown,
): Divergence | null => {
    if (!Array.isArray(stored) || !Array.isArray(recomputed)) return null

    const n = Math.max(stored.length, recomputed.length)
    for (let i = 0; i < n; i++) {
        const s = stored[i] as FinalizedLogEntry | undefined
        const r = recomputed[i] as FinalizedLogEntry | undefined

        if (!s) {
            return {
                entity: r![0],
                field: "<entry>",
                kind: "entry-count",
                expected: undefined,
                actual: describeEntry(r!),
            }
        }
        if (!r) {
            return {
                entity: s[0],
                field: "<entry>",
                kind: "entry-count",
                expected: describeEntry(s),
                actual: undefined,
            }
        }

        const [sRef, sAction] = s
        const [rRef, rAction] = r

        if (sRef !== rRef) {
            return {
                entity: rRef,
                field: "<entry>",
                kind: "entry-order",
                expected: describeEntry(s),
                actual: describeEntry(r),
            }
        }
        if (sAction !== rAction) {
            return {
                entity: sRef,
                field: "<action>",
                kind: "action",
                expected: sAction,
                actual: rAction,
            }
        }

        if (sAction === "update") {
            const diff = firstDiff(structural(s[2]), structural(r[2]), "")
            if (diff) {
                return {
                    entity: sRef,
                    field: diff.path || "update",
                    kind: "update-field",
                    expected: diff.expected,
                    actual: diff.actual,
                }
            }
        } else if (sAction === "delete") {
            const diff = firstDiff(structural(s[2]), structural(r[2]), "")
            if (diff) {
                return {
                    entity: sRef,
                    field: diff.path || "delete",
                    kind: "delete-field",
                    expected: diff.expected,
                    actual: diff.actual,
                }
            }
        }
    }

    return null
}

/**
 * On replay (a re-executed mutation carrying an `optimisticMutation`), verify
 * the recomputed effect reproduces the stored one, and surface any divergence
 * per the adapter's configured policy. No-op on the fresh-write path.
 */
export const verifyReplayDivergence = (
    txn: WriteTransaction,
    recomputedLog: unknown,
): void => {
    const cfg: ReplayDivergenceConfig | undefined = txn.adapter.replayDivergence
    const policy = cfg?.policy ?? "warn"
    if (policy === "off") return

    // Debounce continuations (debounceCount > 0) store an incremental log
    // relative to earlier steps that are collapsed away on replay, so their
    // stored effect can't be compared against a from-scratch re-execution
    // without false positives. The divergence class we target (non-deterministic
    // operations) is never debounced, so skipping them is safe.
    if ((txn.mutation.debounceCount ?? 0) > 0) return

    const stored = txn.mutation?.log
    if (!Array.isArray(stored)) return

    const diff = compareReplayLogs(stored, recomputedLog)
    if (!diff) return

    const info: ReplayDivergenceInfo = {
        mutationRef: txn.mutation.ref,
        operation: txn.mutation.operation?.name,
        ...diff,
    }

    if (cfg?.onDivergence) {
        try {
            cfg.onDivergence(info)
        } catch {
            // Telemetry must never mask (or replace) the divergence itself.
        }
    }

    if (policy === "strict") throw new ReplayDivergenceError(info)

    console.warn(
        `[roc-db] Replay divergence in mutation ${info.mutationRef}` +
            ` (${info.operation}) [${info.kind}] at ${info.entity}` +
            ` field "${info.field}": expected ${JSON.stringify(info.expected)}` +
            ` but recomputed ${JSON.stringify(info.actual)}`,
    )
}
