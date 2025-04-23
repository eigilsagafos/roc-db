import { z, ZodSchema, type ZodObject } from "zod"
import { refSchemaGenerator } from "./schemas/generators/refSchemaGenerator"
import { TimestampWithMutationRefSchema } from "./schemas/TimestampWithMutationRefSchema"

const hasNoUndefined = (value: any): boolean => {
    if (value === null || typeof value !== "object") {
        return value !== undefined
    }

    if (Array.isArray(value)) {
        return value.every(item => hasNoUndefined(item))
    }

    return Object.values(value).every(val => hasNoUndefined(val))
}

const addUndefinedCheck = schema => {
    return schema.refine(hasNoUndefined, {
        message: "Object cannot contain undefined values",
    })
}

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
                data: addUndefinedCheck(
                    args.data ?? z.object({}).strict(),
                ) as Data,
                children: addUndefinedCheck(
                    args.children ?? z.object({}).strict(),
                ) as Children,
                parents: addUndefinedCheck(
                    args.parents ?? z.object({}).strict(),
                ) as Parents,
                ancestors: addUndefinedCheck(
                    args.ancestors ?? z.object({}).strict(),
                ) as Ancestors,
            })
            .strict()
            .required()
    }
}
