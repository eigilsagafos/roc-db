import postgres from "postgres"
import { ENTITIES_TABLE_BODY_SCHEMA } from "../src/utils/ENTITIES_TABLE_BODY_SCHEMA"
import { MUTATIONS_TABLE_BODY_SCHEMA } from "../src/utils/MUTATIONS_TABLE_BODY_SCHEMA"

export const createTestDatabase = async client => {
    let database = `test_${crypto.randomUUID().slice(0, 8)}`
    const res = await client`CREATE DATABASE ${client(database)};`

    const childSql = postgres(
        `postgres://postgres:password@localhost:5432/${database}`,
        { max: 1, debug: true },
    )
    await childSql.unsafe(`
        CREATE TABLE entities (
          ${ENTITIES_TABLE_BODY_SCHEMA}
        );
        CREATE TABLE mutations (
          ${MUTATIONS_TABLE_BODY_SCHEMA}
        );
    `)
    return childSql
}
