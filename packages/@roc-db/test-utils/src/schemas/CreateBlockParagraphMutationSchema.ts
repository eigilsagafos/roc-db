import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { BlockRowRefSchema } from "./BlockRowRefSchema"

export const CreateBlockParagraphMutationSchema = mutationSchemaGenerator(
    "createBlockParagraph",
    z
        .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
        .strict(),
    undefined,
    true,
)
