export const begin = async (request, engineOpts) => {
    return new Promise((resolveOpts, rejectOpts) => {
        sql.begin(async tx => {
            return new Promise((resolveTxn, rejectTxn) => {
                resolveOpts({
                    ...engineOpts,
                    sqlClient: sql,
                    sqlTxn: tx,
                    uncommitted: {},
                    resolveTxn,
                    rejectTxn,
                    changeSet: request.changeSetRef
                        ? {
                              entities: new Map([]),
                              mutations: new Map([]),
                          }
                        : null,
                })
            })
        })
    })
}
