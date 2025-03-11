import type { ReadTransaction } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const pageMutations = (
    txn: ReadTransaction<any, InMemoryEngine, any, any>,
    {
        size = 30,
        skip = 0,
        changeSetRef,
    }: { size?: number; skip?: number; changeSetRef?: string } = {},
) => {
    const res = []
    const iterator = txn.engineOpts.mutations.values().drop(skip)
    let next = iterator.next()
    while (!next.done && res.length < size) {
        if (changeSetRef) {
            if (next.value.changeSetRef === changeSetRef) {
                res.push(next.value)
            }
        } else {
            res.push(next.value)
        }
        next = iterator.next()
    }
    return res
}
