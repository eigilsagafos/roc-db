import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { UserRefSchema } from "./UserRefSchema"

export const UpdatePostMutationSchema = mutationSchemaGenerator(
    "updatePost",
    z.object({
        ref: PostRefSchema,
        title: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
        authorRef: UserRefSchema.optional(),
    }),
)
