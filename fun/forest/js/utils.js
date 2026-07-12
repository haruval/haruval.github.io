export const IS_MOBILE = window.innerWidth < 720;

export const BG_COLOR = 0xd9d9d9;   // flat paper grey, no fog, no gradients
export const INK_COLOR = 0x303030;  // single pen weight

export const DEFAULT_SEED = 20260711;

// seed comes from ?seed=… (number or any string) so a forest is shareable;
// change DEFAULT_SEED to regrow the default walk
export function resolveSeed() {
    try {
        const raw = new URLSearchParams(window.location.search).get('seed');
        if (raw) {
            const n = Number(raw);
            if (Number.isFinite(n)) return n >>> 0;
            let h = 2166136261;
            for (let i = 0; i < raw.length; i += 1) {
                h ^= raw.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        }
    } catch { /* embedded without a URL — fall through */ }
    return DEFAULT_SEED;
}

// mulberry32: tiny deterministic PRNG, one 32-bit word of state
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// derive an independent stream per chunk index so the forest is identical
// for a given seed no matter when chunks are generated
export function hashSeed(seed, n) {
    let h = (seed ^ Math.imul(n + 0x9e3779b9, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

export function makeRng(seed) {
    const next = mulberry32(seed);
    return {
        next,
        range: (a, b) => a + next() * (b - a),
        int: (a, b) => a + Math.floor(next() * (b - a + 1)),
        pick: (arr) => arr[Math.floor(next() * arr.length)],
        chance: (p) => next() < p,
        sign: () => (next() < 0.5 ? -1 : 1),
    };
}
