import * as THREE from '/portfolio/vendor/three/three.module.js';
import {
    IS_MOBILE, rand, pick,
    NEON, SIGN_TEXTS, BILLBOARD_TEXTS, RAMEN_NAMES, SHOP_NAMES, RAMEN_BANDS, SHOP_BANDS, CJK_FONT,
    BANNER_TEXTS, HBANNER_TEXTS, CIRCLE_CHARS, PILL_TEXTS,
    canvasTexture, glowTex, windowTextures, darkWindowTex,
    vsignTexture, billboardTexture, bandTexture, interiorTexture, chefTex, norenTex, flatShopTexture,
    bannerTexture, hbannerTexture, circleSignTexture, pillSignTexture,
    roadTex, stubRoadTex, walkTex, stubWalkTex, cornerWalkTex, interTex, crosswalkTex,
} from './textures.js';

// street layout (single chunk local frame: path enters at z=0 and runs to z=-BLOCK_LEN)
export const BLOCK_LEN = 36;
export const INTER_HALF = 10;   // intersections are 20x20 squares
export const ROAD_HALF = 6;
export const WALK_EDGE = 10;    // building faces sit at |x| = 10
export const STUB_LEN = 26;     // fake side-street depth at intersections
const DETAILED = !IS_MOBILE;
const FAKE_BRANCH_LEN = IS_MOBILE ? 28 : 38;

export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
boxGeo.translate(0, 0.5, 0);
export const sphereGeo = new THREE.SphereGeometry(1, 10, 8);

export const roofMat = new THREE.MeshBasicMaterial({ color: 0x05060b });
export const darkMat = new THREE.MeshBasicMaterial({ color: 0x0a0a12 });
const lanternMat = new THREE.MeshBasicMaterial({ color: 0xff6a52 });
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a8 });
const wireMat = new THREE.LineBasicMaterial({ color: 0x04040a });
const floorMat = new THREE.MeshBasicMaterial({ color: 0xa06a38 });
// skirts are the alcoves' hidden side closers, kept flat black; the exposed
// divider pillars between shops instead wear an all-unlit slice of the
// building facade so they read as slim building fronts, not voids
const skirtMat = new THREE.MeshBasicMaterial({ color: 0x0c0c14 });
darkWindowTex.wrapS = darkWindowTex.wrapT = THREE.RepeatWrapping;
// pane scale matches makeBuilding's ~(5u x 9u) tile on the 3.0 x 3.28 divider face
darkWindowTex.repeat.set(0.6, 0.36);
const dividerFaceMat = new THREE.MeshBasicMaterial({ map: darkWindowTex });
const dividerMats = [dividerFaceMat, dividerFaceMat, roofMat, roofMat, dividerFaceMat, dividerFaceMat];
const counterMat = new THREE.MeshBasicMaterial({ color: 0x4a2a18 });
const counterTopMat = new THREE.MeshBasicMaterial({ color: 0xe8b878 });
const stoolMat = new THREE.MeshBasicMaterial({ color: 0x2a2a36 });

// animation registries, ticked from main.js
export const flickerables = [];
export const pulsers = [];
export const beacons = [];
export const steams = [];

function registerFlicker(mats, chance = 0.22) {
    if (Math.random() > chance) return;
    flickerables.push({
        mats,
        bases: mats.map((m) => m.opacity),
        next: rand(1, 7),
        off: 0,
    });
}

function registerPulse(mat, chance = 0.5) {
    if (Math.random() > chance) return;
    pulsers.push({ mat, base: mat.opacity, sp: rand(1.2, 2.6), ph: rand(0, Math.PI * 2) });
}

export function makeGlow(color, sx, sy, opacity) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }));
    sprite.scale.set(sx, sy, 1);
    return sprite;
}

export function makeBuilding(w, h, d) {
    const tex = pick(windowTextures).clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round((w + d) / 10)), Math.max(1, Math.round(h / 9)));
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(boxGeo, [mat, mat, roofMat, roofMat, mat, mat]);
    mesh.scale.set(w, h, d);
    return mesh;
}

function makeFillerBuilding(w, h, d) {
    const building = makeBuilding(w, h, d);
    building.userData.filler = true;
    return building;
}

