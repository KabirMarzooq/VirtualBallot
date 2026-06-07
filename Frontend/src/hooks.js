import { useState, useEffect } from "react"

// ─── useCountdownTick: local second ticker for login countdown display ─────────
export function useCountdownTick() {
    const [tick, setTick] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000)
        return () => clearInterval(id)
    }, [])
    return tick
}

// ─── useSessionTimeout: auto-logout after idle ms ────────────────────────────
export function useSessionTimeout(ms, onTimeout) {
    useEffect(() => {
        const t = setTimeout(onTimeout, ms)
        return () => clearTimeout(t)
    }, [ms, onTimeout])
}

// ─── useImageLoad: track whether a URL image loaded OK ───────────────────────
export function useImageLoad(url) {
    const [ok, setOk] = useState(true)
    useEffect(() => { setOk(true) }, [url])
    return [ok, () => setOk(false)]
}