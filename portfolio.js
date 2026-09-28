const chapters = Array.from(document.querySelectorAll(".chapter[data-chapter]"));
const railLinks = Array.from(document.querySelectorAll(".rail-nav a"));
const chapterCount = document.getElementById("chapter-count");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (value) => String(value).padStart(2, "0");

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

let activeChapter = -1;

function setActiveChapter(index) {
  if (index < 0 || index >= chapters.length || index === activeChapter) return;
  activeChapter = index;
  const active = chapters[index];
  document.body.dataset.scene = String(index);
  document.body.dataset.copySide = active.dataset.side || "left";
  chapterCount.textContent = pad(index + 1) + " / " + pad(chapters.length);

  chapters.forEach((chapter, chapterIndex) => {
    chapter.classList.toggle("is-current", chapterIndex === index);
  });
  railLinks.forEach((link, linkIndex) => {
    if (linkIndex === index) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
  });

  window.portfolioWorld?.setChapter(index, active.dataset.side || "left");
}

setActiveChapter(0);

if ("IntersectionObserver" in window) {
  const chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting);
    if (!visible.length) return;
    visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    setActiveChapter(Number(visible[0].target.dataset.chapter));
  }, { threshold: [0.14, 0.28, 0.45, 0.62, 0.8] });

  chapters.forEach((chapter) => chapterObserver.observe(chapter));
}

