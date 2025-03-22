import { BadRequestError } from "../errors/BadRequestError"
import { parseRequestPayload } from "./parseRequestPayload"

export const validateWriteRequestAndParsePayload = request => {
    if (request.settings.changeSetOnly && !request.changeSetRef)
        throw new BadRequestError(
            `Operation ${request.operationName} is a changeSetOnly operation, but no changeSetRef was provided`,
        )
    return parseRequestPayload(request)
}
