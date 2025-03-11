export const deepPatch = (original, patch) => {
    if (typeof patch !== "object" || patch === null) {
        return patch
    }
    if (Array.isArray(patch)) {
        return patch
    }

    return Object.keys(patch).reduce(
        (acc, key) => {
            if (patch[key] === null) {
                delete acc[key]
                return acc
            }
            acc[key] = deepPatch(original?.[key], patch[key])
            return acc
        },
        { ...original },
    )
}
