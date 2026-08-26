import * as THREE from '/portfolio/vendor/three/three.module.js';
import { IS_MOBILE, BG_COLOR, INK_COLOR, resolveSeed, makeRng, hashSeed } from './utils.js';
import { makeChunk, makeStraightFrame, makeArcFrame, inkMat } from './builders.js';

const SPEED = 1.4;                        // slow walking pace, units/sec
const EYE = 1.7;
const REVEAL_DIST = IS_MOBILE ? 30 : 38;  // geometry sketches in as it crosses this range
const GEN_AHEAD = REVEAL_DIST + 10;
const BEHIND = 12;
const MAX_SEGMENTS = IS_MOBILE ? 14000 : 26000;

const DEFAULT_OPTIONS = {
    canvas: null,
    fallback: null,
    className: 'forest-scene-canvas',
    zIndex: 1,
    maxPixelRatio: undefined,
    seed: undefined,
    // dual-tone mode: a transparent canvas whose line color flips inside a
    // tracked DOM element — the page's own colors become the scene's palette
    transparent: false,
    inkColor: undefined,
    insetPass: null,  // { element | elements, inkColor }
};

export function mountForestScene(options = {}) {
const settings = { ...DEFAULT_OPTIONS, ...options };
const canvas = settings.canvas || document.createElement('canvas');
const ownsCanvas = !settings.canvas;
const fallback = settings.fallback || null;
const seed = settings.seed !== undefined ? settings.seed >>> 0 : resolveSeed();
let animationFrame = null;
let isDestroyed = false;

if (settings.className) {
    canvas.classList.add(settings.className);
}

if (ownsCanvas) {
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        display: 'block',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: String(settings.zIndex),
    });
    document.body.prepend(canvas);
}

let renderer;
try {
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: settings.transparent,
    });
} catch (error) {
    if (fallback) {
        fallback.style.display = 'flex';
    }
    throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio || (IS_MOBILE ? 1.5 : 2)));

const scene = new THREE.Scene();
if (!settings.transparent) {
    scene.background = new THREE.Color(BG_COLOR);
}

const baseInk = new THREE.Color(settings.inkColor !== undefined ? settings.inkColor : INK_COLOR);
const insetElements = settings.insetPass
    ? Array.from(settings.insetPass.elements || (settings.insetPass.element ? [settings.insetPass.element] : []))
    : [];
const insetInk = insetElements.length
    ? new THREE.Color(settings.insetPass.inkColor !== undefined ? settings.insetPass.inkColor : INK_COLOR)
    : null;
inkMat.color.copy(baseInk);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 150);

// ---- path: a meandering walk sampled by distance s -----------------------
// pieces are straight runs, gentle arcs, or 45-degree branches; every chunk
// derives its randomness from (seed, chunkIndex) so a seed reproduces the
// whole forest exactly

const pieces = [];
let chunkIndex = 0;
let liveSegments = 0;
const gen = { x: 0, z: 10, h: 0, s: -10, lastTurn: 0, branchCooldown: 3 };
let camS = 0;

const pending = [];  // drawables waiting to cross the reveal distance
const drawing = [];  // drawables currently being stroked in

