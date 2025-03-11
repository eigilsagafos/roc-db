import { mutationSchemaGenerator } from "roc-db"
import { PostRefSchema } from "./PostRefSchema"

export const DeletePostMutationSchema = mutationSchemaGenerator(
    "deletePost",
    PostRefSchema,
)
