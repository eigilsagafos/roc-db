import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"
import { BlockImageRefSchema } from "./BlockImageRefSchema"

export const DeleteBlockMutationSchema = mutationSchemaGenerator(
    "deleteBlock",
    z.union([BlockParagraphRefSchema, BlockImageRefSchema]),
)
