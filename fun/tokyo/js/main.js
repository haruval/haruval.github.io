import * as THREE from '/portfolio/vendor/three/three.module.js';
import { IS_MOBILE, FOG_COLOR, rand, pick, skyTex, glowTex, applyAnisotropy, updateAnimBoards } from './textures.js';
import {
    BLOCK_LEN, INTER_HALF, ROAD_HALF,
    boxGeo, sphereGeo, darkMat,
    flickerables, pulsers, beacons, steams,
    makeGlow, makeStreetChunk, makeInterChunk,
} from './builders.js';

const SPEED = 11;
const AHEAD = IS_MOBILE ? 250 : 330;
const BEHIND = 60;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('scene'),
        antialias: true,
        powerPreference: 'high-performance',
    });
} catch (error) {
    document.getElementById('fallback').style.display = 'flex';
    throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.25 : 1.5));
applyAnisotropy(renderer);

const scene = new THREE.Scene();
scene.background = skyTex;
scene.fog = new THREE.FogExp2(FOG_COLOR, IS_MOBILE ? 0.011 : 0.0082);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshBasicMaterial({ color: 0x060409 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- path: a random walk over a city grid ------------------------------
// pieces are straight runs (blocks and straight-through intersections) or
// quarter-circle arcs (turns); everything samples the same path by distance s

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const pieces = [];
const streetPool = [];
const interPool = [];
const gen = { x: 0, z: 50, dirIdx: 0, s: -50, lastTurn: 0, turnCooldown: 2 };
let camS = 0;
let fillersDirty = true;
const _cullV = new THREE.Vector3();

function acquire(pool, maker) {
    let chunk = pool.find((c) => !c.inUse);
    if (!chunk) {
        chunk = maker();
        pool.push(chunk);
        scene.add(chunk.group);
    }
    chunk.inUse = true;
    chunk.group.visible = true;
    return chunk;
}

function addBlock() {
    const [dx, dz] = DIRS[gen.dirIdx];
    const chunk = acquire(streetPool, makeStreetChunk);
    chunk.group.position.set(gen.x, 0, gen.z);
    chunk.group.rotation.y = -gen.dirIdx * Math.PI / 2;
    pieces.push({ type: 's', s0: gen.s, len: BLOCK_LEN, ax: gen.x, az: gen.z, dx, dz, chunk });
    gen.x += dx * BLOCK_LEN;
    gen.z += dz * BLOCK_LEN;
    gen.s += BLOCK_LEN;
    fillersDirty = true;
}

function addIntersection() {
    const [dx, dz] = DIRS[gen.dirIdx];
    let turn = 0;
    if (gen.turnCooldown <= 0 && Math.random() < 0.5) {
        turn = Math.random() < 0.5 ? -1 : 1;
        if (turn === gen.lastTurn) turn = -turn; // never the same direction twice running
        gen.lastTurn = turn;
        gen.turnCooldown = 1;
    } else {
        gen.turnCooldown -= 1;
    }

    const chunk = acquire(interPool, makeInterChunk);
    chunk.group.position.set(gen.x, 0, gen.z);
    chunk.group.rotation.y = -gen.dirIdx * Math.PI / 2;
    chunk.setArms(turn);
    fillersDirty = true;

    if (turn === 0) {
        pieces.push({ type: 's', s0: gen.s, len: INTER_HALF * 2, ax: gen.x, az: gen.z, dx, dz, chunk });
        gen.x += dx * INTER_HALF * 2;
        gen.z += dz * INTER_HALF * 2;
        gen.s += INTER_HALF * 2;
    } else {
        const px = turn === 1 ? -dz : dz;
        const pz = turn === 1 ? dx : -dx;
        const cx = gen.x + px * INTER_HALF;
        const cz = gen.z + pz * INTER_HALF;
        const a0 = Math.atan2(gen.z - cz, gen.x - cx);
        const len = Math.PI / 2 * INTER_HALF;
        pieces.push({ type: 'a', s0: gen.s, len, cx, cz, r: INTER_HALF, a0, dir: turn, chunk });
        const a1 = a0 + turn * Math.PI / 2;
        gen.x = cx + Math.cos(a1) * INTER_HALF;
        gen.z = cz + Math.sin(a1) * INTER_HALF;
        gen.s += len;
        gen.dirIdx = (gen.dirIdx + (turn === 1 ? 1 : 3)) % 4;
    }
}

let nextIsBlock;
addBlock();
addBlock();
nextIsBlock = false;

function extendPath() {
    while (gen.s < camS + AHEAD) {
        if (nextIsBlock) addBlock(); else addIntersection();
        nextIsBlock = !nextIsBlock;
    }
}

function retirePath() {
    while (pieces.length > 2 && pieces[0].s0 + pieces[0].len < camS - BEHIND) {
        const p = pieces.shift();
        p.chunk.inUse = false;
        p.chunk.group.visible = false;
        fillersDirty = true;
    }
}

function rectXZ(mesh) {
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (const x of [bb.min.x, bb.max.x]) {
        for (const z of [bb.min.z, bb.max.z]) {
            _cullV.set(x, 0, z).applyMatrix4(mesh.matrixWorld);
            if (_cullV.x < minx) minx = _cullV.x;
            if (_cullV.x > maxx) maxx = _cullV.x;
            if (_cullV.z < minz) minz = _cullV.z;
            if (_cullV.z > maxz) maxz = _cullV.z;
        }
    }
    return { minx, maxx, minz, maxz };
}

function hasHiddenAncestor(o) {
    for (let n = o; n && n !== scene; n = n.parent) {
        if (!n.visible) return true;
    }
    return false;
}

function overlaps(a, b, margin) {
    return a.maxx > b.minx + margin
        && a.minx < b.maxx - margin
        && a.maxz > b.minz + margin
        && a.minz < b.maxz - margin;
}

// Fake branch scenery is intentionally generous. If the random walk later folds
// near it, hide filler buildings whose footprint crosses real roads, fake road
// surfaces, intersections, or protected shop masses.
function cullFillers() {
    scene.updateMatrixWorld(true);
    const protectedRects = [];
    for (const p of pieces) {
        p.chunk.group.traverse((o) => {
            if (!o.isMesh || hasHiddenAncestor(o)) return;
            const roadWidth = o.geometry.type === 'PlaneGeometry' && o.geometry.parameters && o.geometry.parameters.width;
            if (roadWidth === ROAD_HALF * 2 || roadWidth === INTER_HALF * 2 || o.userData.protectFiller) {
                protectedRects.push(rectXZ(o));
            }
        });
    }

    const M = 0.5;
    for (const p of pieces) {
        p.chunk.group.traverse((o) => {
            if (!o.userData.filler) return;
            const b = rectXZ(o);
            o.visible = !protectedRects.some((r) => overlaps(b, r, M));
        });
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
    if (Math.abs(camPos.x) < 900 && Math.abs(camPos.z) < 900) return;
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

// ---- cars: path followers in both directions (left-hand traffic) -------

const BODY_COLORS = [0x16161d, 0x1a1022, 0x0e1a22, 0x1d1416];
const cars = [];

function makeCar(oncoming) {
    const group = new THREE.Group();
    const glows = [];
    const body = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: pick(BODY_COLORS) }));
    body.scale.set(1.7, 0.85, 3.6);
    body.position.y = 0.25;
    group.add(body);
    const cabin = new THREE.Mesh(boxGeo, darkMat);
    cabin.scale.set(1.45, 0.55, 1.9);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);

    const addLamp = (lx, lz, color, scale, gw, gh, gop) => {
        const lamp = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color }));
        lamp.scale.setScalar(scale);
        lamp.position.set(lx, 0.72, lz);
        group.add(lamp);
        const glow = makeGlow(color, gw, gh, gop);
        glow.position.copy(lamp.position);
        group.add(glow);
        glows.push({ mat: glow.material, base: gop });
    };
    for (const lx of [-0.62, 0.62]) {
        addLamp(lx, 1.82, 0xfff4d6, 0.12, 1.5, 1.2, 0.85);  // headlights, +z front
        addLamp(lx, -1.82, 0xff3b30, 0.1, 1.0, 0.8, 0.6);   // taillights
    }
    const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 3.2),
        new THREE.MeshBasicMaterial({
            map: glowTex, color: 0xfff4d6, transparent: true, opacity: 0.13,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.03, 2.6);
    pool.renderOrder = 2;
    group.add(pool);
    glows.push({ mat: pool.material, base: 0.13 });

    scene.add(group);
    const car = { group, glows, oncoming, lane: oncoming ? 2.8 : -2.8, s: camS + rand(30, AHEAD - 40), v: 0 };
    car.v = oncoming ? rand(8, 14) : rand(3, 6.5);
    cars.push(car);
}

