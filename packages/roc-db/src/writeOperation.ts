import { z, ZodSchema } from "zod"
import { WriteTransaction } from "./lib/WriteTransaction"
import type { Mutation } from "./types/Mutation"
import type { Ref } from "./types/Ref"
import type { WriteOperation } from "./types/WriteOperation"
import type { WriteOperationSettings } from "./types/WriteOperationSettings"
import type { WriteRequest } from "./types/WriteRequest"

type MutationSchema = z.ZodObject<{
    name: z.ZodLiteral<string>
    payload: z.ZodTypeAny
    debounceCount: z.ZodNumber
}>

export const writeOperation = <M extends MutationSchema, O extends ZodSchema>(
    mutationSchema: M,
    outputSchema: O,
    mutateFunction: (
        txn: WriteTransaction<
            WriteRequest<z.infer<M>["payload"]>,
            any,
            any,
            any
        >,
    ) => any,
    settings: WriteOperationSettings = {},
): WriteOperation<
    z.infer<M>["name"],
    z.infer<M>,
    z.infer<M>["payload"],
    z.infer<O>
> => {
    return Object.assign(
        (
            payload: z.infer<M>["payload"],
            changeSetRef?: Ref,
            optimisticMutation?: Mutation,
        ) => {
            return {
                type: "write",
                schema: mutationSchema,
                payload,
                callback: mutateFunction,
                settings,
                changeSetRef,
                optimisticMutation,
            } as const
        },
        {
            operationName: mutationSchema.shape.name.value,
            outputSchema: outputSchema,
        },
    )
}
