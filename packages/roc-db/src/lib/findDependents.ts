import type { Ref } from "../types/Ref"
import type { Transaction } from "../types/Transaction"
import { refsFromRelations } from "../utils/refsFromRelations"

export const findDependents = (txn: Transaction, ref: Ref) => {
    if (txn.adapter.async) {
        return findDependentsAsync(txn, ref)
    } else {
        return findDependentsSync(txn, ref)
    }
}

const findDependentsSync = (txn: Transaction, ref: Ref) => {
    const res = txn.readEntity(ref)
    const children = refsFromRelations(res.children)
    let dependents: Ref[] = []
    for (const childRef of children) {
        dependents.push(...findDependentsSync(txn, childRef))
        dependents.push(childRef)
    }
    return dependents
}

const findDependentsAsync = async (txn: Transaction, ref: Ref) => {
    const res = await txn.readEntity(ref)
    const children = refsFromRelations(res.children)
    let dependents: Ref[] = []
    for (const childRef of children) {
        dependents.push(...(await findDependentsAsync(txn, childRef)))
        dependents.push(childRef)
    }
    return dependents
}
