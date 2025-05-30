import type { Snowflake } from "./Snowflake"

export const generateRef = (
    entity: string,
    snowflake: Snowflake,
    timestamp: string,
) => {
    const id = snowflake.generate(timestamp)
    const ref = `${entity}/${id}`
    return ref
}
