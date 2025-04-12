import { BadRequestError } from "../errors/BadRequestError"
import type { WriteRequest } from "../types/WriteRequest"
import { parseRequestPayload } from "./parseRequestPayload"

export const validateWriteRequestAndParsePayload = (request: WriteRequest) => {
    if (request.operation.changeSetOnly && !request.changeSetRef)
        throw new BadRequestError(
            `Operation ${request.operation.name} is a changeSetOnly operation, but no changeSetRef was provided`,
        )
    return parseRequestPayload(request)
}
