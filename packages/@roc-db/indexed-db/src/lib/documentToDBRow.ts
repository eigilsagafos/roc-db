const stringifyIndexEntry = (entity: string, [k, v]: [string, any]) =>
    `${entity}:${k}:${JSON.stringify(v)}`
const stringifyUniqueEntry = ([k, v]: [string, any]) =>
    `${k}:${JSON.stringify(v)}`

const stringifyIndexEntries = (entity: string, arr: [string, any][]) => {
    return arr.map(pair => stringifyIndexEntry(entity, pair))
}

export const documentToDBRow = (document: any) => {
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
