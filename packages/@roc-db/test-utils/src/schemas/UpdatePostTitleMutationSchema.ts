import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const UpdatePostTitleMutationSchema = mutationSchemaGenerator(
    "updatePostTitle",
    z.object({ ref: PostRefSchema, title: z.string() }),
)
