import { z, ZodSchema, type ZodObject } from "zod"
import { refSchemaGenerator } from "./schemas/generators/refSchemaGenerator"
import { TimestampWithMutationRefSchema } from "./schemas/TimestampWithMutationRefSchema"

export class Entity<
    const Name extends string,
    const Data extends ZodObject<any> = ZodObject<{}>,
    const Children extends ZodObject<any> = ZodObject<{}>,
    const Parents extends ZodObject<any> = ZodObject<{}>,
    const Ancestors extends ZodObject<any> = ZodObject<{}>,
> {
    name: Name
    indexedDataKeys: string[]
    uniqueDataKeys: string[]
    schema: ZodSchema
    refSchema: z.ZodType<`${Name}/${string}`, z.ZodTypeDef, `${Name}/${string}`>
    constructor(
        name: Name,
        args: {
            data?: Data
            children?: Children
            parents?: Parents
            ancestors?: Ancestors
            indexedDataKeys?: string[]
            uniqueDataKeys?: string[]
        },
    ) {
        this.name = name
        this.indexedDataKeys = args.indexedDataKeys ?? []
        this.uniqueDataKeys = args.uniqueDataKeys ?? []
        this.refSchema = refSchemaGenerator(name)
        this.schema = z
            .object({
                ref: this.refSchema,
                entity: z.literal(name),
                created: TimestampWithMutationRefSchema.required().strict(),
                updated: TimestampWithMutationRefSchema.required().strict(),
                data: (args.data ?? z.object({}).strict()) as Data,
                children: (args.children ?? z.object({}).strict()) as Children,
                parents: (args.parents ?? z.object({}).strict()) as Parents,
                ancestors: (args.ancestors ??
                    z.object({}).strict()) as Ancestors,
            })
            .strict()
            .required()
    }
}
