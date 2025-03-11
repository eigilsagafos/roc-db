import { z } from "zod"
import { RefSchema } from "./RefSchema"
import { MutationRefSchema } from "./MutationRefSchema"

const TimestampWithMutationRefSchema = z.object({
    mutationRef: MutationRefSchema,
    timestamp: z.string().datetime({ precision: 3 }),
})

export const EntitySchema = z
    .object({
        ref: RefSchema,
        entity: z.string(),
        created: TimestampWithMutationRefSchema.required().strict(),
        updated: TimestampWithMutationRefSchema.required().strict(),
        data: z.object({}).required(),
        parents: z.object({}).required(),
        ancestors: z.object({}).required(),
    })
    .strict()
    .required()

const Base = z.object({
    ref: RefSchema,
    entity: z.string(),
    created: TimestampWithMutationRefSchema.required().strict(),
    updated: TimestampWithMutationRefSchema.required().strict(),
    data: z.object({}).required(),
    parents: z.object({}).required(),
    ancestors: z.object({}).required(),
})

const CommentSchema = Base.extend({
    ref: RefSchema,
    entity: z.literal("Foo"),
})
    .strict()
    .required()

type Comment = z.infer<typeof CommentSchema>
