import type { RocDBRequest } from "../types/RocDBRequest"

export const parseRequestPayload = (request: RocDBRequest) =>
    request.operation.payloadSchema.parse(request.payload)
