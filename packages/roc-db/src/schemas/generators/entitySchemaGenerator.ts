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
        .strictObject({
            ref: refSchemaGenerator(entity),
            entity: z.literal(entity),
            created: TimestampWithMutationRefSchema.required().strict(),
            updated: TimestampWithMutationRefSchema.required().strict(),
            data: (args.data ?? z.strictObject({})) as Data,
            children: (args.children ?? z.strictObject({})) as Children,
            parents: (args.parents ?? z.strictObject({})) as Parents,
            ancestors: (args.ancestors ?? z.strictObject({})) as Ancestors,
        })
        .required()
}