const carCounts = IS_MOBILE ? [4, 3] : [6, 4];
for (let i = 0; i < carCounts[0]; i += 1) makeCar(true);
for (let i = 0; i < carCounts[1]; i += 1) makeCar(false);

const carPos = new THREE.Vector3();
const carTan = new THREE.Vector3();
const carPerp = new THREE.Vector3();

function updateCar(car, dt) {
    car.s += (car.oncoming ? -car.v : car.v) * dt;
    const rel = car.s - camS;
    if (rel < -16 || rel > AHEAD + 40) {
        car.s = camS + rand(150, AHEAD - 30);
        car.v = car.oncoming ? rand(8, 14) : rand(3, 6.5);
    }
    samplePath(car.s, carPos, carTan);
    carPerp.set(-carTan.z, 0, carTan.x);
    car.group.position.copy(carPos).addScaledVector(carPerp, car.lane);
    const f = car.oncoming ? -1 : 1;
    car.group.rotation.y = Math.atan2(carTan.x * f, carTan.z * f);
    // light glows bloom over the body when seen from beside; fade them near us
    const fade = THREE.MathUtils.clamp((Math.abs(rel) - 4) / 9, 0, 1);
    for (const g of car.glows) g.mat.opacity = g.base * fade;
}

// ---- input / resize -----------------------------------------------------

