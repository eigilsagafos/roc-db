export const parseRequestPayload = request =>
    request.schema.shape.payload.parse(request.payload)
