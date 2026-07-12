import * as THREE from '/portfolio/vendor/three/three.module.js';
import { INK_COLOR } from './utils.js';

export const PATH_HALF = 1.35;  // walkable corridor half-width

export const inkMat = new THREE.LineBasicMaterial({ color: INK_COLOR });

// ---- pen: ordered stroke accumulator ------------------------------------
// strokes are appended as line-segment pairs in draw order, so revealing the
// vertex buffer front-to-back with drawRange plays the drawing back like a
// plotter: long lines are subdivided so the stroke sweeps smoothly

export function makePen() {
    const pts = [];
    function seg(ax, ay, az, bx, by, bz) {
        pts.push(ax, ay, az, bx, by, bz);
    }
    function line(a, b, maxSeg = 0.5) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / maxSeg));
        for (let i = 0; i < n; i += 1) {
            const u = i / n, v = (i + 1) / n;
            seg(
                a[0] + dx * u, a[1] + dy * u, a[2] + dz * u,
                a[0] + dx * v, a[1] + dy * v, a[2] + dz * v,
            );
        }
    }
    function polyline(points, maxSeg = 0.5) {
        for (let i = 0; i < points.length - 1; i += 1) line(points[i], points[i + 1], maxSeg);
    }
    function loop(points, maxSeg = 0.5) {
        polyline(points, maxSeg);
        line(points[points.length - 1], points[0], maxSeg);
    }
    function build() {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        geo.computeBoundingSphere();
        geo.setDrawRange(0, 0);
        return geo;
    }
    return { seg, line, polyline, loop, build, count: () => pts.length / 6 };
}

// ---- piece frames --------------------------------------------------------
// chunk geometry is built in a local frame where the piece enters at the
// origin heading -Z; at(t) returns the centerline point and its right vector

export function makeStraightFrame(len) {
    return {
        len,
        at(t) { return { x: 0, z: -t, rx: 1, rz: 0 }; },
    };
}

export function makeArcFrame(r, d, angle) {
    return {
        len: r * angle,
        at(t) {
            const a = t / r;
            return {
                x: d * r * (1 - Math.cos(a)),
                z: -r * Math.sin(a),
                rx: Math.cos(a),
                rz: d * Math.sin(a),
            };
        },
    };
}

// the branch not taken: a straight spur at 45 degrees the other way
function makeStubFrame(d, len) {
    const ang = -d * Math.PI / 4;
    const ux = Math.sin(ang), uz = -Math.cos(ang);
    return {
        len,
        at(t) { return { x: ux * t, z: uz * t, rx: -uz, rz: ux }; },
    };
}

// ---- tree archetypes ------------------------------------------------------
// each draws into a pen in tree-local space (base at origin, +Y up), trunk
// strokes first, then branches, then foliage, so the reveal sketches them
// in that order

function conifer(pen, rng) {
    const h = rng.range(4.5, 9);
    const lean = rng.range(-0.06, 0.06);
    const baseR = rng.range(0.1, 0.18) * (h / 7);
    const tipX = lean * h;
    for (const s of [-1, 1]) {
        pen.polyline([
            [s * baseR, 0, 0],
            [s * baseR * 0.45 + tipX * 0.5, h * 0.5, 0],
            [tipX, h, 0],
        ], 0.7);
    }
    // dense-forest conifers self-prune: no tiers at head height, so low
    // branches never sweep across the camera
    let y = Math.max(h * rng.range(0.18, 0.26), 2.0);
    while (y < h * 0.92) {
        const tierR = Math.min(2.2, (1 - y / h) * rng.range(1.5, 2.4) * (h / 7) + 0.25);
        const nBr = rng.int(3, 5);
        const az0 = rng.range(0, Math.PI * 2);
        for (let i = 0; i < nBr; i += 1) {
            const az = az0 + (i / nBr) * Math.PI * 2 + rng.range(-0.35, 0.35);
            const ex = Math.cos(az) * tierR, ez = Math.sin(az) * tierR;
            const droop = tierR * rng.range(0.28, 0.5);
            const bx = lean * y;
            pen.polyline([
                [bx, y + droop * 0.55, 0],
                [bx + ex * 0.55, y + droop * 0.2, ez * 0.55],
                [bx + ex, y - droop * 0.45, ez],
            ], 0.6);
            for (let k = rng.int(1, 2); k > 0; k -= 1) {
                const f = rng.range(0.55, 0.9);
                const px = bx + ex * f, pz = ez * f;
                const py = y + droop * 0.2 - droop * 0.65 * f;
                pen.seg(px, py, pz, px + ex * 0.14, py - droop * 0.3 - 0.08, pz + ez * 0.14);
            }
        }
        y += rng.range(0.55, 0.85) * (h / 7 + 0.35);
    }
}

