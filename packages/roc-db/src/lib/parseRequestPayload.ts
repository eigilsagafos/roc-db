import type { RocRequest } from "../types/RocRequest"

export const parseRequestPayload = (request: RocRequest) =>
    request.schema.shape.payload.parse(request.payload)
