import { z, type ZodObject } from "zod"
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

type MutationRef = `Mutation/${number}`

type EntityRef<Name extends string, Singleton extends boolean> =
    Singleton extends true ? Name : `${Name}/${number}`

type EntitySchemaOutput<
    Name extends string,
    Singleton extends boolean,
    Data extends ZodObject<any>,
    Children extends ZodObject<any>,
    Parents extends ZodObject<any>,
    Ancestors extends ZodObject<any>,
> = {
    ref: EntityRef<Name, Singleton>
    entity: Name
    created: { timestamp: string; mutationRef: MutationRef }
    updated: { timestamp: string; mutationRef: MutationRef }
    data: z.output<Data>
    children: z.output<Children>
    parents: z.output<Parents>
    ancestors: z.output<Ancestors>
}

export class Entity<
    const Name extends string,
    const Data extends ZodObject<any> = ZodObject<{}>,
    const Children extends ZodObject<any> = ZodObject<{}>,
    const Parents extends ZodObject<any> = ZodObject<{}>,
    const Ancestors extends ZodObject<any> = ZodObject<{}>,
    const Singleton extends boolean = false,
> {
    name: Name
    singleton: Singleton
    indexedDataKeys: string[]
    uniqueDataKeys: string[]
    schema: z.ZodType<
        EntitySchemaOutput<Name, Singleton, Data, Children, Parents, Ancestors>,
        EntitySchemaOutput<Name, Singleton, Data, Children, Parents, Ancestors>
    >
    refSchema: z.ZodType<EntityRef<Name, Singleton>, EntityRef<Name, Singleton>>
    constructor(
        name: Name,
        args: {
            singleton?: Singleton
            data?: Data
            children?: Children
            parents?: Parents
            ancestors?: Ancestors
            indexedDataKeys?: string[]
            uniqueDataKeys?: string[]
        },
    ) {
        this.name = name
        this.singleton = (args.singleton ?? false) as Singleton
        this.indexedDataKeys = args.indexedDataKeys ?? []
        this.uniqueDataKeys = args.uniqueDataKeys ?? []
        if (this.singleton) {
            if (this.indexedDataKeys.length || this.uniqueDataKeys.length) {
                throw new Error(
                    `Entity "${name}" is a singleton; indexedDataKeys and uniqueDataKeys are not allowed`,
                )
            }
        }
        this.refSchema = (
            this.singleton ? z.literal(name) : refSchemaGenerator(name)
        ) as any
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
            .required() as any
    }
}
