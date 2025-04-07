import type { ReadTransaction } from "../lib/ReadTransaction"
import type { WriteTransaction } from "../lib/WriteTransaction"

export type Transaction<EngineOpts extends any = any> =
    | ReadTransaction<EngineOpts>
    | WriteTransaction<EngineOpts>