export function addVSign(g, x, yCenter, z, h, { pulse = false, color = pick(NEON) } = {}) {
    const mat = new THREE.MeshBasicMaterial({
        map: vsignTexture(pick(SIGN_TEXTS), color),
        side: THREE.DoubleSide,
        transparent: true,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(h / 4, h), mat);
    sign.position.set(x, yCenter, z);
    g.add(sign);
    const halo = makeGlow(color, h * 1.0, h * 1.4, h > 6 ? 0.45 : 0.3);
    halo.position.copy(sign.position);
    g.add(halo);
    registerFlicker([mat, halo.material]);
    if (pulse) registerPulse(halo.material);
    return color;
}

export function addBillboard(g, x, y, z, w, h, { rotY = 0 } = {}) {
    const color = pick(NEON);
    const mat = new THREE.MeshBasicMaterial({ map: billboardTexture(pick(BILLBOARD_TEXTS), color), transparent: true });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    board.position.set(x, y, z);
    board.rotation.y = rotY;
    g.add(board);
    const halo = makeGlow(color, w * 1.3, h * 1.9, 0.32);
    halo.position.copy(board.position);
    g.add(halo);
    registerFlicker([mat, halo.material], 0.25);
    registerPulse(halo.material, 0.4);
}

export function addBannerSign(g, x, yCenter, z, h, { rotY = 0, color = pick(NEON) } = {}) {
    const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(h / 4, h),
        new THREE.MeshBasicMaterial({ map: bannerTexture(pick(BANNER_TEXTS), color), side: THREE.DoubleSide }),
    );
    banner.position.set(x, yCenter, z);
    banner.rotation.y = rotY;
    g.add(banner);
    const halo = makeGlow(color, h * 0.6, h * 1.15, 0.16);
    halo.position.copy(banner.position);
    g.add(halo);
}

export function addHBanner(g, x, y, z, w, { rotY = 0, color = pick(NEON) } = {}) {
    const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w * 0.22),
        new THREE.MeshBasicMaterial({ map: hbannerTexture(pick(HBANNER_TEXTS), color), side: THREE.DoubleSide }),
    );
    banner.position.set(x, y, z);
    banner.rotation.y = rotY;
    g.add(banner);
    const halo = makeGlow(color, w * 1.2, w * 0.5, 0.18);
    halo.position.copy(banner.position);
    g.add(halo);
    registerPulse(halo.material, 0.35);
}

export function addCircleSign(g, x, y, z, r, { rotY = 0, color = pick(NEON) } = {}) {
    const mat = new THREE.MeshBasicMaterial({
        map: circleSignTexture(pick(CIRCLE_CHARS), color),
        transparent: true,
        side: THREE.DoubleSide,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mat);
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    g.add(sign);
    const halo = makeGlow(color, r * 3.4, r * 3.4, 0.4);
    halo.position.copy(sign.position);
    g.add(halo);
    registerFlicker([mat, halo.material]);
    registerPulse(halo.material, 0.35);
}

export function addPillSign(g, x, y, z, len, { vertical = true, rotY = 0, color = pick(NEON) } = {}) {
    const mat = new THREE.MeshBasicMaterial({
        map: pillSignTexture(pick(PILL_TEXTS), color, vertical),
        transparent: true,
        side: THREE.DoubleSide,
    });
    const w = vertical ? len * 0.32 : len;
    const h = vertical ? len : len * 0.32;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    g.add(sign);
    const halo = makeGlow(color, w * 2.2 + 0.6, h * 1.7, 0.3);
    halo.position.copy(sign.position);
    g.add(halo);
    registerPulse(halo.material, 0.6);
    registerFlicker([mat, halo.material], 0.12);
}

// every shop hangs one projecting sign over the sidewalk; the style varies:
// classic vertical blade, round disc, or a pill lantern (vertical/horizontal).
// Blade planes span x, so each style keeps its outer edge inside
// WALK_EDGE-0.14 (the facade-banner plane) — no sign can pierce another.
// The whole ground layer tops out at y=7.3, leaving a clear band for the
// second storey of signs above.
function addProjectingSign(g, side, zc, sw, color) {
    const z = zc + rand(-sw / 4, sw / 4);
    const roll = Math.random();
    if (roll < 0.4) {
        const h = rand(2.6, 4.2);
        addVSign(g, side * (WALK_EDGE - 0.7), rand(4.2, 7.3 - h / 2), z, h, { color });
    } else if (roll < 0.62) {
        const r = rand(0.75, 1.05);
        addCircleSign(g, side * (WALK_EDGE - 0.2 - r), rand(4.0, 5.8), z, r, { color });
    } else if (roll < 0.84) {
        // pill bottoms stay above the shop name band (top ~4.2) so the
        // lantern never hangs in front of it
        const len = rand(2.1, 2.9);
        addPillSign(g, side * (WALK_EDGE - 0.2 - len * 0.16), rand(4.35 + len / 2, 7.3 - len / 2), z, len, { color });
    } else {
        const len = rand(2.4, 3.4);
        const hh = len * 0.32;
        addPillSign(g, side * (WALK_EDGE - 0.2 - len / 2), rand(4.35 + hh / 2, 7.3 - hh / 2), z, len, { vertical: false, color });
    }
}

// second storey of neon: a clear band above the ground-floor signs (which
// top out at y=7.3), fitted to each facade so nothing crests the roof or
// dips into the layer below. Every element's whole extent stays inside
// [8.1, sh-0.3]; blade x-spans stay inside the banner planes, so no sign
// covers another.
function addUpperSigns(g, side, zc, sw, sh, rotY) {
    const room = sh - 8.1; // facade height available above the ground sign layer
    if (room < 1.4 || (IS_MOBILE && Math.random() < 0.4)) return;
    const fitY = (hh) => rand(8.1 + hh / 2, sh - 0.3 - hh / 2);
    if (Math.random() < 0.8) {
        const z = zc + rand(-sw / 3, sw / 3);
        const color = pick(NEON);
        // tight facades only fit the short horizontal formats
        const roll = room >= 2.6 ? Math.random() : rand(0.55, 1);
        if (roll < 0.35) {
            const h = Math.min(rand(2.4, 3.4), room - 0.4);
            addVSign(g, side * (WALK_EDGE - 0.65), fitY(h), z, h, { color });
        } else if (roll < 0.55) {
            const len = Math.min(rand(2.0, 3.0), room - 0.4);
            addPillSign(g, side * (WALK_EDGE - 0.2 - len * 0.16), fitY(len), z, len, { color });
        } else if (roll < 0.78) {
            const r = Math.min(rand(0.7, 1.0), (room - 0.35) / 2);
            addCircleSign(g, side * (WALK_EDGE - 0.2 - r), fitY(r * 2), z, r, { color });
        } else {
            const len = rand(2.2, 3.2);
            addPillSign(g, side * (WALK_EDGE - 0.2 - len / 2), fitY(len * 0.32), z, len, { vertical: false, color });
        }
    }
    if (Math.random() < 0.5) {
        // sits 0.04 nearer the street than the ground-floor banner so the two
        // can never be coplanar
        const bw = Math.min(sw - 3.0, rand(3.4, 5.8), (room - 0.35) / 0.22);
        addHBanner(g, side * (WALK_EDGE - 0.14), fitY(bw * 0.22), zc + rand(-0.8, 0.8), bw, { rotY, color: pick(NEON) });
    }
}

function addLanterns(g, side, z, width) {
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i += 1) {
        const lz = z + (i - (count - 1) / 2) * (width / count) * 0.6;
        const lantern = new THREE.Mesh(sphereGeo, lanternMat);
        lantern.scale.setScalar(0.14);
        lantern.position.set(side * (WALK_EDGE - 0.35), 2.45, lz);
        g.add(lantern);
        const glow = makeGlow('#ff5040', 0.75, 0.95, 0.7);
        glow.position.copy(lantern.position);
        g.add(glow);
    }
}

