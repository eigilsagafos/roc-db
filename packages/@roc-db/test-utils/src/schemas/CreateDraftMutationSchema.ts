import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"

export const CreateDraftMutationSchema = mutationSchemaGenerator(
    "createDraft",
    z.object({ postRef: PostRefSchema }).strict(),
)
