import { z, ZodObject } from "zod"
import { EntitySchema } from "../EntitySchema"
import { refSchemaGenerator } from "./refSchemaGenerator"

export const entitySchemaGenerator = <
    const Entity extends string,
    Data extends ZodObject<any>,
    Parents extends ZodObject<any>,
    Ancestors extends ZodObject<any>,
>(
    entity: Entity,
    args: {
        data?: Data
        parents?: Parents
        ancestors?: Ancestors
    } = {},
) =>
    EntitySchema.extend({
        entity: z.literal(entity),
        ref: refSchemaGenerator(entity),
        data: (args.data ?? z.object({})) as Data,
        parents: (args.parents ?? z.object({})) as Parents,
        ancestors: (args.ancestors ?? z.object({})) as Ancestors,
    })
