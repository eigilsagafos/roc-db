import type { MutationRef } from "../types/MutationRef"

export class ApplyChangeSetError extends Error {
    readonly mutationRef: MutationRef
    readonly operationName: string
    readonly timestamp: string

    constructor(
        args: {
            mutationRef: MutationRef
            operationName: string
            timestamp: string
        },
        options?: { cause?: unknown },
    ) {
        super(
            `applyChangeSet failed at mutation ${args.mutationRef} (operation: ${args.operationName}, timestamp: ${args.timestamp}): ${options?.cause instanceof Error ? options.cause.message : String(options?.cause)}`,
            options,
        )
        this.name = "ApplyChangeSetError"
        this.mutationRef = args.mutationRef
        this.operationName = args.operationName
        this.timestamp = args.timestamp
    }
}
