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

    test("generating over 1024 ids in the same millisecond fails", () => {
        const snowflake = new Snowflake(0, 0)
        const date = new Date()
        date.setMilliseconds(date.getMilliseconds() + 1)
        const ids = []
        for (let i = 0; i < 4096; i++) {
            ids.push(snowflake.generate(Number(date)))
        }
        expect(ids[0]).toBeString()
        expect(ids[4095]).toBeString()
        expect(ids[4096]).toBeUndefined()
        expect(ids[0]).not.toEqual(ids[4095])
        expect(() => snowflake.generate(Number(date))).toThrowError(
            "Error! Sequence overflow",
        )
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
