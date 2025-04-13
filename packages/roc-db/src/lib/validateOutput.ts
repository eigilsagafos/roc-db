import type { ZodSchema } from "zod"
import type { WriteRequest } from "../types/WriteRequest"

export const validateOutput = (
    output: any,
    request: WriteRequest & { operation: { outputSchema: ZodSchema } },
) => {
    const parseRes = request.operation.outputSchema.safeParse(output)
    if (!parseRes.success) {
        console.error(
            `Output validation failed for operation '${request.operation.name}'`,
        )
        throw parseRes.error
    }
}
