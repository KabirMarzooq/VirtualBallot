// Used by AppContext to avoid circular import with utils.js
export const formatTimeLeft = (ms) => {
    if (ms <= 0) return "00h : 00m : 00s"
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0")
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0")
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")
    return `${h}h : ${m}m : ${s}s`
}