function addSteam(g, side, z) {
    const sprite = makeGlow('#e8ecff', 1.3, 1.6, 0.07);
    sprite.position.set(side * (WALK_EDGE - 0.9), 2.4, z);
    g.add(sprite);
    steams.push({ sprite, baseY: 2.4, speed: rand(0.18, 0.32), phase: Math.random() });
}

function addStreetLamp(g, side, z) {
    const pole = new THREE.Mesh(boxGeo, darkMat);
    pole.scale.set(0.14, 5.4, 0.14);
    pole.position.set(side * 6.6, 0, z);
    g.add(pole);
    const arm = new THREE.Mesh(boxGeo, darkMat);
    arm.scale.set(0.8, 0.07, 0.07);
    arm.position.set(side * 6.2, 5.32, z);
    g.add(arm);
    const bulb = new THREE.Mesh(sphereGeo, lampBulbMat);
    bulb.scale.setScalar(0.13);
    bulb.position.set(side * 5.85, 5.28, z);
    g.add(bulb);
    const glow = makeGlow('#ffc77d', 2.6, 1.7, 0.48);
    glow.position.copy(bulb.position);
    g.add(glow);
}

function addUtilityWires(g, z) {
    for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(boxGeo, darkMat);
        pole.scale.set(0.16, 7.6, 0.16);
        pole.position.set(side * 6.8, 0, z);
        g.add(pole);
        const crossarm = new THREE.Mesh(boxGeo, darkMat);
        crossarm.scale.set(1.4, 0.08, 0.08);
        crossarm.position.set(side * 6.8, 7.25, z);
        g.add(crossarm);
    }
    for (const wy of [7.35, 7.05]) {
        const pts = [];
        for (let i = 0; i <= 10; i += 1) {
            const x = -6.8 + 13.6 * (i / 10);
            pts.push(new THREE.Vector3(x, wy - Math.sin(Math.PI * i / 10) * 0.45, z));
        }
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
}

function addGantry(g, z) {
    for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(boxGeo, darkMat);
        pole.scale.set(0.22, 8.4, 0.22);
        pole.position.set(side * 6.5, 0, z);
        g.add(pole);
    }
    const beam = new THREE.Mesh(boxGeo, darkMat);
    beam.scale.set(13.4, 0.3, 0.25);
    beam.position.set(0, 8.2, z);
    g.add(beam);
    const tex = canvasTexture(256, 80, (ctx) => {
        ctx.fillStyle = '#0a3622';
        ctx.fillRect(0, 0, 256, 80);
        ctx.strokeStyle = 'rgba(240,255,245,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 248, 72);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 26px ${CJK_FONT}`;
        ctx.fillStyle = '#eafff2';
        ctx.shadowColor = '#7dffb8';
        ctx.shadowBlur = 8;
        ctx.fillText('新宿 2 ↑   渋谷 4 →', 128, 42);
        ctx.shadowBlur = 0;
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.45), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(rand(-2, 2), 7.3, z + 0.16);
    g.add(sign);
    const glow = makeGlow('#3dff9a', 5, 1.8, 0.1);
    glow.position.copy(sign.position);
    g.add(glow);
}

