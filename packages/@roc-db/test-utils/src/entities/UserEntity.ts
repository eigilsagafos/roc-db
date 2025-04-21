import { Entity } from "roc-db"
import { z } from "zod"

export const UserEntity = new Entity("User", {
    data: z.object({
        email: z.string().email(),
    }),
    uniqueDataKeys: ["email"],
})
