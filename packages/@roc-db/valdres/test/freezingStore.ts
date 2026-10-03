import type { Store, Transaction } from "valdres"

// valdres 1.0.0-beta.20 deep-froze every stored value outside production, so
// any code mutating a value after writing it, or after reading it back, threw
// in tests. The v1 betas share values by reference without freezing. This
// wrapper restores the check in tests only: every value written through the
// store, its scopes or their transactions is deep-frozen first.

const deepFreeze = <Value>(value: Value): Value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value)
        for (const key of Reflect.ownKeys(value)) {
            deepFreeze((value as any)[key])
        }
    }
    return value
}

// Wrappers are memoized so a scope keeps one identity, as it does in valdres.
const wrappers = new WeakMap<Store, Store>()
const unwrapped = new WeakMap<Store, Store>()
const unwrap = (target: any) => unwrapped.get(target) ?? target

const freezingTransaction = (txn: Transaction): Transaction =>
    ({
        get: state => txn.get(state),
        set: (target: any, value: any) => txn.set(target, deepFreeze(value)),
        update: (target: any, update: any) =>
            txn.update(target, (current: any) => deepFreeze(update(current))),
        reset: (target: any) => txn.reset(target),
        delete: target => txn.delete(target),
        scope: (target: any, callback?: any) =>
            callback === undefined
                ? freezingTransaction(txn.scope(unwrap(target)))
                : txn.scope(unwrap(target), scoped =>
                      callback(freezingTransaction(scoped)),
                  ),
    }) as Transaction

export const freezingStore = (store: Store): Store => {
    let wrapper = wrappers.get(store)
    if (!wrapper) {
        wrapper = {
            ...store,
            set: ((target: any, value: any) =>
                store.set(target, deepFreeze(value))) as Store["set"],
            update: ((target: any, update: any) =>
                store.update(target, (current: any) =>
                    deepFreeze(update(current)),
                )) as Store["update"],
            txn: (callback, name) =>
                store.txn(txn => callback(freezingTransaction(txn)), name),
            scope: ((id?: string) =>
                freezingStore(
                    id === undefined ? store.scope() : store.scope(id),
                )) as Store["scope"],
        }
        wrappers.set(store, wrapper)
        unwrapped.set(wrapper, store)
    }
    return wrapper
}