function addPiece() {
    const rng = makeRng(hashSeed(seed, chunkIndex));
    chunkIndex += 1;

    let kind = 'straight';
    if (chunkIndex > 2) {
        if (gen.branchCooldown <= 0 && rng.chance(0.16)) kind = 'branch';
        else if (rng.chance(0.5)) kind = 'arc';
    }
    gen.branchCooldown -= 1;

    const density = liveSegments > MAX_SEGMENTS ? 0.55 : (IS_MOBILE ? 0.7 : 1);
    const dirx = Math.sin(gen.h), dirz = -Math.cos(gen.h);
    const rightx = -dirz, rightz = dirx;
    let piece, frame, branchDir = 0;

    if (kind === 'straight') {
        const len = rng.range(9, 15);
        frame = makeStraightFrame(len);
        piece = { type: 's', s0: gen.s, len, ax: gen.x, az: gen.z, dx: dirx, dz: dirz };
    } else {
        let d = rng.sign();
        if (d === gen.lastTurn) d = -d; // meander; never the same turn twice running
        gen.lastTurn = d;
        const angle = kind === 'branch' ? Math.PI / 4 : rng.range(0.45, 0.95);
        const r = kind === 'branch' ? rng.range(7, 10) : rng.range(9, 16);
        if (kind === 'branch') {
            branchDir = d;
            gen.branchCooldown = 3;
        }
        frame = makeArcFrame(r, d, angle);
        const cx = gen.x + rightx * d * r;
        const cz = gen.z + rightz * d * r;
        const a0 = Math.atan2(gen.z - cz, gen.x - cx);
        piece = { type: 'a', s0: gen.s, len: frame.len, cx, cz, r, a0, dir: d };
    }

    const chunk = makeChunk(frame, rng, { s0: gen.s, branchDir, density });
    chunk.group.position.set(gen.x, 0, gen.z);
    chunk.group.rotation.y = -gen.h;
    scene.add(chunk.group);
    piece.chunk = chunk;
    pieces.push(piece);
    liveSegments += chunk.segments;
    for (const d of chunk.drawables) pending.push(d);

    if (piece.type === 's') {
        gen.x += dirx * piece.len;
        gen.z += dirz * piece.len;
    } else {
        const a1 = piece.a0 + piece.dir * (piece.len / piece.r);
        gen.x = piece.cx + Math.cos(a1) * piece.r;
        gen.z = piece.cz + Math.sin(a1) * piece.r;
        gen.h += piece.dir * (piece.len / piece.r);
    }
    gen.s += piece.len;
}

function extendPath() {
    while (gen.s < camS + GEN_AHEAD) addPiece();
}

function retirePath() {
    while (pieces.length > 2 && pieces[0].s0 + pieces[0].len < camS - BEHIND) {
        const p = pieces.shift();
        scene.remove(p.chunk.group);
        for (const d of p.chunk.drawables) {
            d.dead = true;
            d.line.geometry.dispose();
        }
        liveSegments -= p.chunk.segments;
    }
}

function samplePath(s, pos, tan) {
    let p = pieces[pieces.length - 1];
    for (let i = 0; i < pieces.length; i += 1) {
        if (s < pieces[i].s0 + pieces[i].len) { p = pieces[i]; break; }
    }
    const ds = THREE.MathUtils.clamp(s - p.s0, 0, p.len);
    if (p.type === 's') {
        pos.set(p.ax + p.dx * ds, 0, p.az + p.dz * ds);
        if (tan) tan.set(p.dx, 0, p.dz);
    } else {
        const a = p.a0 + p.dir * (ds / p.r);
        pos.set(p.cx + Math.cos(a) * p.r, 0, p.cz + Math.sin(a) * p.r);
        if (tan) tan.set(-Math.sin(a) * p.dir, 0, Math.cos(a) * p.dir);
    }
}

// keep world coordinates near the origin so float precision never wobbles
function maybeRebase() {
    if (Math.abs(camPos.x) < 600 && Math.abs(camPos.z) < 600) return;
    const ox = camPos.x;
    const oz = camPos.z;
    for (const p of pieces) {
        if (p.type === 's') { p.ax -= ox; p.az -= oz; } else { p.cx -= ox; p.cz -= oz; }
        p.chunk.group.position.x -= ox;
        p.chunk.group.position.z -= oz;
    }
    gen.x -= ox;
    gen.z -= oz;
}

// ---- draw-in: stroke each drawable front-to-back with drawRange -----------

function updateReveals(now) {
    for (let i = pending.length - 1; i >= 0; i -= 1) {
        const d = pending[i];
        if (d.dead) {
            pending.splice(i, 1);
        } else if (d.sTrigger < camS + REVEAL_DIST) {
            d.t0 = now + d.delay;
            d.line.visible = true;
            drawing.push(d);
            pending.splice(i, 1);
        }
    }
    for (let i = drawing.length - 1; i >= 0; i -= 1) {
        const d = drawing[i];
        if (d.dead) {
            drawing.splice(i, 1);
            continue;
        }
        const k = (now - d.t0) / d.dur;
        if (k >= 1) {
            d.line.geometry.setDrawRange(0, d.verts);
            drawing.splice(i, 1);
        } else if (k > 0) {
            d.line.geometry.setDrawRange(0, Math.floor((k * d.verts) / 2) * 2);
        }
    }
}

