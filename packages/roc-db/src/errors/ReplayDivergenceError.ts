import type { ReplayDivergenceInfo } from "../types/ReplayDivergence"

/**
 * Thrown (under the `strict` replay-divergence policy) when re-executing a
 * stored mutation on load reproduces a different effect than the one that was
 * persisted. Names the mutation, the operation, and the first diverging
 * entity+field with expected-vs-actual values.
 */
export class ReplayDivergenceError extends Error {
    info: ReplayDivergenceInfo

    constructor(info: ReplayDivergenceInfo) {
        super(
            `Replay divergence in mutation ${info.mutationRef}` +
                ` (operation "${info.operation}") [${info.kind}]:` +
                ` ${info.entity} field "${info.field}" —` +
                ` expected ${JSON.stringify(info.expected)}` +
                ` but recomputed ${JSON.stringify(info.actual)}`,
        )
        this.name = "ReplayDivergenceError"
        this.info = info
    }
}
