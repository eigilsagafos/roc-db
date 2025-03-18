import { idFromRef } from "roc-db"
import { postgresRowToEntity } from "../lib/postgresRowToEntity"

export const pageEntities = async (txn, args) => {
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const { include, descendantsOfRef } = args
    if (descendantsOfRef) {
        const id = idFromRef(descendantsOfRef)
        const rows = await sqlTxn`
            SELECT * FROM ${sqlTxn(entitiesTableName)}
            WHERE
            ancestor_ids @> ARRAY[${id}]
            ;
        `
        return rows.values().toArray().map(postgresRowToEntity)
    } else {
        const useInclude = include && include.length && include[0] !== "*"
        const rows = await sqlTxn`
            SELECT * FROM ${sqlTxn(entitiesTableName)}
            WHERE
                ${useInclude ? sqlTxn`kind IN ${sqlTxn(include)}` : sqlTxn`TRUE`}
            ;
        `
        return rows.values().toArray().map(postgresRowToEntity)
    }
}
