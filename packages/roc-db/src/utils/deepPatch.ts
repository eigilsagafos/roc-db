export const deepEqual = (a: any, b: any): boolean => {
    // Same reference or identical primitives
    if (a === b) return true

    // Handle null or undefined
    if (a == null || b == null) return a === b

    // Different types
    if (typeof a !== typeof b) return false

    // Array comparison
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false
        return a.every((item, index) => deepEqual(item, b[index]))
    }

    // Object comparison
    if (typeof a === "object") {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        if (keysA.length !== keysB.length) return false
        return keysA.every(key => deepEqual(a[key], b[key]))
    }

    // Fallback for primitives
    return false
}

export const deepMergePatchSet = (current, patch) => {
    // Handle null or undefined
    if (patch == null) return patch
    if (current == null) return patch
    // Handle non-object patch
    if (typeof patch !== "object") return patch
    // Handle array patch
    if (Array.isArray(patch)) return patch

    if (typeof current !== "object") return patch
    const result = { ...current }
    Object.keys(patch).forEach(key => {
        result[key] = deepMergePatchSet(result[key], patch[key])
    })
    return result
}

export const deepPatch = (original, patch) => {
    // No patch provided, return original unchanged
    if (patch === undefined) {
        return [original, undefined]
    }

    // Handle non-object patch (primitives or null)
    if (typeof patch !== "object" || patch === null) {
        if (patch === original) {
            return [original, undefined]
        }
        return [patch, original]
    }

    // Handle array patch
    if (Array.isArray(patch)) {
        if (Array.isArray(original) && deepEqual(original, patch)) {
            return [original, undefined] // No change if deeply equal
        }
        return [patch, original] // Replace and store original for reversal
    }

    // If original is non-object or array, replace it entirely
    if (
        typeof original !== "object" ||
        original === null ||
        Array.isArray(original)
    ) {
        return [patch, original]
    }

    // Both are plain objects, patch recursively
    const result = { ...original }
    const reversePatch = {}

    Object.keys(patch).forEach(key => {
        if (patch[key] === null) {
            // Delete key if patch sets it to null
            if (key in original) {
                reversePatch[key] = original[key]
            }
            delete result[key]
        } else {
            // Recursively patch sub-property
            const [patchedValue, reverseSubPatch] = deepPatch(
                original[key],
                patch[key],
            )
            result[key] = patchedValue
            if (reverseSubPatch !== undefined) {
                reversePatch[key] = reverseSubPatch
            } else if (!(key in original)) {
                reversePatch[key] = null // Mark new key for deletion in reverse
            }
        }
    })

    // Return result and reversePatch (undefined if empty)
    return [
        result,
        Object.keys(reversePatch).length > 0 ? reversePatch : undefined,
    ]
}
