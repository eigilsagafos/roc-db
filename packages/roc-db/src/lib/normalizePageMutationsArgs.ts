import { BadRequestError } from "../errors/BadRequestError"
import type {
    ChangeSetFilter,
    NormalizedPageMutationsArgs,
    PageMutationsArgs,
} from "../types/PageMutationsArgs"

const isRef = (value: string) => {
    const slash = value.indexOf("/")
    return slash > 0 && slash < value.length - 1
}

const toArray = <T>(field: string, value: T | T[] | undefined): T[] | null => {
    if (value === undefined || value === null) return null
    const values = Array.isArray(value) ? value : [value]
    if (values.length === 0)
        throw new BadRequestError(
            `pageMutations: \`${field}\` was an empty array. Omit it to mean "no filter" — an empty array would otherwise silently match nothing.`,
        )
    return values
}

const resolveChangeSet = (args: PageMutationsArgs): ChangeSetFilter => {
    const { changeSet, changeSetRef } = args
    // `changeSetRef: null` has always meant "no filter", so callers threading a
    // nullable ref keep working. Only a real ref counts as "the legacy field
    // was used".
    const legacy = changeSetRef === null ? undefined : changeSetRef
    if (changeSet !== undefined && legacy !== undefined)
        throw new BadRequestError(
            "pageMutations: pass either `changeSet` or the deprecated `changeSetRef`, not both.",
        )
    if (changeSet === null)
        throw new BadRequestError(
            'pageMutations: `changeSet` cannot be null. Use "none" for mutations outside any change set, "any" for no filter.',
        )
    const resolved = changeSet ?? legacy ?? "any"
    if (typeof resolved !== "string")
        throw new BadRequestError(
            `pageMutations: \`changeSet\` must be a ref, "none" or "any".`,
        )
    if (resolved === "none" || resolved === "any") return resolved
    if (!isRef(resolved))
        throw new BadRequestError(
            `pageMutations: \`changeSet\` must be a "<Kind>/<id>" ref, "none" or "any" — got "${resolved}".`,
        )
    return resolved
}

const resolveBefore = (args: PageMutationsArgs) => {
    const { before, beforeRef } = args
    if (before === undefined || before === null) {
        if (beforeRef !== undefined && beforeRef !== null)
            throw new BadRequestError(
                "pageMutations: `beforeRef` is only a tiebreak for `before` — pass the previous page's last `timestamp` as `before` too.",
            )
        return null
    }
    if (typeof before !== "string" || Number.isNaN(Date.parse(before)))
        throw new BadRequestError(
            `pageMutations: \`before\` must be an ISO timestamp — got ${JSON.stringify(before)}.`,
        )
    if (beforeRef !== undefined && beforeRef !== null && !isRef(beforeRef))
        throw new BadRequestError(
            `pageMutations: \`beforeRef\` must be a "Mutation/<id>" ref — got "${beforeRef}".`,
        )
    return { timestamp: before, ref: beforeRef ?? null }
}

const resolveSize = (size: PageMutationsArgs["size"]) => {
    // Undefined and null both mean unbounded at this layer. The `pageMutations`
    // *operation* defaults `size` to 30 before it ever reaches here; a caller
    // going straight to `txn.pageMutations` opts out of that default.
    if (size === undefined || size === null) return null
    if (!Number.isInteger(size) || size <= 0)
        throw new BadRequestError(
            `pageMutations: \`size\` must be a positive integer or null (unbounded) — got ${JSON.stringify(size)}.`,
        )
    return size
}

/**
 * Resolve raw `pageMutations` args into the shape adapters query with.
 *
 * Every adapter calls this first, so predicate semantics and argument errors
 * are defined once instead of four times — that's what makes cross-adapter
 * parity a property of the code rather than of the test suite.
 */
export const normalizePageMutationsArgs = (
    args: PageMutationsArgs | null | undefined = {},
): NormalizedPageMutationsArgs => {
    const resolved = args ?? {}
    return {
        size: resolveSize(resolved.size),
        changeSet: resolveChangeSet(resolved),
        before: resolveBefore(resolved),
        operationName: toArray("operationName", resolved.operationName),
        identityRef: toArray("identityRef", resolved.identityRef),
        logRefs: toArray("logRefs", resolved.logRefs),
    }
}
