export const sortMutations = documents => {
    return [...documents].sort((a, b) => {
        // Compare timestamps as strings first
        if (a.timestamp !== b.timestamp) {
            return a.timestamp.localeCompare(b.timestamp) // Older timestamps first
        }

        // If timestamps are equal, sort by ref alphabetically
        return a.ref.localeCompare(b.ref)
    })
}
