import type { CreateEntityFunction } from "roc-db"
import type { ValdresEngine } from "../types/ValdresEngine"

// TODO: not implemented and currently unused — valdres commits create/update/
// delete inline in commit.ts. Kept as a typed stub; the previous body was dead
// unreachable code (behind the throw).
export const commitCreate: CreateEntityFunction<ValdresEngine> = () => {
    throw new Error("commitCreate is not implemented")
}