function deciduous(pen, rng) {
    const tips = [];
    const maxDepth = 3;
    function grow(x, y, z, dx, dy, dz, len, depth) {
        const m = Math.hypot(dx, dy, dz) || 1;
        dx /= m; dy /= m; dz /= m;
        const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len;
        const jx = rng.range(-0.18, 0.18) * len, jz = rng.range(-0.18, 0.18) * len;
        pen.polyline([
            [x, y, z],
            [x + dx * len * 0.5 + jx, y + dy * len * 0.5, z + dz * len * 0.5 + jz],
            [ex, ey, ez],
        ], 0.55);
        if (depth >= maxDepth) {
            tips.push([ex, ey, ez, len]);
            return;
        }
        const kids = depth === 0 ? rng.int(2, 3) : 2;
        for (let i = 0; i < kids; i += 1) {
            const spread = rng.range(0.45, 0.85);
            const az = rng.range(0, Math.PI * 2);
            grow(
                ex, ey, ez,
                dx + Math.cos(az) * spread,
                dy + rng.range(0.15, 0.55),
                dz + Math.sin(az) * spread,
                len * rng.range(0.55, 0.72),
                depth + 1,
            );
        }
    }
    grow(0, 0, 0, rng.range(-0.08, 0.08), 1, rng.range(-0.08, 0.08), rng.range(2.4, 3.6), 0);
    for (const [tx, ty, tz, tlen] of tips) {
        for (let b = rng.chance(0.5) ? 2 : 1; b > 0; b -= 1) {
            const r = tlen * rng.range(0.6, 1.05);
            const cx = tx + rng.range(-0.2, 0.2), cy = ty + r * 0.35, cz = tz + rng.range(-0.2, 0.2);
            const tilt = rng.range(-0.5, 0.5);
            const ring = [];
            for (let i = 0; i < 8; i += 1) {
                const a = (i / 8) * Math.PI * 2;
                const rr = r * rng.range(0.75, 1.2);
                ring.push([
                    cx + Math.cos(a) * rr,
                    cy + Math.sin(a) * rr * 0.62 + Math.cos(a) * rr * tilt * 0.3,
                    cz + Math.sin(a) * rr * rng.range(0.2, 0.5),
                ]);
            }
            pen.loop(ring, 1.2);
        }
    }
}