extendPath();

// ---- input / resize -------------------------------------------------------

function onResize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width), 1);
    const height = Math.max(Math.round(bounds.height), 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}
window.addEventListener('resize', onResize);
const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(onResize);
if (resizeObserver) resizeObserver.observe(canvas);
onResize();

// ---- animation --------------------------------------------------------------

const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 0, 0);
const camTan = new THREE.Vector3(0, 0, -1);
const camPerp = new THREE.Vector3();
const aheadPos = new THREE.Vector3();
const aheadTan = new THREE.Vector3();
let bobPhase = 0;
let roll = 0;

let frames = 0;
let fpsT0 = 0;
let fps = 0;

function animate() {
    if (isDestroyed) return;
    animationFrame = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    frames += 1;
    if (t - fpsT0 >= 1) {
        fps = frames / (t - fpsT0);
        frames = 0;
        fpsT0 = t;
    }

    camS += SPEED * dt;
    extendPath();
    retirePath();
    maybeRebase();
    updateReveals(t);

    samplePath(camS, camPos, camTan);
    samplePath(camS + 5.5, aheadPos, aheadTan);
    camPerp.set(-camTan.z, 0, camTan.x);

    // footstep bob and a slow lateral sway
    bobPhase += dt * 10.7;
    const sway = Math.sin(bobPhase * 0.5) * 0.06;
    camera.position.copy(camPos).addScaledVector(camPerp, sway);
    camera.position.y = EYE + Math.sin(bobPhase) * 0.035;
    aheadPos.y = EYE - 0.12;
    camera.lookAt(aheadPos);
    // lean gently into turns
    const cross = camTan.z * aheadTan.x - camTan.x * aheadTan.z;
    roll += (THREE.MathUtils.clamp(cross * 0.35, -0.035, 0.035) - roll) * 0.05;
    camera.rotation.z += roll;

    if (!insetElements.length) {
        renderer.render(scene, camera);
    } else {
        // pass one: the whole viewport in the base ink
        inkMat.color.copy(baseInk);
        renderer.setScissorTest(false);
        renderer.render(scene, camera);

        // pass two: re-render inside each tracked element in the inset ink;
        // autoclear wipes each scissored region back to transparent first, so
        // whatever the page paints behind it becomes the ground color
        const view = canvas.getBoundingClientRect();
        for (const element of insetElements) {
            if (!element.isConnected) continue;

            const win = element.getBoundingClientRect();
            const left = Math.max(win.left, view.left);
            const right = Math.min(win.right, view.right);
            const top = Math.max(win.top, view.top);
            const bottom = Math.min(win.bottom, view.bottom);
            const w = Math.max(0, right - left);
            const h = Math.max(0, bottom - top);
            if (w <= 0 || h <= 0) continue;

            renderer.setScissorTest(true);
            renderer.setScissor(left - view.left, view.bottom - bottom, w, h);
            inkMat.color.copy(insetInk);
            renderer.render(scene, camera);
        }
        renderer.setScissorTest(false);
    }
}

animate();

function destroy() {
    if (isDestroyed) return;
    isDestroyed = true;

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', destroy);
    if (resizeObserver) resizeObserver.disconnect();

    for (const p of pieces) {
        scene.remove(p.chunk.group);
        for (const d of p.chunk.drawables) d.line.geometry.dispose();
    }
    pieces.length = 0;
    renderer.dispose();

    if (ownsCanvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
    }

    if (window.__forest === api) {
        delete window.__forest;
    }
}

const api = {
    scene,
    camera,
    renderer,
    destroy,
    seed,
    fps: () => fps,
    skip: (ds) => { camS += ds; },
    distance: () => camS,
    stats: () => ({ segments: liveSegments, pieces: pieces.length, pending: pending.length, drawing: drawing.length }),
};

window.addEventListener('pagehide', destroy, { once: true });

// debug hook for jumping ahead while testing
window.__forest = api;

return api;
}
