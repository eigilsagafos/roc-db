import { expect } from "bun:test"
import type { ZodSchema } from "zod"

const toMatchZodSchema = (received: any, schema: ZodSchema) => {
    const res = schema.safeParse(received)
    return { pass: res.success, message: () => res.error?.message }
}

// @ts-ignore
expect.extend({ toMatchZodSchema })

interface CustomMatchers {
    toMatchZodSchema(schema: ZodSchema): any
}

declare module "bun:test" {
    interface Matchers<T> extends CustomMatchers {}
    interface AsymmetricMatchers extends CustomMatchers {}
}
