/* Procedural VX-07 airframe. Global THREE r160; no external assets. */
(function () {
  'use strict';
  window.createFighter = function () {
    const T = THREE;
    const group = new T.Group();
    group.name = 'VX-07';
    const engineLights = [], flames = [];
    const alloy = new T.MeshStandardMaterial({ color: 0x74838e, metalness: .48, roughness: .46 });
    const wingMat = new T.MeshStandardMaterial({ color: 0x667780, metalness: .45, roughness: .51 });
    const darkAlloy = new T.MeshStandardMaterial({ color: 0x35434c, metalness: .6, roughness: .45 });
    const gunmetal = new T.MeshStandardMaterial({ color: 0x202c32, metalness: .8, roughness: .36 });
    const rubber = new T.MeshStandardMaterial({ color: 0x0c1117, roughness: .94 });
    const chrome = new T.MeshStandardMaterial({ color: 0xa7b4bc, metalness: .85, roughness: .23 });
    const black = new T.MeshStandardMaterial({ color: 0x060b10, roughness: .9 });
    const panelMaterial = new T.LineBasicMaterial({ color: 0x263640, transparent: true, opacity: .58 });
    function mesh(geometry, material, parent = group) {
      const m = new T.Mesh(geometry, material);
      m.castShadow = m.receiveShadow = true;
      parent.add(m); return m;
    }
    function line(points, material = panelMaterial, parent = group) {
      const l = new T.Line(new T.BufferGeometry().setFromPoints(points.map(p => new T.Vector3(...p))), material);
      parent.add(l); return l;
    }
    function rod(a, b, radius, material, parent = group) {
      const va = new T.Vector3(...a), vb = new T.Vector3(...b), delta = vb.clone().sub(va);
      const r = mesh(new T.CylinderGeometry(radius, radius, delta.length(), 10), material, parent);
      r.position.copy(va.add(vb).multiplyScalar(.5));
      r.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
      return r;
    }
    function loft(stations, material, sides = 16) {
      const vertices = [], indices = [];
      stations.forEach(([x, halfWidth, halfHeight, y]) => {
        for (let j = 0; j < sides; j++) {
          const a = j * Math.PI * 2 / sides;
          // Slightly flattened shoulder cross-section gives a machined airframe silhouette.
          vertices.push(x, y + Math.sin(a) * halfHeight, Math.cos(a) * halfWidth);
        }
      });
      for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < sides; j++) {
        const a = i * sides + j, b = i * sides + (j + 1) % sides, c = a + sides, d = b + sides;
        indices.push(a, b, c, b, d, c);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices); geo.computeVertexNormals();
      return mesh(geo, material);
    }
    // The radome and body use separate lofts so the nose seam reads at every angle.
    loft([[8.65, .015, .02, .13], [7.75, .19, .2, .14], [6.8, .43, .34, .15], [5.55, .68, .48, .15]], darkAlloy);
    loft([[5.56, .68, .48, .15], [4.2, .9, .57, .16], [2.8, 1.03, .64, .12], [.8, 1.29, .65, .03], [-1.5, 1.4, .6, -.02], [-3.6, 1.36, .58, -.02], [-5.6, 1.21, .51, .0], [-6.7, .99, .42, -.03]], alloy);
    // Sharp chines continue from the nose into the blended wing root.
    for (const s of [-1, 1]) {
      const chines = new T.Shape();
      [[5.6, s * .53], [3.7, s * 1.12], [-2.4, s * 1.77], [-5.8, s * 1.15], [1.9, s * .68]].forEach(([x,z],i) => i ? chines.lineTo(x,z) : chines.moveTo(x,z));
      chines.closePath();
      const geo = new T.ExtrudeGeometry(chines, {depth:.09, bevelEnabled:false});
      geo.rotateX(Math.PI/2);
      mesh(geo, alloy).position.y = .21;
      line([[6.3,.27,s*.51],[4.4,.32,s*.82],[2,.28,s*1.15],[-2.1,.2,s*1.36],[-5.1,.14,s*1.2]]);
    }
    function wing(points, y, material) {
      const shape = new T.Shape();
      points.forEach(([x,z],i) => i ? shape.lineTo(x,z) : shape.moveTo(x,z));
      shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, {depth:.12, bevelEnabled:true, bevelThickness:.025, bevelSize:.055, bevelSegments:1, steps:1});
      geo.rotateX(Math.PI/2);
      const m = mesh(geo, material); m.position.y = y; return m;
    }
    for (const s of [-1, 1]) {
      wing([[1.65,s*.9],[-2.75,s*5.56],[-5.32,s*5.18],[-4.0,s*1.05]], .08, wingMat);
      // Leading edge metal and trailing-edge elevon seams.
      line([[1.6,.13,s*.96],[-2.76,.13,s*5.55]], new T.LineBasicMaterial({color:0xa9b6bd,transparent:true,opacity:.65}));
      line([[-1.83,.145,s*4.35],[-3.19,.145,s*4.18],[-4.18,.145,s*1.5]]);
      line([[-4.6,.145,s*5.29],[-3.57,.145,s*3.68],[-2.75,.145,s*3.85]]);
      line([[-3.57,.145,s*3.68],[-4.55,.145,s*1.45]]);
      wing([[-4.85,s*.9],[-6.08,s*3.35],[-8.05,s*3.13],[-7.1,s*.85]], .29, wingMat);
      line([[-6.88,.34,s*3.24],[-6.2,.34,s*1.08]]);
      // Canted twin tails, with charcoal tip panels.
      const fin = new T.Shape();
      fin.moveTo(-7.26,.12);fin.lineTo(-4.1,.12);fin.lineTo(-5.15,2.65);fin.lineTo(-5.87,2.81);fin.lineTo(-7.48,.52);fin.closePath();
      const fg = new T.ExtrudeGeometry(fin,{depth:.1,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1});
      const f = mesh(fg, wingMat); f.position.set(0,.27,s*1.02); f.rotation.x=s*.24;
      const finLines = new T.Group(); finLines.position.copy(f.position); finLines.rotation.copy(f.rotation);group.add(finLines);
      line([[-6.89,.45,.13],[-5.62,2.58,.13]], panelMaterial, finLines);
      line([[-5.24,2.43,.13],[-5.92,2.57,.13]], new T.LineBasicMaterial({color:0xe0ac5d}),finLines);
    }
    // Long, low bubble canopy and the dark sill beneath it.
    const sill = mesh(new T.SphereGeometry(1,32,16), darkAlloy);sill.scale.set(2.05,.36,.69);sill.position.set(3.32,.55,0);
    const canopyMat = new T.MeshPhysicalMaterial({color:0x88b5ba,metalness:.62,roughness:.13,clearcoat:1,clearcoatRoughness:.1,transparent:true,opacity:.82,side:T.DoubleSide});
    const canopy = mesh(new T.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI*.55),canopyMat);
    canopy.scale.set(1.82,.77,.59);canopy.position.set(3.29,.72,0);
    // A thin rear hoop and windscreen frame preserve the canopy silhouette.
    const rimPoints=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;rimPoints.push([3.29+Math.cos(a)*1.82,.72,Math.sin(a)*.59]);}line(rimPoints,new T.LineBasicMaterial({color:0x293b46}));
    const hoop=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;hoop.push([2.16,.74+Math.sin(a)*.6,Math.cos(a)*.49]);}line(hoop,new T.LineBasicMaterial({color:0x3b4d55}));
    const cockpit = mesh(new T.BoxGeometry(.46,.45,.38),black);cockpit.position.set(2.87,.83,0);cockpit.rotation.z=.15;
    const helmet = mesh(new T.SphereGeometry(.17,12,10),gunmetal);helmet.position.set(3.02,1.18,0);
    // Side intakes: angled outer lips and deep black ducts.
    for(const s of [-1,1]){
      const inlet = mesh(new T.BoxGeometry(1.66,.7,.63),darkAlloy);inlet.position.set(.82,-.27,s*1.06);inlet.rotation.y=s*-.11;
      const hole = mesh(new T.PlaneGeometry(.54,.55),black);hole.rotation.y=Math.PI/2;hole.position.set(1.67,-.25,s*1.12);
      const lip = mesh(new T.BoxGeometry(.1,.74,.7),alloy);lip.position.set(1.61,-.25,s*1.08);
      // Upper fuselage service panels and vent slats.
      for(let i=0;i<7;i++){
        const vent = mesh(new T.BoxGeometry(.045,.012,.38),gunmetal);vent.position.set(-1.25-i*.13,.58,s*.65);vent.rotation.y=s*.16;
      }
      line([[-.8,.57,s*.92],[-2.7,.54,s*.94],[-3.55,.44,s*.58]]);
      line([[.05,-.26,s*1.32],[-2.7,-.28,s*1.38],[-3.2,-.1,s*1.34]]);
    }
    // Twin engines, dark exhaust vanes, concentric nozzle rings and visible hot cores.
    const flameUniforms = { uTime: { value: 0 }, uThrust: { value: 1 } };
    // One translucent volume per nozzle. Facing-angle falloff erases hard
    // geometry edges; moving turbulence and axial pulses shape the hot gas.
    const flameMaterial = new T.ShaderMaterial({
      uniforms: flameUniforms,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      side: T.FrontSide, toneMapped: false,
      vertexShader: `
        uniform float uTime;
        varying vec2 vFlameUV;
        varying vec3 vViewNormal;
        varying vec3 vToCamera;
        void main() {
          vFlameUV = uv;
          vec3 p = position;
          float ripple = 1.0 + sin(uv.y * 41.0 - uTime * 33.0 + uv.x * 12.566) * 0.045
                             + sin(uv.y * 23.0 - uTime * 21.0) * 0.035;
          p.xz *= ripple;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vViewNormal = normalize(normalMatrix * normal);
          vToCamera = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform float uThrust;
        varying vec2 vFlameUV;
        varying vec3 vViewNormal;
        varying vec3 vToCamera;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                     mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
        }
        void main() {
          float axial = vFlameUV.y;
          float face = max(0.0, dot(normalize(vViewNormal), normalize(vToCamera)));
          float wisps = noise(vec2(vFlameUV.x * 9.0 + sin(axial * 17.0) * .5,
                                   axial * 13.0 - uTime * 4.2));
          float fine = noise(vec2(vFlameUV.x * 21.0, axial * 36.0 - uTime * 8.0));
          float diamonds = pow(.5 + .5 * cos(axial * 42.0 - .45), 6.0);
          float endFade = 1.0 - smoothstep(.55 + wisps * .14, 1.0, axial);
          float density = pow(face, 1.65) * endFade * (.35 + .65 * wisps) * (.8 + .2 * fine);
          density *= smoothstep(0.0, .025, axial) * (.7 + diamonds * .3);
          vec3 blue = vec3(.025, .16, .8);
          vec3 orange = vec3(1.1, .20, .008);
          vec3 color = mix(blue, orange, smoothstep(.10, .31, axial));
          color = mix(color, vec3(1.35, .36, .035), diamonds * face * .22 * smoothstep(.1,.3,axial));
          float alpha = density * (.48 + min(uThrust, 1.0) * .23);
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }`
    });
    const engineCoreMat = new T.MeshBasicMaterial({color:0xff8c29});
    for(const s of [-1,1]){
      const z = s*.65;
      const nacelle = mesh(new T.CylinderGeometry(.46,.55,2.25,24,1,true),darkAlloy);nacelle.rotation.z=Math.PI/2;nacelle.position.set(-5.72,-.08,z);
      const nozzle = mesh(new T.CylinderGeometry(.46,.4,.82,24,1,true),gunmetal);nozzle.rotation.z=Math.PI/2;nozzle.position.set(-7.14,-.08,z);
      const core = mesh(new T.CircleGeometry(.32,24),engineCoreMat);core.rotation.y=-Math.PI/2;core.position.set(-7.56,-.08,z);
      for(let ring=0;ring<3;ring++){
        const torus = mesh(new T.TorusGeometry(.435-ring*.006,.025,5,24),chrome);torus.rotation.y=Math.PI/2;torus.position.set(-6.85-ring*.27,-.08,z);
      }
      for(let i=0;i<14;i++){
        const a=i/14*Math.PI*2;
        rod([-6.78,-.08+Math.cos(a)*.45,z+Math.sin(a)*.45],[-7.52,-.08+Math.cos(a)*.39,z+Math.sin(a)*.39],.018,gunmetal);
      }
      const plume = new T.Group();plume.position.set(-7.57,-.08,z);group.add(plume);flames.push(plume);
      const flameLength=4.7;
      const flameGeometry=new T.ConeGeometry(.47,flameLength,32,32,true);
      // A curved taper prevents the plume reading as a straight-sided arrow.
      const fp=flameGeometry.attributes.position, fu=flameGeometry.attributes.uv;
      for(let i=0;i<fp.count;i++){
        const axial=fu.getY(i), taper=Math.pow(Math.max(.001,1-axial),.58);
        const oldRadius=1-axial;
        if(oldRadius>.0001){fp.setX(i,fp.getX(i)*taper/oldRadius);fp.setZ(i,fp.getZ(i)*taper/oldRadius);}
      }
      flameGeometry.computeVertexNormals();
      const flame=mesh(flameGeometry,flameMaterial,plume);flame.rotation.z=Math.PI/2;flame.position.x=-flameLength/2;flame.castShadow=false;flame.receiveShadow=false;
      const light=new T.PointLight(0xff7a21,4,14,2);light.position.set(-8,-.05,z);group.add(light);engineLights.push(light);
    }
    // Readable squadron graphics, drawn locally; no asset requests.
    function decalTexture(text,subtext){
      const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
      ctx.clearRect(0,0,512,256);ctx.fillStyle='#d0dce0';ctx.textAlign='center';ctx.font='bold 150px Arial';ctx.fillText(text,256,158);ctx.fillStyle='#f0b86b';ctx.font='bold 26px Arial';ctx.fillText(subtext,256,208);
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
    }
    const numberTexture=decalTexture('07','AFTERBURN');
    const markMaterial=new T.MeshBasicMaterial({map:numberTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:T.DoubleSide});
    for(const s of [-1,1]){
      const badge=mesh(new T.PlaneGeometry(.94,.47),markMaterial);badge.position.set(4.45,.04,s*.88);badge.rotation.y=s<0?Math.PI:0;badge.castShadow=false;
      const tail=mesh(new T.PlaneGeometry(.88,.44),markMaterial);tail.position.set(-5.55,1.3,s*1.4);tail.rotation.y=s<0?Math.PI:0;tail.rotation.x=s*.24;tail.castShadow=false;
      const stripe=mesh(new T.BoxGeometry(.68,.016,.12),new T.MeshStandardMaterial({color:0xe9b46f,roughness:.5}));stripe.position.set(-3.37,.17,s*4.7);stripe.rotation.y=s*.4;
    }
    // Wheel assemblies retract together into belly; wheels roll on takeoff.
    const gear=new T.Group();gear.name='Landing gear';group.add(gear);
    const wheels=[];
    function wheel(x,y,z,r){
      const tire=mesh(new T.CylinderGeometry(r,r,.2,20),rubber,gear);tire.rotation.x=Math.PI/2;tire.position.set(x,y,z);wheels.push(tire);
      const hub=mesh(new T.CylinderGeometry(r*.5,r*.5,.212,12),chrome,gear);hub.rotation.x=Math.PI/2;hub.position.copy(tire.position);
      const inner=mesh(new T.CylinderGeometry(r*.22,r*.22,.218,10),gunmetal,gear);inner.rotation.x=Math.PI/2;inner.position.copy(tire.position);
    }
    rod([4.0,-.28,0],[4.0,-1.18,0],.065,chrome,gear);
    rod([3.3,-.38,0],[3.97,-.99,0],.042,chrome,gear);
    wheel(4.02,-1.24,0,.26);
    for(const s of [-1,1]){
      rod([-1.5,-.38,s*.8],[-1.8,-1.1,s*1.4],.08,chrome,gear);
      rod([-.9,-.3,s*1.0],[-1.8,-.94,s*1.4],.047,darkAlloy,gear);
      rod([-1.8,-1.1,s*1.4],[-1.8,-1.1,s*1.7],.075,chrome,gear);
      wheel(-1.8,-1.18,s*1.65,.32);
      const door=mesh(new T.BoxGeometry(.65,.1,.42),alloy,gear);door.position.set(-1.35,-.57,s*1.16);door.rotation.x=s*.6;
    }
    // Position lights and aerials.
    const navs=[];
    for(const s of [-1,1]){
      const nav=mesh(new T.SphereGeometry(.065,8,6),new T.MeshBasicMaterial({color:s>0?0xff3048:0x52ffbc}));nav.position.set(-2.91,.13,s*5.54);navs.push(nav);
      const navLight = new T.PointLight(s>0?0xff3048:0x52ffbc,.45,2);navLight.position.copy(nav.position);group.add(navLight);
    }
    const beacon=mesh(new T.SphereGeometry(.06,8,6),new T.MeshBasicMaterial({color:0xffffff}));beacon.position.set(-2.2,.64,0);
    const antenna = mesh(new T.ConeGeometry(.08,.42,4),darkAlloy);antenna.position.set(-1.3,.77,0);antenna.rotation.z=.2;
    rod([8.65,.13,0],[9.05,.13,0],.012,chrome);
    function update(time, throttle=1, gearRetraction=0){
      const thrust=T.MathUtils.clamp(throttle,0,1.5);
      flameUniforms.uTime.value=time;flameUniforms.uThrust.value=thrust;
      const flicker=1+Math.sin(time*79)*.035+Math.sin(time*117)*.045;
      flames.forEach((f,i)=>{f.visible=thrust>.03;f.scale.set((.24+thrust*.9)*flicker, .6+thrust*.4,.6+thrust*.4);f.rotation.x=Math.sin(time*45+i)*.035;});
      engineLights.forEach(l=>{l.intensity=(.4+thrust*5)*flicker;});
      const retraction=T.MathUtils.clamp(gearRetraction,0,1);
      gear.position.y=retraction*.9;gear.scale.y=Math.max(.02,1-retraction);gear.visible=retraction<.98;
      wheels.forEach(w=>{w.rotation.y=time*thrust*14;});
      beacon.visible=Math.sin(time*7)>.78;
    }
    update(0,.1,0);
    return {group,engineLights,flames,gear,update};
  };
})();
