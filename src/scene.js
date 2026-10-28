import * as THREE from 'three';

export function initHeroScene() {
    const canvas = document.getElementById('hero-webgl');
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvas.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.0015); // Light fog for depth

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 400;

    // Particles/Nodes
    const particleCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xef4444); // Primary red/orange
    const color2 = new THREE.Color(0x0f172a); // Slate dark blue

    for (let i = 0; i < particleCount; i++) {
        // Distribute particles in a cylindrical/torus-like shape to resemble a reactor
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI;
        
        const r = 200 + Math.random() * 50;
        
        const x = r * Math.sin(u) * Math.cos(t);
        const y = r * Math.sin(u) * Math.sin(t);
        const z = r * Math.cos(u) + (Math.random() * 400 - 200);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material
    const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Lines Connecting Nodes (Technical/Wireframe feel)
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x94a3b8, // Slate 400
        transparent: true,
        opacity: 0.25
    });

    // Create lines connecting nearby points
    const linePositions = [];
    for(let i = 0; i < particleCount; i++){
        for(let j = i+1; j < particleCount; j++){
            const dx = positions[i*3] - positions[j*3];
            const dy = positions[i*3+1] - positions[j*3+1];
            const dz = positions[i*3+2] - positions[j*3+2];
            const dist = dx*dx + dy*dy + dz*dz;
            
            if(dist < 10000){ // Only connect close particles (100^2)
                linePositions.push(
                    positions[i*3], positions[i*3+1], positions[i*3+2],
                    positions[j*3], positions[j*3+1], positions[j*3+2]
                );
            }
        }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.5;
        mouseY = (event.clientY - windowHalfY) * 0.5;
    });

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Rotate scene
        particles.rotation.y = elapsedTime * 0.05;
        particles.rotation.z = elapsedTime * 0.02;
        
        lines.rotation.y = elapsedTime * 0.05;
        lines.rotation.z = elapsedTime * 0.02;

        // Easing for mouse movement
        targetX = mouseX * 0.1;
        targetY = mouseY * 0.1;
        
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (-targetY - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();
}
