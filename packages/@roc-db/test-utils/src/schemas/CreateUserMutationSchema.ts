import { mutationSchemaGenerator } from "roc-db"
import { z } from "zod"

export const CreateUserMutationSchema = mutationSchemaGenerator(
    "createUser",
    z.object({ email: z.string() }),
)
