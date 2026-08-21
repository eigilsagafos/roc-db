import type { AdapterFunctions } from "./AdapterFunctions"
import type { ReplayDivergenceConfig } from "./ReplayDivergence"
import type { WriteOperation } from "./WriteOperation"

export type AdapterOptions<EngineOpts extends any = any> = {
    functions: AdapterFunctions<EngineOpts>
    async: boolean
    operations: WriteOperation[]
    session: any
    snowflake: any
    /** Replay-divergence detection policy (see {@link ReplayDivergenceConfig}). */
    replayDivergence?: ReplayDivergenceConfig
    [key: string]: any
}
