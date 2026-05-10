import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

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
            const opacity = randomBetween(0.075, 0.17);
            const material = new THREE.MeshLambertMaterial({
                color,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                emissive: color,
                emissiveIntensity: 0.18,
                flatShading: true,
            });

            const mesh = new THREE.Mesh(this.geometry, material);
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

            mesh.userData = {
                basePosition: position.clone(),
                baseScale: scale,
                targetOpacity: opacity,
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
                fadeDelay,
                fadeDuration,
                phase,
            } = mesh.userData;
            const fadeProgress = Math.min(Math.max((elapsed - this.startedAt - fadeDelay) / fadeDuration, 0), 1);
            const easedFade = easeOutCubic(fadeProgress);

            mesh.material.opacity = targetOpacity * easedFade;
            mesh.scale.setScalar(baseScale * (0.84 + easedFade * 0.16));
            mesh.position.x = basePosition.x + Math.sin(elapsed * driftSpeed + phase) * driftDistance;
            mesh.position.y = basePosition.y + Math.sin(elapsed * bobSpeed + phase) * bobDistance;
            mesh.position.z = basePosition.z + Math.cos(elapsed * driftSpeed * 0.8 + phase) * 0.2;
            mesh.rotation.x += rotationSpeed.x;
            mesh.rotation.y += rotationSpeed.y;
            mesh.rotation.z += rotationSpeed.z;
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
            mesh.material.dispose();
            this.cloudGroup.remove(mesh);
        });
        this.geometry.dispose();
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