function addBeacon(g, x, y, z) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true });
    const dot = new THREE.Mesh(sphereGeo, mat);
    dot.scale.setScalar(0.18);
    dot.position.set(x, y, z);
    g.add(dot);
    const glow = makeGlow('#ff2e1e', 1.4, 1.4, 0.4);
    glow.position.copy(dot.position);
    g.add(glow);
    beacons.push({ dotMat: mat, glowMat: glow.material, phase: rand(0, Math.PI * 2) });
}

function addSignal(g, x, z, rotY, green) {
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(boxGeo, darkMat);
    pole.scale.set(0.13, 5.7, 0.13);
    grp.add(pole);
    const head = new THREE.Mesh(boxGeo, darkMat);
    head.scale.set(1.0, 0.34, 0.22);
    head.position.set(-0.62, 5.32, 0);
    grp.add(head);
    const lens = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: green ? 0x2dffa0 : 0xff3b30 }));
    lens.scale.setScalar(0.1);
    lens.position.set(-0.88, 5.49, 0.12);
    grp.add(lens);
    const glow = makeGlow(green ? '#2dffa0' : '#ff3b30', 0.95, 0.75, 0.6);
    glow.position.copy(lens.position);
    grp.add(glow);
    grp.position.set(x, 0, z);
    grp.rotation.y = rotY;
    g.add(grp);
}

function addAtmosphere(g, x, y, z) {
    const atmo = makeGlow(pick(NEON), rand(32, 56), rand(18, 30), rand(0.1, 0.17));
    atmo.position.set(x, y, z);
    g.add(atmo);
}

