const debugLog = []
const IDSET = new Set<string>()

const DEFAULT_EPOCH = 1717225200000 // July 1 2024

export class Snowflake {
    private groupId: number
    private serverId: number
    private sequence: number
    private lastTimestamp: number
    private epoch: number

    constructor(
        groupId: number,
        serverId: number,
        epoch: number = DEFAULT_EPOCH,
    ) {
        if (groupId === undefined) throw new Error("groupId is required")
        if (serverId === undefined) throw new Error("serverId is required")
        if (groupId > 255 || groupId < 0)
            throw new Error("groupId is 8 bit so must be between 0 and 255")
        if (serverId > 16_383 || serverId < 0)
            throw new Error(
                "serverId is 14 bit so must be between 0 and 16,383",
            )
        this.groupId = groupId
        this.serverId = serverId
        this.sequence = 0
        this.lastTimestamp = -1
        this.epoch = epoch
    }

    public generate(currentTimestamp = Date.now()): string {
        if (typeof currentTimestamp !== "number") {
            currentTimestamp = new Date(currentTimestamp).getTime()
        }
        if (currentTimestamp.valueOf() === this.lastTimestamp.valueOf()) {
            this.sequence = (this.sequence + 1) & 0xfff // 12 bits for sequence

            // this.sequence
            if (this.sequence === 0) {
                //TODO: Wait for next millisecond
                throw new Error("Error! Sequence overflow")
                // while (currentTimestamp <= this.lastTimestamp) {
                //     currentTimestamp = Date.now()
                // }
            }
        } else {
            // debugLog.push({
            //     s: this.sequence,
            //     current: currentTimestamp.valueOf(),
            //     last: this.lastTimestamp.valueOf(),
            // })
            this.sequence = 0
        }

        this.lastTimestamp = currentTimestamp

        // timestamp in milliseconds
        // 8 bit group (2^8 - 0-255) 128 - intern/128 - realtime
        // 14 bit server/user (2^14 - 0-16,383)
        // 12 bit sequence (2^12 - 4,096)
        // |8bit|14bit|12bit
        // 1234718234712834 | 1     | 1       | 0
        // 1234718234712834 | 0-127 | 0-16383 | 0-1023

        // 00000000000000000000000000000000000000000000000000000000000000000
        const seconds = currentTimestamp - this.epoch
        if (seconds < 0) throw new Error("Timestamp is before epoch")
        const id = (
            (BigInt(seconds) << 34n) |
            (BigInt(this.groupId) << 26n) |
            (BigInt(this.serverId) << 12n) |
            BigInt(this.sequence)
        ).toString()

        // if (IDSET.has(id)) {
        //     console.error('id crash', this.sequence, debugLog)
        //     throw new Error('Duplicate ID')
        // }
        // IDSET.add(id)
        return id
    }

    public parse(id: string) {
        const snowflake = BigInt(id)
        const sequence = Number(snowflake & 0xfffn)
        const serverId = Number((snowflake >> 12n) & 0x3fffn)
        const groupId = Number((snowflake >> 26n) & 0xffn)
        const timestamp = Number(snowflake >> 34n) + Number(this.epoch)
        return [timestamp, groupId, serverId, sequence]
    }
}
