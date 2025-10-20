export const sortMutations = documents => {
    return [...documents].sort((a, b) => {
        if (a.persistedAt && b.persistedAt) {
            return a.persistedAt.localeCompare(b.persistedAt)
        } else if (a.persistedAt) {
            return -1 // a is persisted, b is not
        } else if (b.persistedAt) {
            return 1 // b is persisted, a is not
        } else if (a.timestamp !== b.timestamp) {
            return a.timestamp.localeCompare(b.timestamp) // Older timestamps first
        } else {
            // If timestamps are equal, sort by ref alphabetically
            return a.ref.localeCompare(b.ref)
        }
    })
}