// A shop bleeding its own sign color into the surrounding haze: a broad soft
// wash over the whole storefront, a tighter brighter core at the sign band, and
// a colored pool of light on the wet sidewalk. All additive, so the neon glows
// through the purple fog and tints the dark facades and street around the shop.
function addNeonAmbience(g, side, zc, sw, color) {
    const wash = makeGlow(color, sw + 5, 8.5, 0.32);
    wash.position.set(side * (WALK_EDGE - 1.6), 3.9, zc);
    g.add(wash);
    registerPulse(wash.material, 0.4);

    const core = makeGlow(color, sw * 0.6 + 1.5, 3.4, 0.36);
    core.position.set(side * (WALK_EDGE - 0.5), 3.7, zc);
    g.add(core);
    registerFlicker([core.material], 0.18);

    const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, Math.min(sw + 2, 10)),
        new THREE.MeshBasicMaterial({
            map: glowTex, color, transparent: true, opacity: 0.2,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(side * (WALK_EDGE - 3.6), 0.04, zc);
    pool.renderOrder = 1;
    g.add(pool);
}

// one storefront cell: 75% are recessed shops (building mass above an open
// alcove with a lit interior), the rest are flat fronts with metal shutters
function buildShopUnit(g, side, zc, sw) {
    const sh = rand(7, 14);
    const sd = rand(6, 9);
    const isRamen = Math.random() < 0.45;
    const inX = (o) => side * (WALK_EDGE + o);
    const rotY = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const openW = sw - 1.1;
    // one neon accent per shop, shared by its vertical sign and the ambient
    // wash it throws onto the street, so each storefront reads as a single color
    const neon = pick(NEON);

    const addBand = (name, band) => {
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(sw - 0.5, 0.95),
            new THREE.MeshBasicMaterial({ map: bandTexture(name, band) }),
        );
        sign.position.set(inX(-0.04), 3.72, zc);
        sign.rotation.y = rotY;
        g.add(sign);
    };

    // shop masses are inset 0.08 from each slot boundary so adjacent
    // buildings never share a coplanar face (their window facades z-fight
    // through each other); the dividers hide the resulting slit
    if (Math.random() > 0.75) {
        const mass = makeBuilding(sd, sh, sw - 0.16);
        mass.userData.protectFiller = true;
        mass.position.set(inX(sd / 2), 0, zc);
        g.add(mass);
        const front = new THREE.Mesh(
            new THREE.PlaneGeometry(openW, 3.05),
            new THREE.MeshBasicMaterial({ map: flatShopTexture() }),
        );
        front.position.set(inX(-0.05), 1.55, zc);
        front.rotation.y = rotY;
        g.add(front);
        const flatSpill = makeGlow('#ffc46a', 3.8, 2.2, 0.16);
        flatSpill.position.set(inX(-1.1), 1.4, zc);
        g.add(flatSpill);
        addNeonAmbience(g, side, zc, sw, neon);
        addBand(pick(SHOP_NAMES), pick(SHOP_BANDS));
        addProjectingSign(g, side, zc, sw, neon);
        if (Math.random() < 0.45) {
            addHBanner(g, inX(-0.1), rand(4.9, 6.3), zc + rand(-0.8, 0.8), Math.min(sw - 3.0, rand(3.6, 6.0)), { rotY, color: pick(NEON) });
        }
        addUpperSigns(g, side, zc, sw, sh, rotY);
        return;
    }

    const mass = makeBuilding(sd, sh - 3.2, sw - 0.16);
    mass.userData.protectFiller = true;
    mass.position.set(inX(sd / 2), 3.2, zc);
    g.add(mass);

    // the mass floats above the alcove, leaving its side walls open below
    // y=3.2 behind the dividers; flush black skirts close them off, matching
    // the dark dividers/side walls rather than the building's window facade
    for (const e of [-1, 1]) {
        const skirt = new THREE.Mesh(new THREE.PlaneGeometry(sd, 3.2), skirtMat);
        skirt.position.set(inX(sd / 2), 1.6, zc + e * (sw / 2 - 0.08));
        skirt.rotation.y = e > 0 ? 0 : Math.PI;
        g.add(skirt);
    }

    const kind = isRamen ? 'ramen' : pick(['izakaya', 'konbini']);
    const cool = kind === 'konbini';

    const back = new THREE.Mesh(
        new THREE.PlaneGeometry(openW + 0.4, 3.05),
        new THREE.MeshBasicMaterial({ map: interiorTexture(kind), side: THREE.DoubleSide }),
    );
    back.position.set(inX(2.3), 1.55, zc);
    back.rotation.y = rotY;
    g.add(back);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.3, openW + 0.4), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(inX(1.15), 0.03, zc);
    g.add(floor);

    // counter bar, chef, and stools belong to eateries only — a konbini
    // shows just its painted interior through the opening
    if (DETAILED && kind !== 'konbini') {
        const counter = new THREE.Mesh(boxGeo, counterMat);
        counter.scale.set(0.6, 0.92, openW - 2.4);
        counter.position.set(inX(1.55), 0, zc);
        g.add(counter);
        const top = new THREE.Mesh(boxGeo, counterTopMat);
        top.scale.set(0.85, 0.08, openW - 2.2);
        top.position.set(inX(1.55), 0.92, zc);
        g.add(top);
        const chef = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.7),
            new THREE.MeshBasicMaterial({ map: chefTex, transparent: true }),
        );
        chef.position.set(inX(1.95), 0.88, zc + rand(-openW / 5, openW / 5));
        chef.rotation.y = rotY;
        g.add(chef);
        for (const e of [-1, 1]) {
            const stool = new THREE.Mesh(boxGeo, stoolMat);
            stool.scale.set(0.34, 0.5, 0.34);
            stool.position.set(inX(0.9), 0, zc + e * openW * 0.18);
            g.add(stool);
        }
    }

    const innerGlow = makeGlow(cool ? '#d8ecff' : isRamen ? '#ffb066' : '#ffd9a0', 3.4, 2.0, 0.42);
    innerGlow.position.set(inX(1.2), 2.3, zc);
    g.add(innerGlow);
    const spill = makeGlow(cool ? '#cfe4ff' : isRamen ? '#ff9a4d' : '#ffc46a', 5.6, 3.0, 0.26);
    spill.position.set(inX(-1.3), 1.4, zc);
    g.add(spill);
    // warm pool of light cast onto the sidewalk in front of the opening
    const poolLight = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, Math.min(openW + 1, 8)),
        new THREE.MeshBasicMaterial({
            map: glowTex,
            color: cool ? 0xbcd8f4 : 0xffae5e,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        }),
    );
    poolLight.rotation.x = -Math.PI / 2;
    poolLight.position.set(inX(-2.1), 0.045, zc);
    poolLight.renderOrder = 1;
    g.add(poolLight);

    addNeonAmbience(g, side, zc, sw, neon);

    addBand(
        isRamen ? pick(RAMEN_NAMES) : pick(SHOP_NAMES),
        isRamen ? pick(RAMEN_BANDS) : pick(SHOP_BANDS),
    );

    if (isRamen) {
        const noren = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.min(openW - 1, 4.2), 0.78),
            new THREE.MeshBasicMaterial({ map: norenTex, side: THREE.DoubleSide }),
        );
        noren.position.set(inX(-0.12), 2.78, zc + openW * 0.12);
        noren.rotation.y = rotY;
        g.add(noren);
        addLanterns(g, side, zc, sw);
        if (DETAILED && Math.random() < 0.6) addSteam(g, side, zc + rand(-1, 1));
    }

    addProjectingSign(g, side, zc, sw, neon);
    if (Math.random() < 0.55) {
        // horizontal banner mounted flat on the facade above the name band
        addHBanner(g, inX(-0.1), rand(4.9, 6.3), zc + rand(-0.8, 0.8), Math.min(sw - 3.0, rand(3.6, 6.0)), { rotY, color: pick(NEON) });
    }
    if (Math.random() < 0.5) {
        // tall fabric banner flanking the alcove mouth
        const e = Math.random() < 0.5 ? -1 : 1;
        const bh = rand(2.9, 3.6);
        addBannerSign(g, inX(-0.5), bh / 2 + 0.3, zc + e * (openW / 2 - 0.35), bh, { color: pick(NEON) });
    }
    addUpperSigns(g, side, zc, sw, sh, rotY);
}

