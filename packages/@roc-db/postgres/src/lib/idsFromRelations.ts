import { idFromRef } from "roc-db"

export const idsFromRelations = relations => {
    const res: string[] = []
    for (const property in relations) {
        const val = relations[property]
        if (Array.isArray(val)) {
            for (const v of val) {
                const id = idFromRef(v)
                if (!res.includes(id)) {
                    res.push(id)
                }
            }
        } else {
            const id = idFromRef(val)
            if (!res.includes(id)) {
                res.push(id)
            }
        }
    }
    return res
}
