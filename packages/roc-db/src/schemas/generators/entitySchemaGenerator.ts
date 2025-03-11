import { z, type ZodObject } from "zod"
import { EntitySchema } from "../EntitySchema"
import { refSchemaGenerator } from "./refSchemaGenerator"
import { Ref } from "../../types/Ref"

export const entitySchemaGenerator = <
    const Entity extends string,
    Data extends ZodObject<any> = ZodObject<{}>,
    Children extends ZodObject<any> = ZodObject<{}>,
    Parents extends ZodObject<any> = ZodObject<{}>,
    Ancestors extends ZodObject<any> = ZodObject<{}>,
>(
    entity: Entity,
    args: {
        ref?: Ref
        data?: Data
        children?: Children
        parents?: Parents
        ancestors?: Ancestors
    } = {},
) =>
    EntitySchema.extend({
        ref: args.ref ?? refSchemaGenerator(entity),
        entity: z.literal(entity),
        data: (args.data ?? z.object({})).strict() as Data,
        children: (args.children ?? z.object({})).strict() as Children,
        parents: (args.parents ?? z.object({})).strict() as Parents,
        ancestors: (args.ancestors ?? z.object({})).strict() as Ancestors,
    })
