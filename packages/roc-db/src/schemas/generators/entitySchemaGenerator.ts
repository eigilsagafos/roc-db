import { z, type ZodObject } from "zod"
import { refSchemaGenerator } from "./refSchemaGenerator"
import { MutationRefSchema } from "../MutationRefSchema"

const TimestampWithMutationRefSchema = z.object({
    mutationRef: MutationRefSchema,
    timestamp: z.string().datetime({ precision: 3 }),
})

export const entitySchemaGenerator = <
    const Entity extends string,
    const Data extends ZodObject<any> = ZodObject<{}>,
    const Children extends ZodObject<any> = ZodObject<{}>,
    const Parents extends ZodObject<any> = ZodObject<{}>,
    const Ancestors extends ZodObject<any> = ZodObject<{}>,
>(
    entity: Entity,
    args: {
        data?: Data
        children?: Children
        parents?: Parents
        ancestors?: Ancestors
    },
) => {
    return z
        .object({
            ref: refSchemaGenerator(entity),
            entity: z.string(),
            created: TimestampWithMutationRefSchema.required().strict(),
            updated: TimestampWithMutationRefSchema.required().strict(),
            data: (args.data ?? z.object({}).strict()) as Data,
            children: (args.children ?? z.object({}).strict()) as Children,
            parents: (args.parents ?? z.object({}).strict()) as Parents,
            ancestors: (args.ancestors ?? z.object({}).strict()) as Ancestors,
        })
        .strict()
        .required()
}
