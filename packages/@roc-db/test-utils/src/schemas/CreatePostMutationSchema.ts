import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"

export const CreatePostMutationSchema = mutationSchemaGenerator(
    "createPost",
    z
        .object({
            title: z.string(),
            slug: z.string().optional(),
            tags: z.array(z.string()).default([]),
        })
        .strict(),
)
