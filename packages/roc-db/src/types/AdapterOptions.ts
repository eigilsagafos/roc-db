import type { AdapterFunctions } from "./AdapterFunctions"
import type { WriteOperation } from "./WriteOperation"

export type AdapterOptions<EngineOpts extends any = any> = {
    functions: AdapterFunctions<EngineOpts>
    async: boolean
    operations: WriteOperation[]
}
