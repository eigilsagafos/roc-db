import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const UpdatePostDescriptionMutationSchema = mutationSchemaGenerator(
    "updatePostDescription",
    z.object({ ref: PostRefSchema, description: z.string() }),
)
