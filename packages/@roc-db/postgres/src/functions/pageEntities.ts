import { postgresRowToEntity } from "../lib/postgresRowToEntity"

const createKindClause = (entities, sqlTxn) => {
    if (Array.isArray(entities)) {
        if (entities.length === 1) {
            return sqlTxn`kind = ${entities[0]}`
        } else {
            return sqlTxn`kind IN ${sqlTxn(entities)}`
        }
    } else if (typeof entities === "string" && entities === "*") {
        return sqlTxn`TRUE`
    } else {
        throw new Error(`Invalid entities argument`)
    }
}

const createChildrenOfClause = (childrenOf, sqlTxn) => {
    if (!childrenOf) return sqlTxn`TRUE`
    if (typeof childrenOf === "string") childrenOf = [childrenOf]
    return sqlTxn`parent_refs @> ${childrenOf}`
}

const createDescendantsOfClause = (descendantsOf, sqlTxn) => {
    if (!descendantsOf) return sqlTxn`TRUE`
    if (typeof descendantsOf === "string") descendantsOf = [descendantsOf]
    return sqlTxn`ancestor_refs @> ${descendantsOf}`
}

export const pageEntities = async (txn, args) => {
    const { entitiesTableName, sqlTxn } = txn.engineOpts
    const { descendantsOf, childrenOf, entities, size = null } = args

    const rows = await sqlTxn`
        SELECT * FROM ${sqlTxn(entitiesTableName)}
        WHERE
            ${createKindClause(entities, sqlTxn)} AND
            ${createChildrenOfClause(childrenOf, sqlTxn)} AND
            ${createDescendantsOfClause(descendantsOf, sqlTxn)}
        ORDER BY created_at DESC
        LIMIT ${size ?? "NULL"};
        `
    return rows.values().toArray().map(postgresRowToEntity)
}
