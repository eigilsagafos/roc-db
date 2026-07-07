// The engine options `createIndexedDBAdapter` supplies to `createAdapter`.
// This is the *base* shape: at the root adapter there is no open connection or
// active transaction, so `db`/`txn` are absent. `begin` opens the database and
// starts a transaction, deriving the transactional shape (see
// IndexedDBTxnEngine) before the read/write functions run.
export type IndexedDBEngine = {
    // Present as keys on the engine-options object literal
    // `createIndexedDBAdapter` passes (`{ dbName, version }`). `version` is kept
    // optional because callers (and the shared conformance test) only supply
    // `dbName`; `createIndexedDBAdapter` defaults it.
    dbName: string
    version?: number
    // Attached by `begin`: the open database connection and the active
    // read/write transaction. Optional on the base engine (absent at the root
    // adapter); transactional functions narrow to IndexedDBTxnEngine.
    db?: IDBDatabase
    txn?: IDBTransaction
}

// The engine as seen by functions that run inside a transaction (everything
// after `begin`): `db` and `txn` are guaranteed present. Transactional
// functions narrow the base engine to this via `as IndexedDBTxnEngine`, which
// encodes the runtime invariant without any runtime cost.
export type IndexedDBTxnEngine = IndexedDBEngine & {
    db: IDBDatabase
    txn: IDBTransaction
}
