import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"
import { DraftRefSchema } from "./DraftRefSchema"

export const ApplyDraftMutationSchema = mutationSchemaGenerator(
    "applyDraft",
    z.object({ ref: DraftRefSchema }).strict(),
)
