import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const TestTransactionalEditsMutationSchema = mutationSchemaGenerator(
    "testTransactionalEdits",
    z
        .object({
            name: z.string().optional(),
            post1ref: PostRefSchema.optional(),
            post2ref: PostRefSchema.optional(),
        })
        .strict(),
)
