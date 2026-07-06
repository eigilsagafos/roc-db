import { z, type ZodSchema, type ZodType } from "zod"
import { WriteTransaction } from "./lib/WriteTransaction"
import { MutationLogSchema } from "./schemas/MutationLogSchema"
import { mutationSchemaGenerator } from "./schemas/generators/mutationSchemaGenerator"
import type { WriteOperation } from "./types/WriteOperation"
import type { WriteOperationSettings } from "./types/WriteOperationSettings"

export const writeOperation = <
    const Name extends string = string,
    PayloadSchema extends ZodSchema = ZodSchema,
>(
    name: Name,
    payloadSchema: PayloadSchema,
    callback: (txn: WriteTransaction<any, z.output<PayloadSchema>>) => any,
    settings: WriteOperationSettings = {},
): WriteOperation<Name, PayloadSchema> => {
    const {
        version = 1,
        debounce = 0,
        changeSetOnly = false,
        outputSchema = z.any(),
        mutationLogSchema = z.any(),
    } = settings
    return Object.freeze({
        type: "write",
        name,
        payloadSchema,
        callback,
        version,
        debounce,
        changeSetOnly,
        outputSchema,
        mutationLogSchema,
        mutationSchema: mutationSchemaGenerator(
            name,
            payloadSchema,
            mutationLogSchema as ZodType<z.infer<typeof MutationLogSchema>>,
            changeSetOnly,
        ),
    })
}
