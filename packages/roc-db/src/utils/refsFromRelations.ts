import type { Ref } from "../types/Ref"

export const refsFromRelations = (
    relations: Record<string, Ref | Ref[]> | undefined | null,
): Ref[] => {
    const res: Ref[] = []
    for (const property in relations) {
        const val = relations[property]
        if (Array.isArray(val)) {
            for (const v of val) {
                if (!res.includes(v)) {
                    res.push(v)
                }
            }
        } else {
            if (!res.includes(val)) {
                res.push(val)
            }
        }
    }
    return res
}