function birch(pen, rng) {
    const h = rng.range(4.5, 7.5);
    const w = rng.range(0.05, 0.09);
    const sway = rng.range(-0.4, 0.4);
    const ctr = (y) => sway * (y / h) * (y / h);
    // two edge pairs in perpendicular planes so the thin trunk reads from
    // every angle instead of vanishing edge-on
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const points = [];
        for (let i = 0; i <= 5; i += 1) {
            const y = (i / 5) * h;
            const e = w * (1 - (y / h) * 0.55);
            points.push([ctr(y) + ox * e, y, oz * e]);
        }
        pen.polyline(points, 0.8);
    }
    let y = rng.range(0.3, 0.6);
    while (y < h * 0.78) {
        const tx = ctr(y);
        const tw = w * rng.range(1.6, 2.6);
        if (rng.chance(0.5)) pen.seg(tx - tw, y, 0, tx + tw, y + rng.range(-0.04, 0.04), 0);
        else pen.seg(tx, y, -tw, tx, y + rng.range(-0.04, 0.04), tw);
        y += rng.range(0.32, 0.6);
    }
    for (let i = rng.int(2, 4); i > 0; i -= 1) {
        const by = h * rng.range(0.55, 0.9);
        const az = rng.range(0, Math.PI * 2);
        const bl = rng.range(0.8, 1.6);
        const bx = ctr(by);
        const ex = bx + Math.cos(az) * bl, ey = by + bl * rng.range(0.5, 0.9), ez = Math.sin(az) * bl;
        pen.polyline([[bx, by, 0], [ex, ey, ez]], 0.5);
        for (let k = rng.int(2, 4); k > 0; k -= 1) {
            const f = rng.range(0.4, 1);
            const lx = bx + (ex - bx) * f, ly = by + (ey - by) * f, lz = ez * f;
            pen.seg(lx, ly, lz, lx + rng.range(-0.16, 0.16), ly + rng.range(0.05, 0.2), lz + rng.range(-0.16, 0.16));
        }
    }
}

function snag(pen, rng) {
    const h = rng.range(2.2, 4.2);
    const n = rng.int(3, 5);
    const spine = [[0, 0, 0]];
    let px = 0, pz = 0;
    for (let i = 1; i <= n; i += 1) {
        px += rng.range(-0.35, 0.35);
        pz += rng.range(-0.35, 0.35);
        spine.push([px, (i / n) * h, pz]);
    }
    pen.polyline(spine, 0.6);
    pen.polyline([
        [0.14, 0, 0.06],
        [spine[1][0] + 0.1, spine[1][1], spine[1][2]],
        [spine[2][0], spine[2][1], spine[2][2]],
    ], 0.6);
    for (let i = rng.int(2, 4); i > 0; i -= 1) {
        const idx = Math.max(1, Math.floor(rng.range(0.35, 0.95) * n));
        const [bx, by, bz] = spine[idx];
        const az = rng.range(0, Math.PI * 2);
        const bl = rng.range(0.5, 1.4);
        const upd = rng.range(-0.5, 0.7);
        pen.polyline([
            [bx, by, bz],
            [bx + Math.cos(az) * bl * 0.6, by + upd * bl * 0.6 + rng.range(-0.1, 0.2), bz + Math.sin(az) * bl * 0.6],
            [bx + Math.cos(az) * bl, by + upd * bl, bz + Math.sin(az) * bl],
        ], 0.5);
    }
}

const TREE_MAKERS = [
    { fn: conifer, w: 0.3 },
    { fn: deciduous, w: 0.3 },
    { fn: birch, w: 0.24 },
    { fn: snag, w: 0.16 },
];

function pickTreeMaker(rng) {
    let roll = rng.next();
    for (const t of TREE_MAKERS) {
        roll -= t.w;
        if (roll <= 0) return t.fn;
    }
    return TREE_MAKERS[0].fn;
}

// ---- ground flora ---------------------------------------------------------
// small items draw straight into a shared batch pen at world-of-chunk coords

function addFern(pen, rng, x, z) {
    const s = rng.range(0.7, 1.3);
    for (let i = rng.int(3, 5); i > 0; i -= 1) {
        const az = rng.range(0, Math.PI * 2);
        const len = rng.range(0.45, 0.95) * s;
        const dx = Math.cos(az), dz = Math.sin(az);
        pen.polyline([
            [x, 0.02, z],
            [x + dx * len * 0.45, len * 0.5, z + dz * len * 0.45],
            [x + dx * len, len * 0.18, z + dz * len],
        ], 0.3);
        const pairs = rng.int(2, 3);
        for (let k = 1; k <= pairs; k += 1) {
            const f = k / (pairs + 1);
            const bx = x + dx * len * f, bz = z + dz * len * f;
            const by = Math.max(0.04, len * 0.5 * (1 - Math.abs(f - 0.45) * 1.6));
            const ll = len * 0.16;
            pen.seg(bx, by, bz, bx - dz * ll, by + ll * 0.4, bz + dx * ll);
            pen.seg(bx, by, bz, bx + dz * ll, by + ll * 0.4, bz - dx * ll);
        }
    }
}

