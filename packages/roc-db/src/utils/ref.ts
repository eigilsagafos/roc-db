import z from "zod"
import { entityFromRef } from "./entityFromRef"

export const ref = (...entityKinds: string[]) => {
    const type = z.custom<`${string}/${string}`>(
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
    type._entityKinds = entityKinds
    return type
}

const anyRef = ref()

export type Ref = z.infer<typeof anyRef>