function buildShopRow(g, side) {
    // full-depth divider walls between slots double as the alcoves' side
    // walls and close off the row ends; their exposed faces carry the
    // unlit-window facade
    const divider = (z) => {
        const d = new THREE.Mesh(boxGeo, dividerMats);
        d.scale.set(3.0, 3.28, 1.1);
        d.position.set(side * (WALK_EDGE + 1.22), 0, z);
        g.add(d);
    };
    // slot widths always stay >= 6.8: the row closes with one full-width slot
    // (or a capped step that leaves room for it), never a sliver shop whose
    // interior props would need negative scales
    let t = 0;
    divider(-0.3);
    while (t < BLOCK_LEN - 0.5) {
        const remaining = BLOCK_LEN - t;
        const sw = remaining <= 13.6 ? remaining : Math.min(rand(6.8, 10.5), remaining - 6.8);
        buildShopUnit(g, side, -(t + sw / 2), sw);
        t += sw;
        divider(-Math.min(t, 35.7));
    }
}

function buildTowers(g, side) {
    const n = (IS_MOBILE ? 3 : 4) + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i += 1) {
        const w = rand(9, 17);
        const d = rand(9, 16);
        const h = rand(18, 72);
        const tower = makeBuilding(w, h, d);
        // keep tower faces behind the deepest shop mass (WALK_EDGE + 9) so a
        // tower can never slice through an alcove and show its facade inside
        // a storefront
        const tx = side * (WALK_EDGE + 9.6 + w / 2 + rand(0, 16));
        const tz = -rand(d / 2, BLOCK_LEN - d / 2);
        tower.position.set(tx, 0, tz);
        g.add(tower);

        for (let r = 0; r < Math.floor(rand(0, 2.4)); r += 1) {
            const clutter = new THREE.Mesh(boxGeo, roofMat);
            clutter.scale.set(rand(1.4, 3), rand(0.8, 2.4), rand(1.4, 3));
            clutter.position.set(tx + rand(-w / 4, w / 4), h, tz + rand(-d / 4, d / 4));
            g.add(clutter);
        }
        if (h > 48 && Math.random() < 0.55) addBeacon(g, tx, h + 0.6, tz);

        // flashy tower neon: big blade signs hung off the tower's street face,
        // plus discs, lantern pills, draped banners, billboards, rooftop boards
        if (Math.random() < 0.7) {
            const sh = Math.min(rand(8, 14), h - 4);
            const sx = tx - side * (w / 2 + 0.55);
            const sy = rand(sh / 2 + 3, Math.max(sh / 2 + 4, h - sh / 2 - 1));
            const sz = tz + rand(-d / 4, d / 4);
            addVSign(g, sx, sy, sz, sh, { pulse: true });
            const bracket = new THREE.Mesh(boxGeo, darkMat);
            bracket.scale.set(1.1, 0.12, 0.12);
            bracket.position.set(tx - side * w / 2 * 0.55, sy + sh / 2 - 0.3, sz);
            g.add(bracket);
        }
        if (Math.random() < 0.45) {
            // second, smaller projecting sign lower on the street face
            const sz = tz + rand(-d / 4, d / 4);
            if (Math.random() < 0.5) {
                const r = rand(0.9, 1.3);
                addCircleSign(g, tx - side * (w / 2 + r + 0.2), rand(4.5, 9), sz, r);
            } else {
                const len = rand(2.6, 3.8);
                addPillSign(g, tx - side * (w / 2 + len * 0.16 + 0.2), rand(4, 8), sz, len);
            }
        }
        if (h > 22 && Math.random() < 0.35) {
            // tall fabric banner draped flat down the street face
            const bh = Math.min(rand(9, 15), h - 8);
            const bandRot = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            const zr = Math.max(0, d / 2 - bh / 8 - 0.5);
            addBannerSign(g, tx - side * (w / 2 + 0.15), rand(bh / 2 + 4, h - bh / 2 - 2), tz + rand(-zr, zr), bh, { rotY: bandRot });
        }
        if (h > 26 && Math.random() < 0.22) {
            // rooftop disc sign facing down the street
            const r = rand(1.8, 2.8);
            addCircleSign(g, tx, h + r + 0.5, tz, r);
        }
        if (Math.random() < 0.7) {
            addBillboard(g, tx + rand(-1.5, 1.5), rand(h * 0.4, h * 0.8), tz + d / 2 + 0.08, rand(7, 11), rand(3, 4.4));
        }
        if (h > 30 && Math.random() < 0.35) {
            addBillboard(g, tx, h + 1.6, tz + d / 2 * 0.85, w * 0.62, 2.6);
        }
        if (Math.random() < 0.45) {
            const stripColor = pick(NEON);
            for (const corner of [-1, 1]) {
                const stripMat = new THREE.MeshBasicMaterial({ color: stripColor, transparent: true, opacity: 0.85 });
                const strip = new THREE.Mesh(boxGeo, stripMat);
                strip.scale.set(0.14, h * 0.6, 0.14);
                strip.position.set(tx + corner * (w / 2), h * 0.15, tz + d / 2 + 0.05);
                g.add(strip);
                registerFlicker([stripMat]);
            }
        }
    }
}

