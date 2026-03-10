import { expect } from "bun:test"
import type { ZodType } from "zod"

const toMatchZodType = (received: any, schema: ZodType) => {
    const res = schema.safeParse(received)
    return { pass: res.success, message: () => res.error?.message }
}

// @ts-ignore
expect.extend({ toMatchZodType })

interface CustomMatchers {
    toMatchZodType(schema: ZodType): any
}

declare module "bun:test" {
    interface Matchers<T> extends CustomMatchers {}
    interface AsymmetricMatchers extends CustomMatchers {}
}