function addBush(pen, rng, x, z) {
    const r = rng.range(0.35, 0.8);
    for (let i = rng.int(2, 3); i > 0; i -= 1) {
        const az = rng.range(0, Math.PI);
        const dx = Math.cos(az), dz = Math.sin(az);
        const w = r * rng.range(0.8, 1.15);
        const hgt = r * rng.range(0.7, 1.0);
        const points = [];
        for (let k = 0; k <= 6; k += 1) {
            const a = (k / 6) * Math.PI;
            const wobble = rng.range(0.85, 1.15);
            points.push([
                x - dx * w * Math.cos(a) * wobble,
                Math.sin(a) * hgt * wobble,
                z - dz * w * Math.cos(a) * wobble,
            ]);
        }
        pen.polyline(points, 0.5);
    }
}

function addGrass(pen, rng, x, z) {
    for (let i = rng.int(3, 6); i > 0; i -= 1) {
        const bx = x + rng.range(-0.18, 0.18), bz = z + rng.range(-0.18, 0.18);
        const hgt = rng.range(0.18, 0.5);
        const bend = rng.range(0.08, 0.28) * rng.sign();
        const bend2 = rng.range(-0.1, 0.1);
        pen.polyline([
            [bx, 0, bz],
            [bx + bend * 0.3, hgt * 0.65, bz + bend2 * 0.3],
            [bx + bend, hgt, bz + bend2],
        ], 0.4);
    }
}

function addMushroom(pen, rng, x, z) {
    for (let i = rng.int(1, 3); i > 0; i -= 1) {
        const mx = x + rng.range(-0.15, 0.15), mz = z + rng.range(-0.15, 0.15);
        const sh = rng.range(0.1, 0.26);
        const cr = rng.range(0.07, 0.16);
        const az = rng.range(0, Math.PI);
        const dx = Math.cos(az), dz = Math.sin(az);
        pen.seg(mx - dx * cr * 0.3, 0, mz - dz * cr * 0.3, mx - dx * cr * 0.18, sh, mz - dz * cr * 0.18);
        pen.seg(mx + dx * cr * 0.3, 0, mz + dz * cr * 0.3, mx + dx * cr * 0.18, sh, mz + dz * cr * 0.18);
        const points = [];
        for (let k = 0; k <= 5; k += 1) {
            const a = (k / 5) * Math.PI;
            points.push([mx - dx * cr * Math.cos(a), sh + Math.sin(a) * cr * 0.75, mz - dz * cr * Math.cos(a)]);
        }
        pen.polyline(points, 0.3);
        pen.seg(mx - dx * cr, sh, mz - dz * cr, mx + dx * cr, sh, mz + dz * cr);
    }
}

function addStone(pen, rng, x, z, r) {
    const n = rng.int(5, 7);
    const points = [];
    for (let k = 0; k < n; k += 1) {
        const a = (k / n) * Math.PI * 2;
        const rr = r * rng.range(0.7, 1.25);
        points.push([x + Math.cos(a) * rr, 0.02 + r * 0.12, z + Math.sin(a) * rr]);
    }
    pen.loop(points, 0.4);
    const az = rng.range(0, Math.PI);
    const dx = Math.cos(az), dz = Math.sin(az);
    pen.polyline([
        [x - dx * r, 0.03, z - dz * r],
        [x - dx * r * 0.3, r * rng.range(0.5, 0.85), z - dz * r * 0.3],
        [x + dx * r * 0.35, r * rng.range(0.5, 0.85), z + dz * r * 0.35],
        [x + dx * r, 0.03, z + dz * r],
    ], 0.4);
}

