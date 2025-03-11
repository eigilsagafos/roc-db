import z from "zod"
import { entityFromRef } from "../../utils/entityFromRef"

export const refSchemaGenerator = <const Entities extends string[]>(
    ...entityKinds: Entities
) => {
    const type = z.custom<`${(typeof entityKinds)[number]}/${string}`>(
        val => {
            if (typeof val !== "string") return false
            if (entityKinds.length === 0) return true // if ref is called with no entity kind we allow any kind
            const entity = entityFromRef(val)
            if (!entityKinds.includes(entity)) return false
            // if (!idRegex.test(id)) return false
            return true
        },
        {},
        // {
        //     message: [
        //         'Must be a record',
        //         entityKinds && `Table must be: "${entityKinds}"`,
        //     ]
        //         .filter(a => a)
        //         .join('; '),
        // }
    )
    // @ts-ignore
    type._entityKinds = entityKinds
    return type
}

const rrr = refSchemaGenerator("ANY")

type asssdaf = z.infer<typeof rrr>
