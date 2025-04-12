import type { ReadRequest } from "./ReadRequest"
import type { WriteRequest } from "./WriteRequest"

export type RocDBRequest = ReadRequest | WriteRequest
