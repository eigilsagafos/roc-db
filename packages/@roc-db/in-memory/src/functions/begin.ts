export const begin = (request, engineOpts) => {
    return {
        ...engineOpts,
        changeSet: request.changeSetRef
            ? {
                  entities: new Map([]),
                  mutations: new Map([]),
              }
            : null,
    }
}
