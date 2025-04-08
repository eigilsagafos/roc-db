export const mutationNameFromSchema = schema => {
    return schema.shape.operation.shape.name.value
}
