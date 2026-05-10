import * as THREE from "../vendor/three/three.module.js";

const DEFAULT_OPTIONS = {
    count: undefined,
    zIndex: 6,
    maxPixelRatio: 1.5,
};

const COLOR_PALETTE = [
    0x7dd3fc,
    0xc4b5fd,
    0xf0abfc,
    0xfda4af,
    0xfcd34d,
    0x86efac,
];

const SOFT_TINT = new THREE.Color(0xffffff);
const GLOW_RADIUS = 2.4;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}

export class ThreeCloudOverlay {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.meshes = [];
        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);
        this.pointerNdc = new THREE.Vector2(0, 0);
        this.cursorRaycaster = new THREE.Raycaster();
        this.cursorWorldPosition = new THREE.Vector3();
        this.meshWorldPosition = new THREE.Vector3();
        this.animationFrame = null;
        this.isDestroyed = false;
        this.startedAt = performance.now() * 0.001;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.z = 9;

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
        });

        this.canvas = this.renderer.domElement;
        this.canvas.className = "three-cloud-overlay";
        this.canvas.setAttribute("aria-hidden", "true");
        Object.assign(this.canvas.style, {
            position: "fixed",
            inset: "0",
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: String(this.options.zIndex),
        });

        this.geometry = new THREE.IcosahedronGeometry(1, 1);
        this.glowGeometry = new THREE.IcosahedronGeometry(0.72, 1);
        this.cloudGroup = new THREE.Group();
        this.scene.add(this.cloudGroup);

        this.onResize = this.onResize.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.animate = this.animate.bind(this);

        this.buildCloudLayer();
        this.mount();
    }

    getMeshCount() {
        if (typeof this.options.count === "number") {
            return this.options.count;
        }

        return window.innerWidth < 720 ? 10 : 18;
    }

    buildCloudLayer() {
        const count = this.getMeshCount();
        const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
        const spreadX = Math.max(5.5, aspect * 5.6);
        const spreadY = 4.2;

        for (let index = 0; index < count; index += 1) {
            const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
            const tint = new THREE.Color(color).lerp(SOFT_TINT, 0.28);
            const glowColor = new THREE.Color(color).lerp(SOFT_TINT, 0.12);
            const opacity = randomBetween(0.1, 0.18);
            const material = new THREE.MeshPhysicalMaterial({
                color: tint,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                roughness: 0.72,
                metalness: 0,
                transmission: 0.28,
                thickness: 0.85,
                ior: 1.24,
                clearcoat: 0.18,
                clearcoatRoughness: 0.78,
                attenuationColor: tint,
                attenuationDistance: 3.4,
                emissive: glowColor,
                emissiveIntensity: 0.1,
                flatShading: true,
                side: THREE.DoubleSide,
            });
            const baseGlowOpacity = randomBetween(0.018, 0.038);
            const maxGlowOpacity = randomBetween(0.13, 0.22);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: glowColor,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false,
            });

            const mesh = new THREE.Mesh(this.geometry, material);
            const innerGlowMesh = new THREE.Mesh(this.glowGeometry, glowMaterial);
            const scale = randomBetween(0.55, 1.85);
            const position = new THREE.Vector3(
                randomBetween(-spreadX, spreadX),
                randomBetween(-spreadY, spreadY),
                randomBetween(-7, 0.8),
            );

            mesh.position.copy(position);
            mesh.scale.setScalar(scale * 0.84);
            mesh.rotation.set(
                randomBetween(0, Math.PI),
                randomBetween(0, Math.PI),
                randomBetween(0, Math.PI),
            );
            innerGlowMesh.scale.setScalar(0.92);
            mesh.add(innerGlowMesh);

            mesh.userData = {
                basePosition: position.clone(),
                baseScale: scale,
                targetOpacity: opacity,
                innerGlowMesh,
                glowMaterial,
                baseGlowOpacity,
                maxGlowOpacity,
                currentGlow: baseGlowOpacity,
                targetGlow: baseGlowOpacity,
                baseEmissiveIntensity: randomBetween(0.08, 0.14),
                maxEmissiveBoost: randomBetween(0.16, 0.28),
                shellOpacityBoost: randomBetween(0.018, 0.032),
                fadeDelay: index * 0.08 + randomBetween(0, 0.55),
                fadeDuration: randomBetween(1.35, 2.6),
                driftSpeed: randomBetween(0.018, 0.045),
                driftDistance: randomBetween(0.22, 0.68),
                bobSpeed: randomBetween(0.35, 0.75),
                bobDistance: randomBetween(0.06, 0.18),
                rotationSpeed: new THREE.Vector3(
                    randomBetween(-0.0018, 0.0018),
                    randomBetween(-0.0022, 0.0022),
                    randomBetween(-0.0015, 0.0015),
                ),
                phase: randomBetween(0, Math.PI * 2),
            };

            this.meshes.push(mesh);
            this.cloudGroup.add(mesh);
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
        keyLight.position.set(-3, 5, 6);
        this.scene.add(ambientLight, keyLight);
        this.lights = [ambientLight, keyLight];
    }

    mount() {
        document.body.appendChild(this.canvas);

        window.addEventListener("resize", this.onResize);
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });

        this.onResize();
        this.animate();
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / Math.max(height, 1);
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.options.maxPixelRatio));
        this.renderer.setSize(width, height, false);
    }

    onPointerMove(event) {
        this.targetMouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
        this.targetMouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
    }

    animate() {
        if (this.isDestroyed) {
            return;
        }

        const elapsed = performance.now() * 0.001;

        this.mouse.lerp(this.targetMouse, 0.035);
        this.cloudGroup.position.x = this.mouse.x * 0.42;
        this.cloudGroup.position.y = -this.mouse.y * 0.28;
        this.cloudGroup.rotation.y = this.mouse.x * 0.025;
        this.cloudGroup.rotation.x = this.mouse.y * 0.018;
        this.pointerNdc.set(this.mouse.x, -this.mouse.y);
        this.cursorRaycaster.setFromCamera(this.pointerNdc, this.camera);

        this.meshes.forEach((mesh) => {
            const {
                basePosition,
                driftSpeed,
                driftDistance,
                bobSpeed,
                bobDistance,
                rotationSpeed,
                baseScale,
                targetOpacity,
                innerGlowMesh,
                glowMaterial,
                baseGlowOpacity,
                maxGlowOpacity,
                baseEmissiveIntensity,
                maxEmissiveBoost,
                shellOpacityBoost,
                fadeDelay,
                fadeDuration,
                phase,
            } = mesh.userData;
            const fadeProgress = Math.min(Math.max((elapsed - this.startedAt - fadeDelay) / fadeDuration, 0), 1);
            const easedFade = easeOutCubic(fadeProgress);

            mesh.scale.setScalar(baseScale * (0.84 + easedFade * 0.16));
            mesh.position.x = basePosition.x + Math.sin(elapsed * driftSpeed + phase) * driftDistance;
            mesh.position.y = basePosition.y + Math.sin(elapsed * bobSpeed + phase) * bobDistance;
            mesh.position.z = basePosition.z + Math.cos(elapsed * driftSpeed * 0.8 + phase) * 0.2;
            mesh.rotation.x += rotationSpeed.x;
            mesh.rotation.y += rotationSpeed.y;
            mesh.rotation.z += rotationSpeed.z;

            mesh.getWorldPosition(this.meshWorldPosition);
            const ray = this.cursorRaycaster.ray;
            const distanceToMeshDepth = (this.meshWorldPosition.z - ray.origin.z) / ray.direction.z;
            this.cursorWorldPosition.copy(ray.origin).addScaledVector(ray.direction, distanceToMeshDepth);

            const distance = this.cursorWorldPosition.distanceTo(this.meshWorldPosition);
            const influence = THREE.MathUtils.clamp(1 - distance / GLOW_RADIUS, 0, 1);
            const easedInfluence = influence * influence * (3 - 2 * influence);
            const targetGlow = baseGlowOpacity + easedInfluence * (maxGlowOpacity - baseGlowOpacity);
            const currentGlow = THREE.MathUtils.lerp(mesh.userData.currentGlow, targetGlow, 0.08);

            mesh.userData.targetGlow = targetGlow;
            mesh.userData.currentGlow = currentGlow;
            mesh.material.opacity = Math.min(targetOpacity + easedInfluence * shellOpacityBoost, 0.23) * easedFade;
            mesh.material.emissiveIntensity = baseEmissiveIntensity + easedInfluence * maxEmissiveBoost;
            glowMaterial.opacity = Math.min(currentGlow, maxGlowOpacity) * easedFade;
            innerGlowMesh.scale.setScalar(0.92 + easedInfluence * 0.1);
        });

        this.renderer.render(this.scene, this.camera);
        this.animationFrame = window.requestAnimationFrame(this.animate);
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;

        if (this.animationFrame !== null) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        window.removeEventListener("resize", this.onResize);
        window.removeEventListener("pointermove", this.onPointerMove);

        this.meshes.forEach((mesh) => {
            const { innerGlowMesh, glowMaterial } = mesh.userData;
            if (innerGlowMesh) {
                mesh.remove(innerGlowMesh);
            }
            if (glowMaterial) {
                glowMaterial.dispose();
            }
            mesh.material.dispose();
            this.cloudGroup.remove(mesh);
        });
        this.geometry.dispose();
        this.glowGeometry.dispose();
        this.lights.forEach((light) => this.scene.remove(light));
        this.scene.remove(this.cloudGroup);
        this.renderer.renderLists.dispose();
        this.renderer.dispose();

        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export function mountThreeCloudOverlay(options = {}) {
    const overlay = new ThreeCloudOverlay(options);
    window.addEventListener("pagehide", () => overlay.destroy(), { once: true });
    return overlay;
}
