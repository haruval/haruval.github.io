import * as THREE from '/portfolio/vendor/three/three.module.js';

export const IS_MOBILE = window.innerWidth < 720;
// a glowing violet haze rather than near-black: distant geometry dissolves into
// this purple, which the denser FogExp2 in main.js pushes hard into the distance
export const FOG_COLOR = 0x3a1c66;

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const NEON = ['#ff2d78', '#00e5ff', '#b366ff', '#ff9a1f', '#39ff88', '#ff5e5e', '#ffd60a', '#5e8bff'];
export const SIGN_TEXTS = ['ラーメン', 'カラオケ', 'スナック', 'ホテル', 'パチンコ', '居酒屋', '寿司', '焼肉', 'クラブ', 'サウナ', '薬局', '喫茶', 'ゲーム', '麻雀', '花屋', '質屋'];
export const BILLBOARD_TEXTS = ['ネオン東京', 'ビール', 'ホテル 月', '未来電子', 'カラオケ館', '夜行都市', '電脳街', 'サイバー'];
export const RAMEN_NAMES = ['ラーメン 一番', 'らーめん 月', '中華そば 龍', 'つけ麺 心', 'ラーメン 王'];
export const SHOP_NAMES = ['居酒屋 のんべえ', 'コンビニ', '弁当 さくら', 'カレーの店', 'たこ焼き', '喫茶 ルナ'];
export const RAMEN_BANDS = ['#c41f2e', '#d8451f', '#a8151f'];
export const SHOP_BANDS = ['#1f7ac4', '#7a1fc4', '#1fc48a', '#c4a01f', '#44508c'];
export const CJK_FONT = '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

export function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export const glowTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
});

export const skyTex = canvasTexture(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#0c0622');
    g.addColorStop(0.5, '#1b0f3c');
    g.addColorStop(0.82, '#311a58');
    g.addColorStop(1, '#3a1c66'); // == FOG_COLOR so the fogged horizon blends seamlessly
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
});

const FACADES = ['#10121d', '#141019', '#0e141a', '#15121f', '#0f0f16', '#171219'];
const WINDOW_COLORS = ['#ffd9a0', '#ffe9c4', '#aee7ff', '#8fd8ff', '#ffc4e8', '#d9d2ff', '#ff9ad5', '#7df0ff', '#ff4fd8', '#27f0ff'];

function makeWindowTexture() {
    return canvasTexture(128, 256, (ctx) => {
        ctx.fillStyle = pick(FACADES);
        ctx.fillRect(0, 0, 128, 256);
        const cols = 8, rows = 16, cw = 128 / cols, ch = 256 / rows;
        const litChance = rand(0.28, 0.55);
        const dominant = pick(WINDOW_COLORS);
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                if (Math.random() < litChance) {
                    ctx.fillStyle = Math.random() < 0.72 ? dominant : pick(WINDOW_COLORS);
                    ctx.globalAlpha = rand(0.3, 1);
                } else {
                    ctx.fillStyle = '#05060a';
                    ctx.globalAlpha = 0.9;
                }
                ctx.fillRect(c * cw + 2, r * ch + 3, cw - 4, ch - 6);
            }
        }
        ctx.globalAlpha = 1;
    });
}

export const windowTextures = Array.from({ length: 6 }, makeWindowTexture);

const vsignCache = new Map();
export function vsignTexture(text, color) {
    const key = text + '|' + color;
    if (!vsignCache.has(key)) {
        vsignCache.set(key, canvasTexture(96, 384, (ctx) => {
            ctx.fillStyle = '#0a0710';
            ctx.fillRect(0, 0, 96, 384);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 5;
            ctx.strokeRect(7, 7, 82, 370);
            ctx.globalAlpha = 1;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 52px ${CJK_FONT}`;
            const chars = [...text];
            const step = 356 / chars.length;
            chars.forEach((chr, i) => {
                const y = 14 + step * (i + 0.5);
                ctx.shadowColor = color;
                ctx.shadowBlur = 22;
                ctx.fillStyle = color;
                ctx.fillText(chr, 48, y);
                ctx.shadowBlur = 6;
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.fillText(chr, 48, y);
            });
            ctx.shadowBlur = 0;
        }));
    }
    return vsignCache.get(key);
}

const billboardCache = new Map();
export function billboardTexture(text, color) {
    const key = text + '|' + color;
    if (!billboardCache.has(key)) {
        billboardCache.set(key, canvasTexture(256, 96, (ctx) => {
            ctx.fillStyle = '#0b0810';
            ctx.fillRect(0, 0, 256, 96);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 4;
            ctx.strokeRect(5, 5, 246, 86);
            ctx.globalAlpha = 1;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 38px ${CJK_FONT}`;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.fillStyle = color;
            ctx.fillText(text, 128, 50);
            ctx.shadowBlur = 5;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillText(text, 128, 50);
            ctx.shadowBlur = 0;
        }));
    }
    return billboardCache.get(key);
}

