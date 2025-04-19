const stringifyIndexEntry = (entity, [k, v]) =>
    `${entity}:${k}:${JSON.stringify(v)}`
const stringifyUniqueEntry = ([k, v]) => `${k}:${JSON.stringify(v)}`

const stringifyIndexEntries = (entity, arr) => {
    return arr.map(pair => stringifyIndexEntry(entity, pair))
}

export const documentToDBRow = document => {
    return {
        ...document,
        index_entries: document.__.index
            ? stringifyIndexEntries(document.entity, document.__.index)
            : [],
        unique_constraint_0: document.__?.unique?.[0]
            ? stringifyUniqueEntry(document.__?.unique?.[0])
            : null,
        unique_constraint_1: document.__?.unique?.[1]
            ? stringifyUniqueEntry(document.__?.unique?.[1])
            : null,
    }
}
