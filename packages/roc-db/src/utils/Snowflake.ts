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

    public generate(currentTimestamp: number | string = Date.now()): string {
        if (typeof currentTimestamp !== "number") {
            currentTimestamp = new Date(currentTimestamp).getTime()
        }
        // Never let the logical clock run backwards: if the supplied timestamp
        // is older than the last one we used (or we've already rolled ahead of
        // it), keep using the later timestamp so ids stay monotonic.
        let timestamp = Math.max(currentTimestamp, this.lastTimestamp)
        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1) & 0xfff // 12 bits for sequence

            if (this.sequence === 0) {
                // Sequence exhausted for this millisecond — roll into the next
                // one instead of throwing. The caller often supplies a fixed
                // timestamp (e.g. one transaction's), so we can't wait for the
                // wall clock to advance; rolling the logical timestamp forward
                // keeps ids unique and monotonic when many are generated under
                // a single timestamp (e.g. duplicating a very large changeSet).
                timestamp += 1
            }
        } else {
            this.sequence = 0
        }

        this.lastTimestamp = timestamp

        // timestamp in milliseconds
        // 8 bit group (2^8 - 0-255) 128 - intern/128 - realtime
        // 14 bit server/user (2^14 - 0-16,383)
        // 12 bit sequence (2^12 - 4,096)
        // |8bit|14bit|12bit
        // 1234718234712834 | 1     | 1       | 0
        // 1234718234712834 | 0-127 | 0-16383 | 0-1023

        // 00000000000000000000000000000000000000000000000000000000000000000
        const seconds = timestamp - this.epoch
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