const bandCache = new Map();
export function bandTexture(name, band) {
    const key = name + '|' + band;
    if (!bandCache.has(key)) {
        bandCache.set(key, canvasTexture(256, 40, (ctx) => {
            ctx.fillStyle = band;
            ctx.fillRect(0, 0, 256, 40);
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 3;
            ctx.strokeRect(1.5, 1.5, 253, 37);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 23px ${CJK_FONT}`;
            ctx.shadowColor = '#fff2d8';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#fff6e8';
            ctx.fillText(name, 128, 21);
            ctx.shadowBlur = 0;
        }));
    }
    return bandCache.get(key);
}

// glowing shop interiors, seen through the recessed storefront opening —
// three clearly distinct scenes: ramen kitchen, izakaya, konbini
function drawRamenInterior() {
    return canvasTexture(256, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#ffe2b0');
        g.addColorStop(1, '#d8924a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 128);

        // red and white menu tags across the top
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        for (let x = 10; x < 218; x += 26) {
            const red = Math.random() < 0.5;
            ctx.fillStyle = red ? '#c41f2e' : '#fffdf2';
            ctx.fillRect(x, 6, 20, 26);
            ctx.font = `700 13px ${CJK_FONT}`;
            ctx.fillStyle = red ? '#fffdf2' : '#a01622';
            ctx.fillText(pick(['麺', '丼', '餃', '湯']), x + 10, 25);
        }

        // stainless kitchen pass with pots and steam
        ctx.fillStyle = '#aeb8c2';
        ctx.fillRect(8, 60, 212, 14);
        ctx.fillStyle = '#3c3640';
        for (const px of [50, 120, 185]) {
            ctx.beginPath();
            ctx.arc(px, 58, 11, Math.PI, 0);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        for (const px of [44, 56, 114, 126, 179, 191]) {
            ctx.beginPath();
            ctx.moveTo(px, 50);
            ctx.quadraticCurveTo(px + 4, 42, px, 34);
            ctx.stroke();
        }

        // vertical red banner
        ctx.fillStyle = '#a01622';
        ctx.fillRect(228, 30, 24, 84);
        ctx.font = `700 15px ${CJK_FONT}`;
        ctx.fillStyle = '#fff0e0';
        ['ら', 'ー', 'め', 'ん'].forEach((c, i) => ctx.fillText(c, 240, 50 + i * 18));

        ctx.fillStyle = 'rgba(46,20,8,0.6)';
        ctx.fillRect(0, 100, 256, 28);
    });
}

function drawIzakayaInterior() {
    return canvasTexture(256, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#ffd28a');
        g.addColorStop(1, '#a8642a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 128);

        // lantern string along the ceiling
        ctx.fillStyle = '#ff7a52';
        ctx.shadowColor = '#ff5030';
        ctx.shadowBlur = 8;
        for (let x = 20; x < 240; x += 36) {
            ctx.beginPath();
            ctx.arc(x, 12, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // bottle shelves
        for (const sy of [52, 86]) {
            ctx.fillStyle = '#5a3014';
            ctx.fillRect(8, sy, 240, 6);
            for (let x = 14; x < 240; x += rand(11, 17)) {
                ctx.fillStyle = `hsl(${Math.floor(rand(0, 360))} 65% 52%)`;
                const bh = rand(13, 22);
                ctx.fillRect(x, sy - bh, rand(5, 8), bh);
            }
        }

        // sake poster
        ctx.fillStyle = '#f6ead2';
        ctx.fillRect(16, 18, 30, 30);
        ctx.font = `700 22px ${CJK_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1a0e08';
        ctx.fillText('酒', 31, 41);

        ctx.fillStyle = 'rgba(40,18,8,0.6)';
        ctx.fillRect(0, 102, 256, 26);
    });
}

function drawKonbiniInterior() {
    return canvasTexture(256, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#f6fbff');
        g.addColorStop(1, '#c8d8e6');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 128);

        // ceiling light strips
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#dff2ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(24, 6, 90, 7);
        ctx.fillRect(142, 6, 90, 7);
        ctx.shadowBlur = 0;

        // product shelves
        for (const sy of [44, 70, 96]) {
            ctx.fillStyle = '#9aa8b4';
            ctx.fillRect(8, sy, 160, 5);
            for (let x = 12; x < 158; x += 13) {
                ctx.fillStyle = `hsl(${Math.floor(rand(0, 360))} 75% 55%)`;
                ctx.fillRect(x, sy - 12, 10, 12);
            }
        }

        // drink fridge
        ctx.fillStyle = '#3c5a78';
        ctx.fillRect(182, 28, 66, 86);
        ctx.fillStyle = '#bfe6ff';
        ctx.fillRect(186, 32, 58, 78);
        for (const fy of [44, 62, 80, 98]) {
            ctx.fillStyle = '#7da6c4';
            ctx.fillRect(186, fy, 58, 3);
            for (let x = 190; x < 238; x += 10) {
                ctx.fillStyle = `hsl(${Math.floor(rand(150, 360))} 70% 50%)`;
                ctx.fillRect(x, fy - 11, 7, 11);
            }
        }
        ctx.fillStyle = 'rgba(70,80,96,0.5)';
        ctx.fillRect(0, 114, 256, 14);
    });
}

const interiorCache = { ramen: [], izakaya: [], konbini: [] };
const interiorDrawers = { ramen: drawRamenInterior, izakaya: drawIzakayaInterior, konbini: drawKonbiniInterior };
export function interiorTexture(kind) {
    const arr = interiorCache[kind];
    if (arr.length < 2) {
        const tex = interiorDrawers[kind]();
        arr.push(tex);
        return tex;
    }
    return pick(arr);
}

// flat storefronts for the non-recessed slots: a lit glass window with the
// shop interior painted behind it, plus a door
const flatShopTextures = [];
export function flatShopTexture() {
    if (flatShopTextures.length < 4) {
        const tex = canvasTexture(256, 128, (ctx) => {
            ctx.fillStyle = '#15121a';
            ctx.fillRect(0, 0, 256, 128);
            ctx.fillStyle = '#2c2632';
            ctx.fillRect(8, 6, 186, 116);

            const cool = Math.random() < 0.35;
            const g = ctx.createLinearGradient(0, 10, 0, 118);
            g.addColorStop(0, cool ? '#d8ecff' : '#ffd9a0');
            g.addColorStop(1, cool ? '#8fa8c4' : '#b3702e');
            ctx.fillStyle = g;
            ctx.fillRect(14, 12, 174, 104);

            for (const sy of [48, 78]) {
                ctx.fillStyle = 'rgba(60,30,14,0.8)';
                ctx.fillRect(20, sy, 162, 5);
                for (let x = 24; x < 174; x += rand(12, 18)) {
                    ctx.fillStyle = `hsl(${Math.floor(rand(0, 360))} 65% 52%)`;
                    const bh = rand(10, 16);
                    ctx.fillRect(x, sy - bh, rand(6, 9), bh);
                }
            }

            ctx.fillStyle = '#fff0b3';
            ctx.shadowColor = '#ffdf8a';
            ctx.shadowBlur = 8;
            for (let i = 0; i < 3; i += 1) {
                ctx.beginPath();
                ctx.arc(46 + i * 56, 22, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'rgba(30,16,8,0.85)';
            const patrons = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < patrons; i += 1) {
                const px = rand(30, 166);
                ctx.beginPath();
                ctx.arc(px, 86, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(px - 8, 86, 16, 28);
            }

            // diagonal glass reflections
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#ffffff';
            for (const rx of [26, 86, 146]) {
                ctx.beginPath();
                ctx.moveTo(rx, 116);
                ctx.lineTo(rx + 26, 12);
                ctx.lineTo(rx + 38, 12);
                ctx.lineTo(rx + 12, 116);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // door with lit pane
            ctx.fillStyle = '#241e2a';
            ctx.fillRect(200, 12, 48, 110);
            ctx.fillStyle = cool ? '#cfe4f4' : '#ffcf8a';
            ctx.fillRect(206, 20, 36, 72);
            ctx.fillStyle = '#1a141f';
            ctx.fillRect(208, 96, 32, 6);
        });
        flatShopTextures.push(tex);
        return tex;
    }
    return pick(flatShopTextures);
}

export const chefTex = canvasTexture(64, 128, (ctx) => {
    ctx.fillStyle = '#1a0e08';
    ctx.beginPath();
    ctx.arc(32, 26, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 128);
    ctx.quadraticCurveTo(14, 44, 32, 42);
    ctx.quadraticCurveTo(50, 44, 50, 128);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f0e4';
    ctx.fillRect(20, 18, 24, 5);
});

export const norenTex = canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = '#a01622';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#7d0f1a';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 32, 12);
        ctx.lineTo(i * 32, 64);
        ctx.stroke();
    }
    ctx.font = `700 26px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff0e0';
    ctx.fillText('麺', 64, 36);
});

export const roadTex = canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 420; i += 1) {
        ctx.fillStyle = Math.random() < 0.5 ? '#16161e' : '#06060a';
        ctx.globalAlpha = rand(0.15, 0.4);
        ctx.fillRect(rand(0, 255), rand(0, 511), rand(1, 3), rand(1, 3));
    }
    // neon reflection smears for the wet-street look — broken streaks, not lanes
    ctx.filter = 'blur(5px)';
    for (let i = 0; i < 16; i += 1) {
        const x = rand(8, 232);
        const w = rand(5, 14);
        let y = rand(-60, 100);
        while (y < 512) {
            const seg = rand(40, 130);
            ctx.globalAlpha = rand(0.04, 0.1);
            ctx.fillStyle = pick(NEON);
            ctx.fillRect(x + rand(-3, 3), y, w, seg);
            y += seg + rand(40, 160);
        }
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(150,150,165,0.4)';
    ctx.fillRect(9, 0, 4, 512);
    ctx.fillRect(243, 0, 4, 512);
    ctx.fillStyle = 'rgba(220,220,230,0.5)';
    for (let y = 0; y < 512; y += 64) {
        ctx.fillRect(125, y, 6, 36);
    }
});
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
roadTex.repeat.set(1, 1.2); // street-chunk road plane is 36 long; one texture tile = 30 units

export const stubRoadTex = roadTex.clone();
stubRoadTex.repeat.set(1, 26 / 30);
stubRoadTex.needsUpdate = true;

export const walkTex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#1d1d2b';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }
    for (let i = 0; i < 90; i += 1) {
        ctx.fillStyle = Math.random() < 0.5 ? '#1a1a26' : '#0e0e16';
        ctx.globalAlpha = rand(0.2, 0.5);
        ctx.fillRect(rand(0, 127), rand(0, 127), 2, 2);
    }
    ctx.globalAlpha = 1;
});
walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
walkTex.repeat.set(1, 12);

export const stubWalkTex = walkTex.clone();
stubWalkTex.repeat.set(1, 8.5);
stubWalkTex.needsUpdate = true;

export const cornerWalkTex = walkTex.clone();
cornerWalkTex.repeat.set(1, 1.3);
cornerWalkTex.needsUpdate = true;

export const interTex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 320; i += 1) {
        ctx.fillStyle = Math.random() < 0.5 ? '#16161e' : '#06060a';
        ctx.globalAlpha = rand(0.15, 0.4);
        ctx.fillRect(rand(0, 255), rand(0, 255), rand(1, 3), rand(1, 3));
    }
    ctx.filter = 'blur(5px)';
    for (let i = 0; i < 10; i += 1) {
        ctx.globalAlpha = rand(0.025, 0.06);
        ctx.fillStyle = pick(NEON);
        ctx.fillRect(rand(8, 232), rand(0, 200), rand(8, 24), rand(40, 120));
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
});

export const crosswalkTex = canvasTexture(256, 128, (ctx) => {
    for (let x = 8; x < 256; x += 34) {
        ctx.fillStyle = `rgba(225,225,235,${rand(0.32, 0.5)})`;
        ctx.fillRect(x, 6, 19, 116);
    }
});

export function applyAnisotropy(renderer) {
    const a = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    roadTex.anisotropy = a;
    stubRoadTex.anisotropy = a;
    walkTex.anisotropy = a;
    stubWalkTex.anisotropy = a;
}