export function makeStreetChunk() {
    const g = new THREE.Group();

    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, BLOCK_LEN), new THREE.MeshBasicMaterial({ map: roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.005, -BLOCK_LEN / 2);
    g.add(road);
    const walkMat = new THREE.MeshBasicMaterial({ map: walkTex });
    for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(WALK_EDGE - ROAD_HALF, BLOCK_LEN), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(side * (ROAD_HALF + (WALK_EDGE - ROAD_HALF) / 2), 0.015, -BLOCK_LEN / 2);
        g.add(walk);
    }

    for (const side of [-1, 1]) {
        buildShopRow(g, side);
        buildTowers(g, side);
        addStreetLamp(g, side, -rand(3, 15));
        addStreetLamp(g, side, -rand(20, 33));
        addAtmosphere(g, side * rand(6, 16), rand(22, 38), -rand(6, 30));
    }
    addAtmosphere(g, rand(-10, 10), rand(36, 50), -rand(8, 28));
    addUtilityWires(g, -rand(3, 33));
    if (Math.random() < 0.3) addGantry(g, -rand(5, 31));

    return { group: g, inUse: false };
}

function addFakeRoad(g, len) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, len), new THREE.MeshBasicMaterial({ map: stubRoadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.005, -len / 2);
    g.add(road);
    const walkMat = new THREE.MeshBasicMaterial({ map: stubWalkTex });
    for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(WALK_EDGE - ROAD_HALF, len), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(side * (ROAD_HALF + (WALK_EDGE - ROAD_HALF) / 2), 0.015, -len / 2);
        g.add(walk);
    }
}

function addFakeStreetWalls(g, len, { deep = false } = {}) {
    for (const side of [-1, 1]) {
        addStreetLamp(g, side, -rand(5, 20));
        for (let i = 0; i < (IS_MOBILE ? 2 : 4); i += 1) {
            const z = -rand(4, Math.max(8, len - 4));
            const roll = Math.random();
            if (roll < 0.4) {
                addVSign(g, side * (WALK_EDGE - 0.6), rand(3.6, 6.4), z, rand(2.4, 4.2));
            } else if (roll < 0.6) {
                const r = rand(0.7, 1.0);
                addCircleSign(g, side * (WALK_EDGE - 0.2 - r), rand(3.8, 5.6), z, r);
            } else if (roll < 0.8) {
                const pl = rand(2.0, 3.0);
                addPillSign(g, side * (WALK_EDGE - 0.2 - pl * 0.16), rand(3.6, 5.2), z, pl);
            } else {
                const bh = rand(2.8, 3.6);
                addBannerSign(g, side * (WALK_EDGE - 0.5), bh / 2 + 0.3, z, bh);
            }
        }

        const count = deep ? (IS_MOBILE ? 3 : 5) : (IS_MOBILE ? 2 : 3);
        for (let i = 0; i < count; i += 1) {
            const w = rand(deep ? 10 : 8, deep ? 20 : 15);
            const d = rand(7, deep ? 16 : 12);
            const h = rand(deep ? 34 : 22, deep ? 98 : 68);
            const zMin = d / 2 + 1;
            const zMax = Math.max(zMin + 1, len - d / 2 - 1);
            const tower = makeFillerBuilding(w, h, d);
            tower.position.set(side * (WALK_EDGE + 1.8 + w / 2 + rand(0, 4)), 0, -rand(zMin, zMax));
            g.add(tower);
        }
    }
}

function buildBranchRoad() {
    const g = new THREE.Group();
    addFakeRoad(g, FAKE_BRANCH_LEN);
    addFakeStreetWalls(g, FAKE_BRANCH_LEN, { deep: true });

    for (const side of [-1, 1]) {
        const w = rand(18, 34);
        const far = makeFillerBuilding(w, rand(66, 140), rand(14, 30));
        far.position.set(side * (WALK_EDGE + 4 + w / 2 + rand(0, 18)), 0, -(FAKE_BRANCH_LEN + rand(10, 28)));
        g.add(far);
    }
    addAtmosphere(g, rand(-6, 6), rand(20, 34), -FAKE_BRANCH_LEN / 2);
    return g;
}

