let lastMs = 0
let lastMicro = 0
let lastCallTime = 0

export const microTimestampToIsoString = (microTimestamp: number) => {
    const seconds = Math.floor(microTimestamp / 1_000_000) // Convert microseconds to seconds
    const micros = microTimestamp % 1_000_000 // Remaining microseconds
    const date = new Date(seconds * 1000) // Convert seconds to milliseconds for Date

    // Format to ISO 8601 with microseconds
    const isoString =
        date.toISOString().slice(0, 20) + `${String(micros).padStart(6, "0")}Z`
    // console.log(new Date(isoString).getMilliseconds())
    return isoString
}

export const hrTimeMicroTimestamp = () => {
    const ms = Date.now()
    const [seconds, nanoseconds] = process.hrtime()
    const microOffset = Math.floor(seconds * 1_000_000 + nanoseconds / 1000)
    const microTimestamp = ms * 1000 + (microOffset % 1_000)
    return microTimestampToIsoString(microTimestamp)
}

export const performanceMicroTimestamp = () => {
    const ms = Date.now()
    const perfMs = performance.now()
    const microOffset = Math.floor((perfMs % 1) * 1000)
    const microTimestamp = ms * 1000 + microOffset
    return microTimestampToIsoString(microTimestamp)
}

export const fallbackMicroTimestamp = () => {
    const ms = Date.now()
    if (lastCallTime === 0 || ms !== lastMs) {
        lastMs = ms
        lastMicro = 0
    } else {
        const timeDiff = ms - lastCallTime
        const microStep = Math.max(
            1,
            Math.min((timeDiff * 31) % 1000, 999 - lastMicro),
        )
        lastMicro += microStep
        if (lastMicro >= 1000) {
            lastMicro = lastMicro % 1000
        }
    }
    lastCallTime = ms
    const microTimestamp = ms * 1000 + lastMicro
    return microTimestampToIsoString(microTimestamp)
}

export const nowMicroIsoTimestamp = () => {
    // Node.js: Use process.hrtime for true high-resolution timing
    if (typeof process !== "undefined" && process.hrtime) {
        return hrTimeMicroTimestamp()
    }
    // Browser/Bun: Use performance.now for sub-millisecond precision
    else if (typeof performance !== "undefined" && performance.now) {
        return performanceMicroTimestamp()
    }
    // Fallback: Use Date.now with a time-based microsecond adjustment
    else {
        return fallbackMicroTimestamp()
    }
}
