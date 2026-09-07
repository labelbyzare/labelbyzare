/* ==========================================================================
   LABEL BY ZARE — HERO FABRIC
   A single draped-silk plane that ripples with mouse movement + time.
   Tasteful, quiet, luxury — not a gaming effect. Falls back to a static
   image if Three.js fails to load or prefers-reduced-motion is set.
   ========================================================================== */

(function(){
  const canvas = document.getElementById("hero-canvas");
  if(!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduceMotion || typeof THREE === "undefined"){
    canvas.style.display = "none";
    return;
  }

  let width = canvas.clientWidth, height = canvas.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const isSmallScreen = window.innerWidth < 860;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.5 : 2));
  renderer.setSize(width, height);

  /* Lighting — warm brass key light + soft ink fill, like a studio shoot */
  const key = new THREE.DirectionalLight(0xd9c79a, 2.2);
  key.position.set(4, 4, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x707a8c, 0.6);
  fill.position.set(-5, -2, 3);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x2a2620, 1.1));

  /* Draped fabric plane — high subdivision so folds read smoothly.
     Fewer subdivisions on small screens (cheaper per-frame math) — the
     drape still reads the same at phone size, just less GPU/CPU work. */
  const segs = isSmallScreen ? 48 : 90;
  const geometry = new THREE.PlaneGeometry(14, 9, segs, segs);
  const material = new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  const fabric = new THREE.Mesh(geometry, material);
  fabric.rotation.x = -0.15;
  scene.add(fabric);

  const posAttr = geometry.attributes.position;
  const basePositions = Float32Array.from(posAttr.array);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  let clock = new THREE.Clock();

  // Pause the render loop while the hero is scrolled off-screen so it
  // isn't competing with scroll/animation work happening further down
  // the page — this is a big part of what makes scrolling feel smooth.
  let isVisible = true;
  if("IntersectionObserver" in window){
    new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0 }).observe(canvas);
  }

  function animate(){
    if(!isVisible){ requestAnimationFrame(animate); return; }
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    for(let i = 0; i < posAttr.count; i++){
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];

      // layered sine waves = fabric drape; mouse adds a gentle bulge
      const wave =
        Math.sin(bx * 0.55 + t * 0.5) * 0.35 +
        Math.sin(by * 0.8 + t * 0.35) * 0.25 +
        Math.sin((bx + by) * 0.4 + t * 0.2) * 0.2;

      const dx = bx - mouse.x * 6;
      const dy = by - mouse.y * 3.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const bulge = Math.max(0, 1.6 - dist * 0.5) * 0.9;

      posAttr.setZ(i, wave + bulge);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    fabric.rotation.y = mouse.x * 0.08;
    fabric.rotation.x = -0.15 + mouse.y * 0.04;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener("resize", () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
})();
