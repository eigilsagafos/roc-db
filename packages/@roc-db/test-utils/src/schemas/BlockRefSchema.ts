import { z } from "zod"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"
import { BlockRowRefSchema } from "./BlockRowRefSchema"

export const BlockRefSchema = z.union([
    BlockParagraphRefSchema,
    BlockRowRefSchema,
])
