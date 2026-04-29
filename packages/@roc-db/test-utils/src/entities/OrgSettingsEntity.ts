import { Entity } from "roc-db"
import { z } from "zod"
import { UserRefSchema } from "../schemas/UserRefSchema"

export const OrgSettingsEntity = new Entity("OrgSettings", {
    singleton: true,
    data: z.object({
        name: z.string(),
        theme: z.string().optional(),
    }),
    parents: z.object({ primaryAdmin: UserRefSchema.optional() }),
    children: z.object({ featuredPosts: z.array(z.string()) }),
})
