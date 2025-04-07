export const defaultBeginTransaction = <EngineOpts extends {}>(
    engineOpts: EngineOpts,
    callback: (opts: EngineOpts) => EngineOpts,
) => callback(engineOpts)