function addRoot(pen, rng, frame, t) {
    const f = frame.at(t);
    const tanx = f.rz, tanz = -f.rx;
    const skew = rng.range(-0.5, 0.5);
    let dx = f.rx + tanx * skew, dz = f.rz + tanz * skew;
    const m = Math.hypot(dx, dz);
    dx /= m; dz /= m;
    const span = rng.range(1.6, 2.6);
    const points = [];
    const wobF = rng.range(1, 2), wobP = rng.range(0, 6);
    const lift = rng.range(0.05, 0.12);
    for (let k = 0; k <= 6; k += 1) {
        const u = (k / 6) * 2 - 1;
        const wig = Math.sin(u * Math.PI * wobF + wobP) * 0.14;
        points.push([
            f.x + dx * u * span - dz * wig,
            0.02 + Math.sin((u * 0.5 + 0.5) * Math.PI) * lift,
            f.z + dz * u * span + dx * wig,
        ]);
    }
    pen.polyline(points, 0.45);
    if (rng.chance(0.6)) {
        const off = rng.range(0.08, 0.16);
        pen.polyline(points.map((p) => [p[0] - dz * off, Math.max(0.02, p[1] - 0.03), p[2] + dx * off]), 0.45);
    }
}

// ---- the path itself ------------------------------------------------------
// two wavy edge lines with occasional gaps; the wave is windowed to zero at
// both ends of the piece so edges stay continuous across chunk joints

function addPathEdges(pen, rng, frame, taper = 0) {
    const len = frame.len;
    const n = Math.max(2, Math.round(len));
    for (const side of [-1, 1]) {
        const f1 = rng.range(0.5, 1.1), p1 = rng.range(0, 6.3);
        const f2 = rng.range(1.4, 2.3), p2 = rng.range(0, 6.3);
        let run = [];
        for (let i = 0; i <= n; i += 1) {
            const t = (i / n) * len;
            const win = Math.max(0, Math.min(1, t / 1.4, (len - t) / 1.4));
            const wave = (Math.sin(t * f1 + p1) * 0.1 + Math.sin(t * f2 + p2) * 0.055) * win;
            const width = PATH_HALF * (1 - taper * (t / len));
            const f = frame.at(t);
            const off = side * (width + wave);
            run.push([f.x + f.rx * off, 0.015, f.z + f.rz * off]);
            if (run.length > 2 && i < n - 1 && rng.chance(0.07)) {
                pen.polyline(run, 0.6);
                run = [];
            }
        }
        if (run.length > 1) pen.polyline(run, 0.6);
    }
}

// ---- chunk assembly -------------------------------------------------------
// one chunk per path piece: the path drawable first, then trees (each its
// own drawable so it can be sketched in independently), then flora batches

