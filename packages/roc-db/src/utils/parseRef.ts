import { entityFromRef } from "./entityFromRef"
import { idFromRef } from "./idFromRef"

export const parseRef = (ref: string) => {
    if (!ref) throw new Error("ref not provided")
    return [idFromRef(ref), entityFromRef(ref)]
}
