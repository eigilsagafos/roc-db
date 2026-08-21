import { parseRef } from "roc-db"
import type { NormalizedPageMutationsArgs } from "roc-db"

/**
 * The WHERE fragments shared by `pageMutations` and `mutationFacets`. Each
 * returns `TRUE` when its predicate is absent so the callers can AND them
 * together unconditionally.
 */

export const createChangeSetClause = (
    changeSet: NormalizedPageMutationsArgs["changeSet"],
    sqlTxn: any,
) => {
    if (changeSet === "any") return sqlTxn`TRUE`
    if (changeSet === "none") return sqlTxn`change_set_id IS NULL`
    const [id, kind] = parseRef(changeSet)
    return sqlTxn`(change_set_id = ${id} AND change_set_kind = ${kind})`
}

export const createOperationNameClause = (
    operationName: NormalizedPageMutationsArgs["operationName"],
    sqlTxn: any,
) => {
    if (!operationName) return sqlTxn`TRUE`
    return operationName.length === 1
        ? sqlTxn`operation_name = ${operationName[0]}`
        : sqlTxn`operation_name IN ${sqlTxn(operationName)}`
}

export const createIdentityRefClause = (
    identityRef: NormalizedPageMutationsArgs["identityRef"],
    sqlTxn: any,
) => {
    if (!identityRef) return sqlTxn`TRUE`
    return identityRef.length === 1
        ? sqlTxn`identity_ref = ${identityRef[0]}`
        : sqlTxn`identity_ref IN ${sqlTxn(identityRef)}`
}

export const createLogRefsClause = (
    logRefs: NormalizedPageMutationsArgs["logRefs"],
    sqlTxn: any,
) => {
    if (!logRefs) return sqlTxn`TRUE`
    // Containment, not overlap: every requested ref must be in the mutation's
    // log. GIN-indexable on log_refs.
    //
    // Rows written before log_refs existed have NULL there and will never
    // match — `saveMutation` has populated it for every insert since, but a
    // table that predates the column needs a one-off backfill from `log`.
    return sqlTxn`log_refs @> ${logRefs}`
}

export const createMutationFilterClause = (
    args: NormalizedPageMutationsArgs,
    sqlTxn: any,
) => sqlTxn`
        ${createChangeSetClause(args.changeSet, sqlTxn)}
        AND ${createOperationNameClause(args.operationName, sqlTxn)}
        AND ${createIdentityRefClause(args.identityRef, sqlTxn)}
        AND ${createLogRefsClause(args.logRefs, sqlTxn)}
    `
