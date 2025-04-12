import type { RocDBRequest } from "../types/RocDBRequest"
import type { WriteRequest } from "../types/WriteRequest"

export const isWriteRequest = (
    request: RocDBRequest,
): request is WriteRequest => {
    return request.operation.type === "write"
}
