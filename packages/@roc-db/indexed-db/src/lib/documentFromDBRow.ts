export const documentFromDBRow = ({
    unique_constraint_0,
    unique_constraint_1,
    index_entries,
    ...document
}: any) => {
    return {
        ...document,
        __: {
            uniqueExisting: [],
            indexExisting: [],
        },
    }
}