const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();

window.addEventListener('pointermove', (event) => {
    targetMouse.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2,
    );
}, { passive: true });

function onResize() {
    camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener('resize', onResize);
onResize();

// ---- animation -----------------------------------------------------------

const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 0, 0);
const camTan = new THREE.Vector3(0, 0, -1);
const camPerp = new THREE.Vector3();
const aheadPos = new THREE.Vector3();
const aheadTan = new THREE.Vector3();
let roll = 0;

let frames = 0;
let fpsT0 = 0;
let fps = 0;

function animate() {
    requestAnimationFrame(animate);
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
    if (fillersDirty) { cullFillers(); fillersDirty = false; }

    samplePath(camS, camPos, camTan);
    samplePath(camS + 13, aheadPos, aheadTan);
    camPerp.set(-camTan.z, 0, camTan.x);

    camera.position.copy(camPos).addScaledVector(camPerp, mouse.x * 1.0);
    camera.position.y = 3.45 - mouse.y * 0.55 + Math.sin(t * 0.85) * 0.07;
    aheadPos.y = 2.9 - mouse.y * 1.4;
    aheadPos.addScaledVector(camPerp, mouse.x * 3);
    camera.lookAt(aheadPos);
    // bank gently into turns
    const cross = camTan.z * aheadTan.x - camTan.x * aheadTan.z;
    roll += (THREE.MathUtils.clamp(cross * 0.5, -0.07, 0.07) - roll) * 0.05;
    camera.rotation.z += roll;

    ground.position.set(camPos.x, -0.05, camPos.z);

    mouse.lerp(targetMouse, 0.04);

    for (const car of cars) updateCar(car, dt);

    for (const beacon of beacons) {
        const pulse = Math.max(0, Math.sin(t * 2.2 + beacon.phase));
        beacon.dotMat.opacity = 0.2 + pulse * 0.8;
        beacon.glowMat.opacity = pulse * 0.45;
    }
    for (const steam of steams) {
        const cycle = (t * steam.speed + steam.phase) % 1;
        steam.sprite.position.y = steam.baseY + cycle * 1.7;
        steam.sprite.material.opacity = 0.13 * (1 - cycle);
    }
    for (const p of pulsers) {
        p.mat.opacity = p.base * (0.72 + 0.28 * Math.sin(t * p.sp + p.ph));
    }
    for (const f of flickerables) {
        if (f.off > 0) {
            f.off -= dt;
            if (f.off <= 0) f.mats.forEach((m, i) => { m.opacity = f.bases[i]; });
        } else {
            f.next -= dt;
            if (f.next <= 0) {
                f.next = rand(0.8, 7);
                f.off = rand(0.04, 0.18);
                f.mats.forEach((m, i) => { m.opacity = f.bases[i] * 0.12; });
            }
        }
    }
    updateAnimBoards(t);

    renderer.render(scene, camera);
}

animate();

// debug hook for jumping ahead while testing
window.__tokyo = { skip: (ds) => { camS += ds; }, renderer, fps: () => fps };
