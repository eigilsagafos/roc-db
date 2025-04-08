import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"
import { BlockImageRefSchema } from "./BlockImageRefSchema"
import { BlockRowRefSchema } from "./BlockRowRefSchema"

export const DeleteBlocksMutationSchema = mutationSchemaGenerator(
    "deleteBlocks",
    z.array(
        z.union([
            BlockParagraphRefSchema,
            BlockImageRefSchema,
            BlockRowRefSchema,
        ]),
    ),
)
