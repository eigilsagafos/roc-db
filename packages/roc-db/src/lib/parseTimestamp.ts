export const parseTimestamp = (db, txn, userProvidedTimestamp) => {
    if (userProvidedTimestamp) return new Date(userProvidedTimestamp)
    return db.currentTimestamp(txn)
}
