export const end = async engineOpts => {
    const { sqlTxn } = engineOpts

    if (engineOpts.onTransactionEnd) {
        await engineOpts.onTransactionEnd(sqlTxn)
    }
}