function addFakeIntersection(g, z0) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(INTER_HALF * 2, INTER_HALF * 2), new THREE.MeshBasicMaterial({ map: interTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0.005, z0 - INTER_HALF);
    g.add(ground);

    const cornerMat = new THREE.MeshBasicMaterial({ map: cornerWalkTex });
    for (const sx of [-1, 1]) {
        for (const zc of [z0 - 2, z0 - 18]) {
            const corner = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), cornerMat);
            corner.rotation.x = -Math.PI / 2;
            corner.position.set(sx * 8, 0.012, zc);
            g.add(corner);
        }
    }

    const cwMat = new THREE.MeshBasicMaterial({ map: crosswalkTex, transparent: true, depthWrite: false });
    const cwGeo = new THREE.PlaneGeometry(11.5, 3.2);
    const cwSpots = [
        [0, z0 - 1.8, 0], [0, z0 - 18.2, 0],
        [-8.2, z0 - 10, Math.PI / 2], [8.2, z0 - 10, Math.PI / 2],
    ];
    for (const [x, z, rz] of cwSpots) {
        const cw = new THREE.Mesh(cwGeo, cwMat);
        cw.rotation.set(-Math.PI / 2, 0, rz);
        cw.position.set(x, 0.02, z);
        cw.renderOrder = 1;
        g.add(cw);
    }

    addSignal(g, 8.3, z0 - 17.6, 0, true);
    addSignal(g, -8.3, z0 - 2.4, Math.PI, false);

    const forward = buildBranchRoad();
    forward.position.set(0, 0, z0 - INTER_HALF * 2);
    g.add(forward);
    const right = buildBranchRoad();
    right.position.set(INTER_HALF, 0, z0 - INTER_HALF);
    right.rotation.y = -Math.PI / 2;
    g.add(right);
    const left = buildBranchRoad();
    left.position.set(-INTER_HALF, 0, z0 - INTER_HALF);
    left.rotation.y = Math.PI / 2;
    g.add(left);
}

// Fake side street seen down an unused intersection arm. It now leads into its
// own visible intersection, with left, right, and forward continuation streets
// instead of a hard cap into the void.
function buildStub() {
    const g = new THREE.Group();
    addFakeRoad(g, STUB_LEN);
    addFakeStreetWalls(g, STUB_LEN);
    addFakeIntersection(g, -STUB_LEN);
    addBillboard(g, rand(-4, 4), rand(7, 14), -(STUB_LEN - 0.2), rand(6, 9), rand(2.6, 3.6));
    addAtmosphere(g, 0, rand(18, 26), -STUB_LEN / 2);
    return g;
}

// intersection local frame: path enters at z=0 heading -z, exits at z=-20 (or
// turns into the +-x arms); stubs fill whichever arms the path doesn't use
export function makeInterChunk() {
    const g = new THREE.Group();

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(INTER_HALF * 2, INTER_HALF * 2), new THREE.MeshBasicMaterial({ map: interTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0.005, -INTER_HALF);
    g.add(ground);

    const cornerMat = new THREE.MeshBasicMaterial({ map: cornerWalkTex });
    for (const sx of [-1, 1]) {
        for (const zc of [-2, -18]) {
            const corner = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), cornerMat);
            corner.rotation.x = -Math.PI / 2;
            corner.position.set(sx * 8, 0.012, zc);
            g.add(corner);
        }
    }

    const cwMat = new THREE.MeshBasicMaterial({ map: crosswalkTex, transparent: true, depthWrite: false });
    const cwGeo = new THREE.PlaneGeometry(11.5, 3.2);
    const cwSpots = [
        [0, -1.8, 0], [0, -18.2, 0],
        [-8.2, -10, Math.PI / 2], [8.2, -10, Math.PI / 2],
    ];
    for (const [x, z, rz] of cwSpots) {
        const cw = new THREE.Mesh(cwGeo, cwMat);
        cw.rotation.set(-Math.PI / 2, 0, rz);
        cw.position.set(x, 0.02, z);
        cw.renderOrder = 1;
        g.add(cw);
    }

    addSignal(g, 8.3, -17.6, 0, true);
    addSignal(g, -8.3, -2.4, Math.PI, false);
    addAtmosphere(g, rand(-6, 6), rand(24, 34), -INTER_HALF);

    const stubF = buildStub();
    stubF.position.set(0, 0, -INTER_HALF * 2);
    g.add(stubF);
    const stubR = buildStub();
    stubR.position.set(INTER_HALF, 0, -INTER_HALF);
    stubR.rotation.y = -Math.PI / 2;
    g.add(stubR);
    const stubL = buildStub();
    stubL.position.set(-INTER_HALF, 0, -INTER_HALF);
    stubL.rotation.y = Math.PI / 2;
    g.add(stubL);

    return {
        group: g,
        inUse: false,
        // turn: 0 straight, 1 right, -1 left — hide the arm the path occupies
        setArms(turn) {
            stubF.visible = turn !== 0;
            stubR.visible = turn !== 1;
            stubL.visible = turn !== -1;
        },
    };
}
