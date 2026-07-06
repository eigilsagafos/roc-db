import type { ReadEntityFunctiun } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const readEntity: ReadEntityFunctiun<InMemoryEngine> = (txn, ref) =>
    txn.engineOpts.entities.get(ref)