export function makeChunk(frame, rng, { s0, branchDir = 0, density = 1 }) {
    const group = new THREE.Group();
    const drawables = [];
    let segments = 0;

    function commit(pen, sTrigger, dur) {
        if (pen.count() === 0) return null;
        const geo = pen.build();
        const line = new THREE.LineSegments(geo, inkMat);
        line.visible = false;
        group.add(line);
        segments += pen.count();
        drawables.push({
            line,
            verts: geo.attributes.position.count,
            sTrigger,
            dur,
            delay: rng.range(0, 0.35),
            t0: 0,
        });
        return line;
    }

    function placeTree(x, z, sTrigger) {
        const pen = makePen();
        pickTreeMaker(rng)(pen, rng);
        const line = commit(pen, sTrigger, rng.range(0.5, 1.5));
        line.position.set(x, 0, z);
        line.rotation.y = rng.range(0, Math.PI * 2);
        line.scale.setScalar(rng.range(0.85, 1.2));
    }

    // the path: edges, then whatever crosses it
    const pathPen = makePen();
    addPathEdges(pathPen, rng, frame);
    if (rng.chance(0.55)) addRoot(pathPen, rng, frame, rng.range(1.5, Math.max(2, frame.len - 1.5)));
    if (rng.chance(0.6)) {
        for (let i = rng.int(1, 2); i > 0; i -= 1) {
            const f = frame.at(rng.range(1, Math.max(2, frame.len - 1)));
            const lat = rng.range(-0.95, 0.95);
            addStone(pathPen, rng, f.x + f.rx * lat, f.z + f.rz * lat, rng.range(0.12, 0.3));
        }
    }
    commit(pathPen, s0, 1.3);

    // the branch not taken: visible for a short way, then swallowed by brush
    if (branchDir !== 0) {
        const stub = makeStubFrame(branchDir, rng.range(7, 10));
        const stubPen = makePen();
        addPathEdges(stubPen, rng, stub, 0.55);
        const end = stub.at(stub.len);
        addBush(stubPen, rng, end.x, end.z);
        addBush(stubPen, rng, end.x + rng.range(-0.8, 0.8), end.z + rng.range(-0.8, 0.8));
        addGrass(stubPen, rng, end.x + rng.range(-1, 1), end.z + rng.range(-1, 1));
        commit(stubPen, s0, 1.4);
        for (const [tt, lat] of [
            [stub.len * 0.45, rng.range(2.2, 3.6)],
            [stub.len * 0.8, -rng.range(2.2, 3.4)],
        ]) {
            const f = stub.at(tt);
            placeTree(f.x + f.rx * lat, f.z + f.rz * lat, s0);
        }
        // one tree in the wedge between the two forks
        placeTree(-branchDir * rng.range(1.0, 1.6), -rng.range(5, 6.5), s0);
    }

    // trees flanking the corridor, near band and far silhouettes
    for (const side of [-1, 1]) {
        let t = rng.range(0.3, 1.6);
        while (t < frame.len) {
            const f = frame.at(t);
            const lat = side * (rng.chance(0.6) ? rng.range(2.7, 4.8) : rng.range(4.8, 8.5));
            placeTree(f.x + f.rx * lat, f.z + f.rz * lat, s0 + t);
            if (rng.chance(0.3)) {
                const lat2 = side * rng.range(8.5, 13);
                placeTree(f.x + f.rx * lat2, f.z + f.rz * lat2, s0 + t);
            }
            t += rng.range(1.5, 2.9) / density;
        }
    }

    // undergrowth in two half-chunk batches so reveal timing tracks the walk
    const halves = [[0, frame.len / 2], [frame.len / 2, frame.len]];
    for (const [w0, w1] of halves) {
        const pen = makePen();
        let t = w0 + rng.range(0.2, 0.7);
        while (t < w1) {
            const f = frame.at(t);
            const lat = rng.sign() * rng.range(1.45, 6);
            const x = f.x + f.rx * lat, z = f.z + f.rz * lat;
            const roll = rng.next();
            if (roll < 0.3) addGrass(pen, rng, x, z);
            else if (roll < 0.55) addFern(pen, rng, x, z);
            else if (roll < 0.78) addBush(pen, rng, x, z);
            else if (roll < 0.9) addMushroom(pen, rng, x, z);
            else addStone(pen, rng, x, z, rng.range(0.15, 0.45));
            t += rng.range(0.55, 1.1) / density;
        }
        if (rng.chance(0.3)) {
            const f = frame.at(Math.min(w1 - 0.3, w0 + rng.range(0.5, w1 - w0)));
            addGrass(pen, rng, f.x + f.rx * rng.range(-0.8, 0.8), f.z + f.rz * rng.range(-0.8, 0.8));
        }
        commit(pen, s0 + w0, rng.range(0.9, 1.5));
    }

    return { group, drawables, segments };
}
