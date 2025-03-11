import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const CreateBlockImageMutationSchema = mutationSchemaGenerator(
    "createBlockImage",
    z.object({ postRef: PostRefSchema }).strict(),
    undefined,
    true,
)
