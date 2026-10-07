import { readOperation } from "../readOperation"
import { PageMutationsArgsSchema } from "../schemas/PageMutationsArgsSchema"
import { Query } from "../utils/Query"

/**
 * Page the mutation log, newest first.
 *
 * Predicates (all optional, all combinable):
 * - `changeSet`: `"any"` (default) | `"none"` (mutations outside any change
 *   set, i.e. committed history) | a change-set ref.
 * - `operationName` / `identityRef`: one value or several.
 * - `logRefs`: one ref or several; matches mutations whose log touched all of
 *   them ("everything that changed this entity").
 *
 * Paging is keyset, not offset: pass the previous page's last `timestamp` as
 * `before` (and its `ref` as `beforeRef` when timestamps can tie). `size`
 * defaults to 30; pass `size: null` for an explicitly unbounded read.
 */
export const pageMutations = readOperation(
    "pageMutations",
    PageMutationsArgsSchema,
    txn => Query(() => txn.pageMutations(txn.payload)),
)
