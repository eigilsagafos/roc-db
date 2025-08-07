export const cleanAndVerifyDocumentBody = (
    obj: any,
    allowFile = false,
): any => {
    // Crash on non-JSON-serializable types
    if (
        obj instanceof Set ||
        obj instanceof Map ||
        obj instanceof WeakSet ||
        obj instanceof WeakMap ||
        typeof obj === "function" ||
        typeof obj === "symbol" ||
        typeof obj === "bigint"
    ) {
        throw new Error(
            `Non-JSON-serializable type detected: ${typeof obj === "object" ? obj.constructor.name : typeof obj}`,
        )
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj
            .map(item => cleanAndVerifyDocumentBody(item, allowFile))
            .filter(item => item !== undefined)
    }

    if (allowFile && obj instanceof File) return obj
    // Handle plain objects
    if (obj && typeof obj === "object") {
        const result: { [key: string]: any } = {}
        for (const [key, value] of Object.entries(obj)) {
            if (!(value === undefined || value === null)) {
                result[key] = cleanAndVerifyDocumentBody(value, allowFile)
            }
        }
        return result
    }

    // Return JSON-serializable primitives as-is
    return obj
}
