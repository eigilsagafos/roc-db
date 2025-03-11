import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { PostRefSchema } from "./PostRefSchema"
import { BlockRowRefSchema } from "./BlockRowRefSchema"

export const CreateBlockRowMutationSchema = mutationSchemaGenerator(
    "createBlockRow",
    z
        .object({ parentRef: z.union([PostRefSchema, BlockRowRefSchema]) })
        .strict(),
    undefined,
    true,
)
