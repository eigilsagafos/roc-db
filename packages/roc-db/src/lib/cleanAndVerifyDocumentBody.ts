export const cleanAndVerifyDocumentBody = (obj: any): any => {
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
            .map(item => cleanAndVerifyDocumentBody(item))
            .filter(item => item !== undefined)
    }

    // Handle plain objects
    if (obj && typeof obj === "object") {
        const result: { [key: string]: any } = {}
        for (const [key, value] of Object.entries(obj)) {
            if (!(value === undefined || value === null)) {
                result[key] = cleanAndVerifyDocumentBody(value)
            }
        }
        return result
    }

    // Return JSON-serializable primitives as-is
    return obj
}
