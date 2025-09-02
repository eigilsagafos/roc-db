import type { RocDBRequest } from "../types/RocDBRequest"

export const parseRequestPayload = (request: RocDBRequest) =>
    request.operation.payloadSchema.parse(request.payload, {
        reportInput: process.env.NODE_ENV !== "production",
    })
