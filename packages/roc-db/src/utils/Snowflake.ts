const debugLog = []
const IDSET = new Set<string>()

export class Snowflake {
    private groupId: number
    private serverId: number
    private sequence: number
    private lastTimestamp: number
    private epoch: number

    constructor(groupId: number, serverId: number) {
        if (groupId === undefined) throw new Error("groupId is required")
        if (serverId === undefined) throw new Error("serverId is required")
        this.groupId = groupId
        this.serverId = serverId
        this.sequence = 0
        this.lastTimestamp = -1
        this.epoch = 1717225200000 // July 1 2024
    }

    public generate(currentTimestamp = Date.now()): string {
        if (typeof currentTimestamp !== "number") {
            currentTimestamp = new Date(currentTimestamp).getTime()
        }
        if (currentTimestamp.valueOf() === this.lastTimestamp.valueOf()) {
            this.sequence = (this.sequence + 1) & 0xfff // 12 bits for sequence

            // this.sequence
            if (this.sequence === 0) {
                // Wait for next millisecond
                throw new Error("TDOPD")
                while (currentTimestamp <= this.lastTimestamp) {
                    currentTimestamp = Date.now()
                }
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

        // Construct the ID:
        // - 41 bits for time in milliseconds
        // - 13 bits for server id
        // - 10 bits for sequence number

        // timestamp in milliseconds
        // 8 bit group (2^8 - 256) 128 - intern/128 - realtime
        // 14 bit server/user (2^14 - 16,364)
        // 12 bit sequence (2^12 - 4,096)
        // |8bit|14bit|12bit
        // 1234718234712834 | 1 | 1 | 0
        // 1234718234712834 | 0-127 | 1 | 0

        // 00000000000000000000000000000000000000000000000000000000000000000
        const id = (
            (BigInt(currentTimestamp - this.epoch) << 34n) |
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
