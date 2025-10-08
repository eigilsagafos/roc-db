export const generateTransactionCache = (initialized = false) => ({
    mutations: new Map(),
    entities: new Map(),
    entitiesUnique: new Map(),
    entitiesIndex: new Map(),
    initialized,
})