async function buildStoryWorld() {
  const canvas = document.getElementById("story-world");
  if (!canvas || !window.WebGLRenderingContext) return;

  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js");
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.innerWidth > 680,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 680 ? 1.2 : 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 80);
    camera.position.set(0, 0, 10);

    const hemisphere = new THREE.HemisphereLight(0xe6f0d9, 0x151914, 2.2);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xe3ffae, 3.2);
    keyLight.position.set(-2.5, 4, 6);
    scene.add(keyLight);
    const blueLight = new THREE.PointLight(0x7185ff, 19, 12, 2);
    blueLight.position.set(3, -1.5, 2);
    scene.add(blueLight);
    const greenLight = new THREE.PointLight(0xd8ff63, 24, 11, 2);
    greenLight.position.set(-2.5, 1.8, 3);
    scene.add(greenLight);

    const world = new THREE.Group();
    scene.add(world);
    const chapterScenes = [];

    function makeScene(index, scale) {
      const group = new THREE.Group();
      group.scale.setScalar(scale || 1);
      group.userData.opacity = 0;
      group.userData.targetOpacity = 0;
      group.userData.materials = [];
      group.userData.baseY = 0;
      world.add(group);
      chapterScenes[index] = group;
      return group;
    }

    function material(group, color, emissive, options) {
      const settings = options || {};
      const value = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissive || color,
        emissiveIntensity: settings.glow === undefined ? 0.13 : settings.glow,
        metalness: settings.metalness === undefined ? 0.54 : settings.metalness,
        roughness: settings.roughness === undefined ? 0.34 : settings.roughness,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        wireframe: settings.wireframe === true,
        side: THREE.DoubleSide
      });
      group.userData.materials.push(value);
      return value;
    }

    function lineMaterial(group, color, opacity) {
      const value = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false
      });
      value.userData.baseOpacity = opacity === undefined ? 0.8 : opacity;
      group.userData.materials.push(value);
      return value;
    }

    function addMesh(group, geometry, color, emissive, options, position) {
      const mesh = new THREE.Mesh(geometry, material(group, color, emissive, options));
      if (position) mesh.position.set(position[0], position[1], position[2]);
      group.add(mesh);
      return mesh;
    }

    function addLine(group, points, color, opacity, loop) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((point) => new THREE.Vector3(point[0], point[1], point[2]))
      );
      const line = loop
        ? new THREE.LineLoop(geometry, lineMaterial(group, color, opacity))
        : new THREE.Line(geometry, lineMaterial(group, color, opacity));
      group.add(line);
      return line;
    }

    function addRing(group, radius, tube, color, tilt, opacity) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false
      });
      ringMaterial.userData.baseOpacity = opacity === undefined ? 0.8 : opacity;
      group.userData.materials.push(ringMaterial);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 150),
        ringMaterial
      );
      ring.rotation.x = tilt[0];
      ring.rotation.y = tilt[1];
      ring.rotation.z = tilt[2];
      group.add(ring);
      return ring;
    }

    function roundedShape(width, height, radius) {
      const x = -width / 2;
      const y = -height / 2;
      const shape = new THREE.Shape();
      shape.moveTo(x + radius, y);
      shape.lineTo(x + width - radius, y);
      shape.quadraticCurveTo(x + width, y, x + width, y + radius);
      shape.lineTo(x + width, y + height - radius);
      shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      shape.lineTo(x + radius, y + height);
      shape.quadraticCurveTo(x, y + height, x, y + height - radius);
      shape.lineTo(x, y + radius);
      shape.quadraticCurveTo(x, y, x + radius, y);
      return shape;
    }

    function addDot(group, x, y, z, radius, color) {
      return addMesh(
        group,
        new THREE.SphereGeometry(radius, 14, 10),
        color,
        color,
        { glow: 0.72, metalness: 0.1, roughness: 0.2 },
        [x, y, z]
      );
    }

    function addOrigin() {
      const group = makeScene(0, 1.08);
      addMesh(group, new THREE.IcosahedronGeometry(1.06, 2), 0x4a523e, 0x9aba53, { glow: 0.26, metalness: 0.7, roughness: 0.24 });
      addMesh(group, new THREE.IcosahedronGeometry(1.09, 1), 0xe4edda, 0xd8ff63, { glow: 0.12, metalness: 0.18, roughness: 0.28, wireframe: true });
      addRing(group, 1.78, 0.011, 0xd8ff63, [0.9, 0.26, 0.18], 0.86);
      addRing(group, 2.2, 0.008, 0x7185ff, [1.26, -0.4, -0.6], 0.58);
      addRing(group, 1.46, 0.006, 0xf2f1e9, [0.34, 1.04, 0.2], 0.4);
      [[1.86,0.42,0.1],[0.24,-1.72,0.8],[-1.5,0.88,-0.4],[0.7,1.52,-0.6]].forEach((p, i) => addDot(group,p[0],p[1],p[2],i===0?0.075:0.045,i%2?0x7185ff:0xd8ff63));
      return group;
    }

    function addResumeScene() {
      const group = makeScene(1, 1.03);
      const paperShape = roundedShape(2.35, 3.1, 0.08);
      const paper = addMesh(group, new THREE.ExtrudeGeometry(paperShape, { depth: 0.11, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 8 }), 0xdedfd4, 0x20251c, { glow: 0.03, metalness: 0.08, roughness: 0.68 }, [-0.35,-0.05,0]);
      paper.rotation.y = -0.22;
      paper.rotation.x = -0.08;
      for (let i = 0; i < 6; i += 1) {
        const width = i === 0 ? 1.23 : 0.73 + ((i * 17) % 5) * 0.12;
        addMesh(group, new THREE.BoxGeometry(width, 0.025, 0.02), i === 0 ? 0x899d50 : 0x889083, 0x37432e, { glow: 0.05, metalness: 0.02, roughness: 0.8 }, [-0.37 + (width - 1.2) / 2,-0.35 - i * 0.29,0.15]);
      }
      addMesh(group, new THREE.TorusGeometry(0.53, 0.055, 12, 80), 0xd8ff63, 0xd8ff63, { glow: 0.85, metalness: 0.35 }, [1.07,0.65,0.6]).rotation.x = 0.34;
      addMesh(group, new THREE.SphereGeometry(0.46, 24, 16), 0x7388ff, 0x7185ff, { glow: 0.56, metalness: 0.05, roughness: 0.18 }, [1.07,0.65,0.35]);
      addRing(group, 1.92, 0.009, 0xd8ff63, [0.8,0.4,0.15], 0.72);
      addLine(group, [[-1.5,-1.8,0.2],[0.1,-0.8,0.2],[0.8,0.1,0.2],[1.5,0.5,0.2]], 0x7185ff, 0.6, false);
      [[-1.5,-1.8,0.2],[0.1,-0.8,0.2],[0.8,0.1,0.2],[1.5,0.5,0.2]].forEach((p) => addDot(group,p[0],p[1],p[2],0.065,0xd8ff63));
      return group;
    }

    function addVideoScene() {
      const group = makeScene(2, 1.05);
      const phoneShape = roundedShape(2.26, 3.95, 0.22);
      const phone = addMesh(group, new THREE.ExtrudeGeometry(phoneShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 4, curveSegments: 12 }), 0x252b29, 0x5c673e, { glow: 0.12, metalness: 0.78, roughness: 0.24 }, [0.45,-0.08,0]);
      phone.rotation.y = 0.16;
      phone.rotation.z = -0.04;
      addMesh(group, new THREE.PlaneGeometry(1.86,3.15), 0x101612, 0x172417, { glow: 0.18, metalness: 0.1, roughness: 0.4 }, [0.45,0.02,0.21]);
      addMesh(group, new THREE.PlaneGeometry(0.58,1.56), 0x54633e, 0x88a344, { glow: 0.22, metalness: 0.05, roughness: 0.56 }, [0.45,0.45,0.23]);
      addRing(group, 0.18, 0.016, 0xd8ff63, [0,0,0], 0.92).position.set(0.45,1.53,0.26);
      addMesh(group, new THREE.BoxGeometry(3.45,1.16,0.14), 0x262d27, 0x303a2a, { glow: 0.14, metalness: 0.62 }, [-0.7,-1.68,0.35]);
      for (let i = 0; i < 5; i += 1) {
        addMesh(group, new THREE.BoxGeometry(0.38 + (i % 2) * 0.16,0.25,0.11), i % 2 ? 0x7185ff : 0xd8ff63, i % 2 ? 0x7185ff : 0xd8ff63, { glow: 0.42, metalness: 0.26 }, [-2.02 + i * 0.68,-1.44,0.47]);
      }
      addMesh(group, new THREE.BoxGeometry(0.018,0.92,0.035), 0xf2f1e9, 0xd8ff63, { glow: 0.9 }, [-0.25,-1.68,0.57]);
      addRing(group, 2.24, 0.008, 0x7185ff, [0.94,0.22,0.1], 0.56);
      return group;
    }

    function addGlobeScene() {
      const group = makeScene(3, 1.1);
      addMesh(group, new THREE.SphereGeometry(1.48,32,24), 0x27362d, 0x304925, { glow: 0.32, metalness: 0.24, roughness: 0.48, wireframe: true });
      addMesh(group, new THREE.SphereGeometry(1.43,28,22), 0x17211a, 0x314522, { glow: 0.18, metalness: 0.54, roughness: 0.34 });
      for (let i = 0; i < 4; i += 1) {
        const ring = addRing(group, 1.57 + i * 0.03, 0.006, i % 2 ? 0x7185ff : 0xd8ff63, [0.32 + i * 0.38,0.14 + i * 0.56,0.18], i === 0 ? 0.9 : 0.42);
        ring.scale.y = 0.78 + i * 0.07;
      }
      const arcs = [
        [[-1.05,0.45,0.85],[-0.38,0.98,1.03],[0.43,0.63,1.31],[1.06,0.27,0.88]],
        [[-0.9,-0.66,0.9],[-0.26,-0.18,1.37],[0.52,-0.32,1.31],[1.02,-0.76,0.83]],
        [[-0.55,1.22,0.46],[0.04,0.8,1.18],[0.45,0.34,1.44],[0.78,-0.25,1.31]]
      ];
      arcs.forEach((arc,index) => {
        const curve = new THREE.CatmullRomCurve3(arc.map((p) => new THREE.Vector3(p[0],p[1],p[2])));
        const points = curve.getPoints(42).map((p) => [p.x,p.y,p.z]);
        addLine(group,points,index === 1 ? 0x7185ff : 0xd8ff63,0.75,false);
        const end = arc[arc.length - 1];
        addDot(group,end[0],end[1],end[2],0.08,index === 1 ? 0x7185ff : 0xd8ff63);
      });
      [[-1.5,0.1,0.2],[1.48,0.64,-0.2],[0.2,-1.56,0.3]].forEach((p) => addDot(group,p[0],p[1],p[2],0.06,0xf2f1e9));
      return group;
    }

    function addDatabaseScene() {
      const group = makeScene(4, 1.12);
      const colors = [0x44513b,0x30392e,0x66774a,0x333c47,0x7185ff];
      for (let i = 0; i < 6; i += 1) {
        const layer = addMesh(group, new THREE.CylinderGeometry(1.16 - i * 0.035,1.16 - i * 0.035,0.28,56,1,false), colors[i % colors.length], i === 4 ? 0x7185ff : 0x78904c, { glow: i === 4 ? 0.34 : 0.14, metalness: 0.7, roughness: 0.31 }, [0,1.04 - i * 0.37,0]);
        layer.rotation.y = i * 0.12;
        addRing(group,1.16 - i * 0.035,0.018,i === 4 ? 0x7185ff : 0xd8ff63,[Math.PI/2,0,0],0.74).position.y = 1.18 - i * 0.37;
      }
      for (let i = 0; i < 16; i += 1) {
        const angle = i * Math.PI / 8;
        const x = Math.cos(angle) * 1.22;
        const z = Math.sin(angle) * 1.22;
        addDot(group,x,-0.2 + (i % 4) * 0.12,z,0.035,i % 3 ? 0xd8ff63 : 0x7185ff);
      }
      addLine(group,[[-2.05,-1.3,0],[0,-2.1,0],[2.05,-1.3,0]],0x7185ff,0.45,false);
      return group;
    }

    function addTrialScene() {
      const group = makeScene(5, 1.1);
      const steps = [[-2,-1.35,0],[-1.22,-0.78,0.15],[-0.43,-0.2,-0.08],[0.38,0.37,0.12],[1.17,0.94,-0.06],[1.95,1.51,0.16]];
      steps.forEach((p,index) => {
        const block = addMesh(group,new THREE.BoxGeometry(0.82,0.62,0.72),index === 5 ? 0xd8ff63 : 0x364232,index === 5 ? 0xd8ff63 : 0x7185ff,{glow:index === 5 ? 0.52 : 0.12,metalness:0.52,roughness:0.32},p);
        block.rotation.y = (index % 2 ? -1 : 1) * 0.12;
        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry),lineMaterial(group,0xe3eadb,index === 5 ? 0.95 : 0.44));
        outline.position.copy(block.position);
        outline.rotation.copy(block.rotation);
        group.add(outline);
      });
      const pathPoints = steps.map((p) => [p[0],p[1],p[2] + 0.45]);
      addLine(group,pathPoints,0xd8ff63,0.72,false);
      addRing(group,2.8,0.008,0x7185ff,[1.25,0.4,-0.2],0.48);
      return group;
    }

    function addToolkitScene() {
      const group = makeScene(6, 1.07);
      addMesh(group,new THREE.TorusKnotGeometry(0.88,0.055,180,12,2,5),0x70834b,0xd8ff63,{glow:0.36,metalness:0.74,roughness:0.22});
      addRing(group,1.6,0.012,0xd8ff63,[0.62,0.18,0.28],0.8);
      addRing(group,2.04,0.008,0x7185ff,[1.2,0.5,-0.3],0.56);
      const nodes = [[-1.85,0.2,0.3],[-0.98,1.56,-0.3],[0.45,1.82,0.2],[1.86,0.75,-0.1],[1.56,-1.25,0.3],[0.02,-1.9,-0.2],[-1.55,-1.05,0.2]];
      nodes.forEach((p,index) => {
        addDot(group,p[0],p[1],p[2],index % 3 === 0 ? 0.09 : 0.055,index % 2 ? 0x7185ff : 0xd8ff63);
        const next = nodes[(index + 1) % nodes.length];
        addLine(group,[p,next],0x9cac80,0.32,false);
      });
      return group;
    }

    function addSpiralScene() {
      const group = makeScene(7, 1.13);
      const knot = addMesh(group,new THREE.TorusKnotGeometry(1.12,0.085,260,14,2,3),0x566640,0xd8ff63,{glow:0.52,metalness:0.76,roughness:0.2});
      knot.rotation.set(0.36,0.16,-0.22);
      addMesh(group,new THREE.TorusKnotGeometry(0.59,0.035,180,10,3,5),0x56627c,0x7185ff,{glow:0.5,metalness:0.55,roughness:0.25},[0.08,0,0.16]);
      addRing(group,2.16,0.008,0xf2f1e9,[0.78,0.32,0.06],0.5);
      for (let i = 0; i < 9; i += 1) {
        const angle = i * Math.PI * 2 / 9;
        const x = Math.cos(angle) * (1.72 + (i % 2) * 0.23);
        const y = Math.sin(angle) * (1.55 + (i % 2) * 0.18);
        addDot(group,x,y,Math.sin(angle * 2) * 0.4,0.045,i % 3 ? 0xd8ff63 : 0x7185ff);
      }
      return group;
    }

    function addAfterwordScene() {
      const group = makeScene(8, 1.1);
      addMesh(group,new THREE.OctahedronGeometry(1.12,2),0x607046,0xd8ff63,{glow:0.48,metalness:0.55,roughness:0.21});
      addMesh(group,new THREE.OctahedronGeometry(1.15,0),0xe7edde,0x9eb969,{glow:0.22,metalness:0.22,roughness:0.3,wireframe:true});
      addRing(group,1.72,0.012,0xd8ff63,[0.82,0.16,0.42],0.85);
      addRing(group,2.14,0.008,0x7185ff,[1.3,0.6,-0.24],0.59);
      addRing(group,1.42,0.007,0xf2f1e9,[0.24,1.12,0.1],0.38);
      const orbit = [[-2,0.2,0],[1.88,0.62,0.1],[0.22,-1.8,0.2],[-1.1,1.53,-0.2]];
      orbit.forEach((p,index) => addDot(group,p[0],p[1],p[2],0.06,index % 2 ? 0x7185ff : 0xd8ff63));
      return group;
    }

    addOrigin();
    addResumeScene();
    addVideoScene();
    addGlobeScene();
    addDatabaseScene();
    addTrialScene();
    addToolkitScene();
    addSpiralScene();
    addAfterwordScene();

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(720 * 3);
    for (let i = 0; i < dustPositions.length; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 12;
      dustPositions[i + 1] = (Math.random() - 0.5) * 8;
      dustPositions[i + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    dustGeometry.setAttribute("position",new THREE.BufferAttribute(dustPositions,3));
    const dust = new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xb3c2a4,size:0.018,transparent:true,opacity:0.48,sizeAttenuation:true,depthWrite:false}));
    scene.add(dust);

    let targetWorldX = 1.4;
    let targetWorldY = 0;
    let currentChapter = 0;
    let lastFrame = 0;
    const opacityEase = prefersReducedMotion ? 1 : 0.055;

    function setChapter(index, side) {
      currentChapter = index;
      chapterScenes.forEach((group, groupIndex) => {
        group.userData.targetOpacity = groupIndex === index ? 1 : 0;
      });
      const smallScreen = window.innerWidth < 680;
      targetWorldX = smallScreen ? 0 : (side === "right" ? -1.55 : 1.55);
      targetWorldY = smallScreen ? -1.45 : -0.1;
    }

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,width < 680 ? 1.2 : 1.6));
      renderer.setSize(width,height,false);
      camera.aspect = width / height;
      camera.fov = width < 680 ? 43 : 36;
      camera.updateProjectionMatrix();
      if (width < 680) {
        targetWorldX = 0;
        targetWorldY = -1.45;
      } else {
        targetWorldX = document.body.dataset.copySide === "right" ? -1.55 : 1.55;
        targetWorldY = -0.1;
      }
    }

    window.addEventListener("resize",resize,{passive:true});
    window.portfolioWorld = { setChapter };

    setChapter(Number(document.body.dataset.scene || currentChapter),document.body.dataset.copySide || "left");
    resize();
    document.body.classList.add("has-webgl");

    function animate(time) {
      requestAnimationFrame(animate);
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000,0.05) : 0.016;
      lastFrame = time;
      const easing = prefersReducedMotion ? 1 : Math.min(1,delta * 3.4);
      world.position.x += (targetWorldX - world.position.x) * easing;
      world.position.y += (targetWorldY - world.position.y) * easing;
      camera.position.x += ((window.innerWidth < 680 ? 0 : (document.body.dataset.copySide === "right" ? -0.14 : 0.14)) - camera.position.x) * easing;
      chapterScenes.forEach((group,index) => {
        group.userData.opacity += (group.userData.targetOpacity - group.userData.opacity) * (prefersReducedMotion ? 1 : Math.max(opacityEase,delta * 2.6));
        const opacity = group.userData.opacity;
        group.visible = opacity > 0.012;
        group.userData.materials.forEach((value) => {
          value.opacity = opacity * (value.userData.baseOpacity === undefined ? 1 : value.userData.baseOpacity);
        });
        if (!prefersReducedMotion && opacity > 0.01) {
          group.rotation.y += delta * (index === currentChapter ? 0.11 : 0.045);
          group.rotation.x = Math.sin(time * 0.00022 + index) * 0.055;
          group.position.y = Math.sin(time * 0.0005 + index * 1.8) * 0.055;
        }
      });
      if (!prefersReducedMotion) dust.rotation.y += delta * 0.006;
      renderer.render(scene,camera);
    }

    requestAnimationFrame(animate);
  } catch (error) {
    document.body.classList.remove("has-webgl");
    console.warn("The 3D story scene could not be initialized; the illustrated fallback remains active.",error);
  }
}

buildStoryWorld();
