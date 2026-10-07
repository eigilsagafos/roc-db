import * as z from "zod"
import { mutationFilterShape } from "./PageMutationsArgsSchema"

export const MutationFacetsArgsSchema = z
    .object({
        fields: z
            .array(z.enum(["operationName", "identityRef"]))
            .nonempty()
            .optional(),
        ...mutationFilterShape,
    })
    .strict()
    .prefault({})
