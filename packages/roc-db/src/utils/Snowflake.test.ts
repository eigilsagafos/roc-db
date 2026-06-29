import { describe, expect, test } from "bun:test"
import { Snowflake } from "./Snowflake"

describe("Snowflake", () => {
    test("parse", () => {
        const snowflake = new Snowflake(1, 1)
        const ts = Date.now()
        const id1 = snowflake.generate(ts)
        const id2 = snowflake.generate(ts)
        const res1 = snowflake.parse(id1)
        const res2 = snowflake.parse(id2)
        expect(res1).toStrictEqual([ts, 1, 1, 0])
        expect(res2).toStrictEqual([ts, 1, 1, 1])
    })

    test("group over 256 fails", () => {
        expect(() => new Snowflake(256, 1)).toThrow(
            "groupId is 8 bit so must be between 0 and 255",
        )
    })
    test("group under 0 fails", () => {
        expect(() => new Snowflake(-1, 1)).toThrow(
            "groupId is 8 bit so must be between 0 and 255",
        )
    })
    test("serverId over 16383 fails", () => {
        expect(() => new Snowflake(0, 16384)).toThrow(
            "serverId is 14 bit so must be between 0 and 16,383",
        )
    })
    test("serverId under 0 fails", () => {
        expect(() => new Snowflake(0, -1)).toThrow(
            "serverId is 14 bit so must be between 0 and 16,383",
        )
    })

    test("timestamp before epoch fails", () => {
        const snowflake = new Snowflake(0, 0)
        const date = new Date("2023-10-01T00:00:00Z")
        expect(() => snowflake.generate(Number(date))).toThrowError(
            "Timestamp is before epoch",
        )
    })

    test("generating over 4096 ids in the same millisecond rolls into the next ms", () => {
        const snowflake = new Snowflake(0, 0)
        const date = new Date()
        date.setMilliseconds(date.getMilliseconds() + 1)
        const ms = Number(date)
        const ids: string[] = []
        for (let i = 0; i < 5000; i++) {
            ids.push(snowflake.generate(ms))
        }
        // No throw; every id is unique and strictly increasing.
        expect(new Set(ids).size).toBe(5000)
        for (let i = 1; i < ids.length; i++) {
            expect(BigInt(ids[i]) > BigInt(ids[i - 1])).toBe(true)
        }
        // The first 4096 live in `ms`; the rest roll into the next millisecond.
        expect(snowflake.parse(ids[0])[0]).toBe(ms)
        expect(snowflake.parse(ids[4095])[0]).toBe(ms)
        expect(snowflake.parse(ids[4096])[0]).toBe(ms + 1)
    })

    test("date 100 years in the future parses correctly", () => {
        const date = new Date()
        date.setFullYear(date.getFullYear() + 100)
        const snowflake1 = new Snowflake(0, 0)
        const snowflake2 = new Snowflake(255, 16383)
        const id1 = snowflake1.generate(Number(date))
        const id2 = snowflake2.generate(Number(date))
        const parsed1 = snowflake1.parse(id1)
        const parsed2 = snowflake2.parse(id2)
        expect(parsed1).toEqual([Number(date), 0, 0, 0])
        expect(parsed2).toEqual([Number(date), 255, 16383, 0])
    })

    test("date 1000 years in the future parses correctly", () => {
        const date = new Date()
        date.setFullYear(date.getFullYear() + 1000)
        const snowflake1 = new Snowflake(0, 0)
        const snowflake2 = new Snowflake(255, 16383)
        const id1 = snowflake1.generate(Number(date))
        const id2 = snowflake2.generate(Number(date))
        const parsed1 = snowflake1.parse(id1)
        const parsed2 = snowflake2.parse(id2)
        expect(parsed1).toEqual([Number(date), 0, 0, 0])
        expect(parsed2).toEqual([Number(date), 255, 16383, 0])
    })
})
