export const begin = (request, engineOpts, callback) => {
    return callback({
        ...engineOpts,
        changeSet: request.changeSetRef
            ? {
                  entities: new Map([]),
                  mutations: new Map([]),
              }
            : null,
    })
}
