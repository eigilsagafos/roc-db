export type IndexedDBEngine = {
    dbName: string
    db: IDBDatabase
    txn: IDBTransaction
}
