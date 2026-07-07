import type { Sql, TransactionSql } from "postgres"

// The engine options the postgres adapter supplies to `createAdapter`. This is
// the *base* shape: at the root adapter there is no active SQL transaction, so
// `sqlClient`/`sqlTxn` are absent. `begin` derives the transactional shape from
// it (see PostgresTxnEngine) before the read/write functions run.
//
// KEY assignability rule: fields present as keys on the object literal
// createAdapter infers (createPostgresAdapter always passes them, even when the
// value is undefined) must be `field: T | undefined` (REQUIRED key), NOT
// optional `field?: T` — otherwise the contravariant `begin` callback fails to
// type-check against the inferred engine-options literal.
export type PostgresEngineOpts = {
    mutationsTableName: string
    entitiesTableName: string
    client: Sql | undefined
    getClient: (() => Sql) | undefined
    onTransactionStart: ((txn: TransactionSql) => Promise<void>) | undefined
    onTransactionEnd: ((txn: TransactionSql) => Promise<void>) | undefined
}

// The engine as seen by functions that run inside a SQL transaction (everything
// after `begin`): `sqlClient` and `sqlTxn` are guaranteed present. Functions
// narrow the base engine to this via `as PostgresTxnEngine`, which encodes the
// runtime invariant without any runtime cost.
export type PostgresTxnEngine = PostgresEngineOpts & {
    sqlClient: Sql
    // Typed `any` because the postgres tagged-template client's generic
    // overloads reject values that are legitimately passed at runtime (e.g.
    // `idFromRef` returning `string | undefined`, or `sqlTxn(tableName)`
    // Helper fragments). The SQL layer is opaque to this adapter's type goals.
    sqlTxn: any
}
