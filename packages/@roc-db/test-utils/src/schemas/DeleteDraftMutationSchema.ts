import { mutationSchemaGenerator } from "roc-db"
import { DraftRefSchema } from "./DraftRefSchema"

export const DeleteDraftMutationSchema = mutationSchemaGenerator(
    "deleteDraft",
    DraftRefSchema,
)
