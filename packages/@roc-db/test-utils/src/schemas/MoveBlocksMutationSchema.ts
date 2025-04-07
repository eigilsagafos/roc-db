import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { BlockRowRefSchema } from "./BlockRowRefSchema"
import { BlockParagraphRefSchema } from "./BlockParagraphRefSchema"

export const MoveBlocksMutationSchema = mutationSchemaGenerator(
    "moveBlocks",
    z
        .object({
            refs: z.array(
                z.union([BlockParagraphRefSchema, BlockRowRefSchema]),
            ),
            targetPosition: z.number().min(0),
        })
        .strict(),
    undefined,
    true,
)
