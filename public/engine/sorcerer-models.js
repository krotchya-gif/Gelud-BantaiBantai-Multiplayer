// Visual rig builder. Canonical stats and skills live in character-roster.js
// and shared/data/characters.js. +Z is forward, feet rest at Y=0.
var GBH_CHARACTER_DESIGNS = Object.freeze({
  gojo: Object.freeze({ id: 'gojo', name: 'Gojo', visual: 'sorcerer',
    palette: { body: 0x171b28, dark: 0x10121c, accent: 0x345bff, skin: 0xeac4b3 } }),
  sukuna: Object.freeze({ id: 'sukuna', name: 'Sukuna', visual: 'sorcerer',
    palette: { body: 0x21191f, dark: 0x101116, accent: 0x9e2437, skin: 0xd6a18c } }),
});

function buildSorcererBrawler(def, hueShift = 0) {
  const red = def.id === 'sukuna';
  const key = `${def.id}-redesign-v1`;
  const mats = {
    coat: lu(def.palette.body, { roughness: 0.38, metalness: 0.12, side: 2 }),
    cloth: lu(def.palette.dark, { roughness: 0.82 }),
    leather: lu(0x090c12, { roughness: 0.36 }),
    lining: lu(def.palette.accent, { roughness: 0.52, metalness: 0.1, side: 2 }),
    skin: lu(def.palette.skin, { roughness: 0.72 }),
    skinShade: lu(red ? 0xb97562 : 0xcd9b8d, { roughness: 0.78 }),
    metal: lu(0xa4adbf, { metalness: 0.72, roughness: 0.28 }),
    sole: lu(0xc9ccd4, { roughness: 0.72 }),
    hair: lu(red ? 0x191520 : 0xe6e7f2, { roughness: 0.5 }),
    hairShade: lu(red ? 0x54212e : 0xaaaec9, { roughness: 0.6 }),
    ink: lu(red ? 0x8c142b : 0xaeb8d7, { roughness: 0.62, side: 2 }),
    eye: lu(red ? 0xf7653c : 0x57cfff, { emissive: red ? 0xb52618 : 0x0083cd, emissiveIntensity: 0.35 }),
    white: lu(0xf3dfd5),
    blueGlow: lu(0x346dff, { emissive: 0x164cff, emissiveIntensity: 2.4, roughness: 0.25 }),
    redGlow: lu(0xff384f, { emissive: 0xff1233, emissiveIntensity: 2.4, roughness: 0.25 }),
    fireGlow: lu(0xff5a26, { emissive: 0xff3b14, emissiveIntensity: 3.1, roughness: 0.22 }),
    fireCore: lu(0xffd66e, { emissive: 0xff8b24, emissiveIntensity: 3.4, roughness: 0.2 }),
  };
  if (hueShift) mats.coat.color.offsetHSL(hueShift, 0, 0);
  const root = new ut(), body = new ut(), head = new ut(), weapon = new ut();
  root.name = `${def.name}-redesign`;
  root.userData.visual = 'sorcerer';
  root.add(body);
  body.add(head, weapon);
  head.position.y = 1.475;
  const parts = [], clothPivots = [], elbows = [], wrists = [], energy = [];
  const mesh = (parent, name, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const part = new Ln(geometry, material);
    part.name = name;
    part.position.set(x, y, z);
    part.scale.set(sx, sy, sz);
    part.castShadow = !name.startsWith('energy') && !/eye|iris|pupil|face-mark|nose|mouth|smile/.test(name);
    part.receiveShadow = part.castShadow;
    parent.add(part);
    parts.push(name);
    return part;
  };
  const box = (p, name, m, size, at, rz = 0) => {
    const part = mesh(p, name, ru(...size), m, ...at);
    part.rotation.z = rz;
    return part;
  };
  const oval = (p, name, m, radius, at, scale = [1, 1, 1]) => mesh(p, name, eu(radius, 12, 8), m, ...at, ...scale);
  const link = (p, name, m, from, to, radius = 0.009, tip = radius, segments = 6) => {
    const a = new H(...from), b = new H(...to), direction = b.clone().sub(a);
    const part = mesh(p, name, nu(tip, radius, direction.length(), segments), m);
    part.position.copy(a.add(b).multiplyScalar(0.5));
    part.quaternion.setFromUnitVectors(new H(0, 1, 0), direction.normalize());
    return part;
  };
  const path = (p, name, m, points, radius = 0.006) => {
    for (let i = 1; i < points.length; i++) link(p, name, m, points[i - 1], points[i], radius);
  };
  const buckle = (p, at, width = 0.048, height = 0.043) => {
    const [x, y, z] = at;
    path(p, 'silver-buckle', mats.metal, [[x-width/2,y-height/2,z],[x+width/2,y-height/2,z],
      [x+width/2,y+height/2,z],[x-width/2,y+height/2,z],[x-width/2,y-height/2,z]], 0.004);
    link(p, 'buckle-pin', mats.metal, [x,y-height/2,z+0.002], [x,y+height/2,z+0.002], 0.003);
  };
  const tag = (p, x, y, z, triangle = false) => {
    if (triangle) {
      path(p, 'triangular-metal-tag', mats.metal, [[x-0.026,y,z],[x+0.026,y,z],[x,y-0.085,z],[x-0.026,y,z]],0.005);
      link(p, 'tag-inset', mats.ink, [x-0.014,y-0.012,z], [x,y-0.051,z], 0.003);
    } else {
      box(p, 'etched-metal-tag', mats.metal, [0.04,0.095,0.009], [x,y-0.04,z]);
      path(p, 'tag-engraving', mats.leather, [[x-0.013,y-0.004,z+0.006],[x+0.013,y-0.07,z+0.006],
        [x-0.013,y-0.07,z+0.006],[x+0.013,y-0.004,z+0.006]],0.0025);
    }
  };
  // All custom geometry has index/normal/uv, like the cached engine primitives.
  const surface = (name, rows) => $l(`${key}-${name}`, () => {
    const positions = rows.flat(2), uv = [], indices = [];
    for (let row = 0; row < rows.length; row++) {
      uv.push(0, row / (rows.length-1), 1, row / (rows.length-1));
      if (row < rows.length-1) {
        const i = row * 2;
        indices.push(i,i+1,i+2,i+1,i+3,i+2);
      }
    }
    const g = new pn();
    g.setAttribute('position', new en(positions,3));
    g.setAttribute('uv', new en(uv,2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });
  const tuftGeometry = (name, centers, widths) => $l(`${key}-${name}`, () => {
    const positions=[], uv=[], indices=[], count=7;
    centers.forEach((center,i) => {
      const before=new H(...centers[Math.max(0,i-1)]),after=new H(...centers[Math.min(centers.length-1,i+1)]);
      const tangent=after.sub(before).normalize();
      const across=new H().crossVectors(tangent,new H(0,0,1)).normalize();
      const depth=new H().crossVectors(across,tangent).normalize();
      for(let j=0;j<count;j++) {
        const angle=j*Math.PI*2/count;
        const offset=across.clone().multiplyScalar(Math.cos(angle)*widths[i]).addScaledVector(depth,Math.sin(angle)*widths[i]*0.44);
        positions.push(center[0]+offset.x,center[1]+offset.y,center[2]+offset.z);
        uv.push(j/count,i/(centers.length-1));
        if(i<centers.length-1){const a=i*count+j,b=i*count+(j+1)%count;indices.push(a,a+count,b,b,a+count,b+count);}
      }
    });
    const g=new pn();g.setAttribute('position',new en(positions,3));g.setAttribute('uv',new en(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  });

  // Adult silhouette: longer legs, narrow jaw and small head, sculpted torso.
  const torsoGeometry=$l(`${key}-sculpted-torso`,()=>{
    const rows=[[0.85,0.139,0.091],[0.94,0.151,0.1],[1.035,0.18,0.116],[1.145,red?0.222:0.204,0.124],[1.23,0.207,0.098],[1.272,0.105,0.075]];
    const positions=[],uv=[],indices=[],segments=24;
    rows.forEach(([y,w,d],i)=>{
      for(let j=0;j<=segments;j++){
        const angle=j/segments*Math.PI*2;
        positions.push(Math.sin(angle)*w,y,Math.cos(angle)*d);uv.push(j/segments,i/(rows.length-1));
        if(i<rows.length-1&&j<segments){const k=i*(segments+1)+j;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
      }
    });
    const g=new pn();g.setAttribute('position',new en(positions,3));g.setAttribute('uv',new en(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  });
  const torso = mesh(body,'fitted-torso',torsoGeometry,red?mats.skin:mats.coat);
  oval(body,'waist',red?mats.skin:mats.cloth,0.15,[0,0.86,0],[1,0.74,0.7]);
  link(body,'neck',mats.skin,[0,1.25,0],[0,1.4,0],0.068,0.064,10);
  if(red) {
    for(const s of [-1,1]) {
      oval(body,'pectoral',mats.skin,0.102,[s*0.081,1.157,0.077],[1.02,0.57,0.39]);
      for(let j=0;j<3;j++) oval(body,'abdominal-plane',mats.skin,0.05,[s*0.043,1.058-j*0.06,0.094-j*0.005],[0.9,0.51,0.30]);
      path(body,'crimson-chest-mark',mats.ink,[[s*0.04,1.235,0.098],[s*0.145,1.21,0.13],[s*0.102,1.16,0.146],
        [s*0.17,1.125,0.101],[s*0.113,1.078,0.124]],0.009);
      path(body,'crimson-rib-mark',mats.ink,[[s*0.144,1.03,0.076],[s*0.095,0.988,0.136],[s*0.122,0.953,0.102]],0.006);
    }
    link(body,'sternum-shadow',mats.skinShade,[0,1.18,0.135],[0,1.067,0.138],0.004);
  } else {
    // High split collar and crossed harness with exposed metal closures.
    for(const s of [-1,1]) {
      box(body,'standing-high-collar',mats.coat,[0.092,0.18,0.155],[s*0.074,1.318,0.005],s*-0.12);
      for(let j=0;j<3;j++) oval(body,'collar-stud',mats.metal,0.008,[s*0.066,1.27+j*0.038,0.088],[1,1,0.4]);
      link(body,'chest-harness',mats.leather,[s*0.16,1.275,0.094],[s*0.112,0.88,0.133],0.02);
      buckle(body,[s*0.144,1.17,0.146],0.058,0.046);
      box(body,'harness-crossbar',mats.leather,[0.105,0.027,0.017],[s*0.055,1.125,0.146]);
    }
    buckle(body,[0,1.124,0.16]);
    path(body,'jacket-center-seam',mats.metal,[[0,0.88,0.11],[0,1.22,0.139]],0.003);
  }
  // Belt, sling straps and hanging chains, shared reference motifs.
  mesh(body,'wide-waist-belt',nu(0.165,0.17,0.078,12),mats.leather,0,0.8,0,1,1,0.73);
  buckle(body,[0,0.809,0.134],0.069,0.045);
  for(const s of [-1,1]) {
    const lapelRows=red?[[[s*0.172,1.255,0.042],[s*0.222,1.208,0.065]],[[s*0.172,1.08,0.089],[s*0.216,1.066,0.087]],[[s*0.12,0.855,0.112],[s*0.195,0.842,0.082]]]
      :[[[s*0.133,1.266,0.084],[s*0.215,1.223,0.05]],[[s*0.132,1.084,0.125],[s*0.209,1.058,0.067]],[[s*0.127,0.855,0.116],[s*0.185,0.841,0.082]]];
    mesh(body,'open-jacket-lapel',surface(`lapel-${s}`,lapelRows),mats.coat);
    path(body,'lapel-seam',red?mats.lining:mats.metal,lapelRows.map(row=>row[0]),red?0.005:0.0025);
    box(body,'hip-strap',mats.leather,[0.04,0.25,0.018],[s*0.14,0.694,0.116],s*0.18);
    tag(body,s*0.16,0.635,0.137,!red);
    for(let j=0;j<12;j++) {
      const u=j/11,x=s*(0.02+u*0.2),y=0.784-Math.sin(u*Math.PI)*0.092;
      const ring=mesh(body,'waist-chain-link',$l('sorcerer-chain-link',()=>new Sr(0.011,0.0028,4,10)),mats.metal,x,y,0.151);
      ring.rotation.y=(j%2)*Math.PI/2;
    }
  }
  if(red) {
    for(let j=0;j<3;j++) {
      const belt=mesh(body,'crimson-waist-wrap',nu(0.168,0.168,0.023,12),mats.lining,0,0.79-j*0.025,0,1,1,0.78);
      belt.rotation.z=-0.09+j*0.07;
    }
    oval(body,'waist-knot',mats.lining,0.035,[0.125,0.77,0.155],[1.2,0.85,0.62]);
  }

  const legs = [-1,1].map(s => {
    const leg=new ut();leg.name=`leg-${s}`;leg.position.set(s*0.145,0.76,0);root.add(leg);
    link(leg,'loose-trouser-thigh',mats.cloth,[0,-0.025,0],[s*0.013,-0.33,0.017],0.084,0.113,10);
    link(leg,'gathered-trouser-calf',mats.cloth,[s*0.013,-0.29,0.017],[s*0.014,-0.52,0.016],0.057,0.095,10);
    for(let j=0;j<4;j++) {
      const fold=box(leg,'trouser-fold',mats.coat,[0.12-j*0.014,0.014,0.014],[s*0.015,-0.18-j*0.085,0.088],s*(0.15+j*0.05));
      fold.rotation.y=s*0.1;
    }
    // Boots have pale lug soles, tall strapped uppers and toe caps.
    oval(leg,'boot-upper',mats.leather,0.079,[s*0.014,-0.559,0.023],[1,1.54,0.89]);
    oval(leg,'boot-toe',mats.leather,0.09,[s*0.014,-0.668,0.068],[0.94,0.69,1.56]);
    oval(leg,'pale-boot-sole',mats.sole,0.1,[s*0.014,-0.716,0.061],[0.96,0.29,1.43]);
    oval(leg,'rubber-outsole',mats.leather,0.1,[s*0.014,-0.739,0.061],[0.95,0.13,1.4]);
    for(let j=0;j<4;j++) {
      const y=-0.47-j*0.052;
      box(leg,'boot-buckle-strap',mats.coat,[0.158,0.028,0.023],[s*0.014,y,0.096],-s*0.09);
      buckle(leg,[s*0.042,y,0.111],0.035,0.026);
      for(const side of [-1,1]) box(leg,'sole-lug',mats.leather,[0.025,0.027,0.028],[side*0.082+s*0.014,-0.731,-0.026+j*0.064]);
    }
    path(leg,'boot-toe-piping',mats.metal,[[-0.057,-0.661,0.127],[0,-0.65,0.163],[0.069,-0.661,0.127]],0.005);
    box(leg,'thigh-side-strap',mats.leather,[0.03,0.28,0.025],[s*0.083,-0.2,0.076],s*-0.15);
    buckle(leg,[s*0.091,-0.2,0.096]);
    return leg;
  });

  const arms=[-1,1].map((s,i) => {
    const arm=new ut();arm.name=`arm-${i}`;arm.position.set(s*(red?0.243:0.224),1.255,0);body.add(arm);
    const bare=red && s===-1;
    oval(arm,'shoulder',bare?mats.skin:mats.coat,0.082,[s*0.008,-0.035,0],[1.08,0.97,1]);
    link(arm,'upper-sleeve',bare?mats.skin:mats.coat,[0,-0.03,0],[0,-0.205,0],0.059,0.076,10);
    if(bare) path(arm,'shoulder-crimson-mark',mats.ink,[[s*0.025,0.017,0.062],[-s*0.024,-0.035,0.079],
      [s*0.031,-0.06,0.067],[0,-0.124,0.063]],0.009);
    else box(arm,'shoulder-plate',mats.leather,[0.117,0.026,0.137],[s*0.006,0.022,0],s*-0.18);
    const elbow=new ut();elbow.position.y=-0.203;arm.add(elbow);elbows.push(elbow);
    oval(elbow,'sleeve-elbow',mats.coat,0.059,[0,-0.015,0],[1,0.85,1]);
    link(elbow,'forearm-sleeve',mats.coat,[0,0,0],[0,-0.186,0.018],0.048,0.061,10);
    for(let j=0;j<3;j++) {
      mesh(elbow,'sleeve-strap',nu(0.06-j*0.003,0.06-j*0.003,0.028,10),mats.leather,0,-0.035-j*0.055,0.008);
      buckle(elbow,[s*0.018,-0.037-j*0.055,0.068],0.039,0.027);
      if(red) link(elbow,'red-sleeve-wrap',mats.lining,[-0.041,-0.01-j*0.052,0.05],[0.041,-0.043-j*0.052,0.05],0.007);
    }
    const wrist=new ut();wrist.position.set(0,-0.213,0.017);elbow.add(wrist);wrists.push(wrist);
    const hand=oval(wrist,'open-palm',mats.skin,0.046,[0,-0.023,0],[0.84,1.2,0.45]);arm.userData.hand=hand;
    for(let j=0;j<4;j++) {
      const x=(j-1.5)*0.02,len=0.057+(j===1||j===2?0.014:0);
      link(wrist,'finger',mats.skin,[x,-0.047,0],[x*1.23,-0.047-len,0.013],0.0085,0.0065,6);
      link(wrist,'fingertip',mats.skin,[x*1.23,-0.047-len,0.013],[x*1.24,-0.055-len,0.028],0.0065,0.004,6);
    }
    link(wrist,'thumb',mats.skin,[-s*0.028,-0.014,0],[-s*0.053,-0.042,0.02],0.01,0.006);
    if(red) path(wrist,'hand-crimson-mark',mats.ink,[[0,-0.008,0.018],[s*0.019,-0.03,0.018],[0,-0.042,0.018]],0.004);
    return arm;
  });

  // Six independently hinged coat panels keep the open front and visible legs.
  for(let j=0;j<6;j++) {
    const angle=(-1.7+j/5*3.4), x=Math.sin(angle)*0.153,z=-Math.cos(angle)*0.104;
    const panel=new ut();panel.name=`coat-panel-${j}`;panel.position.set(x,0.805,z);panel.rotation.y=-angle;
    body.add(panel);clothPivots.push(panel);
    const length=red?0.48+(j%3)*0.038:0.52+(j%2)*0.04;
    const rows=[ [[-0.073,0,0],[0.073,0,0]], [[-0.102,-0.20,-0.036],[0.103,-0.20,-0.045]],
      [[-0.155,-length*0.78,-0.105],[0.155,-length*0.8,-0.1]],
      [[-0.18,-length,-0.18],[red?0.118:0.18,-length+(red?0.08:0.012),-0.18]] ];
    mesh(panel,'split-coat-panel',surface(`coat-${j}`,rows),mats.coat);
    const inner=rows.map(row=>row.map(([a,b,c])=>[a*(j===0||j===5?0.89:0.65),b,c+0.005]));
    mesh(panel,red?'crimson-coat-lining':'cobalt-coat-lining',surface(`lining-${j}`,inner),mats.lining);
    path(panel,'coat-edge-piping',mats.leather,rows.map(row=>row[0]),0.007);
    const ribbon=rows.map(row=>[[row[1][0]-0.038,row[1][1],row[1][2]-0.008],[row[1][0]-0.012,row[1][1],row[1][2]-0.008]]);
    mesh(panel,'hanging-leather-strap',surface(`strap-${j}`,ribbon),mats.leather);
    for(let k=0;k<3;k++) buckle(panel,[0.055+k*0.025,-0.12-k*0.115,-0.017-k*0.024],0.032,0.027);
    tag(panel,rows[3][1][0]-0.027,-length+0.014,-0.181,!red);
    if(red) {
      path(panel,'torn-red-sigil',mats.ink,[[-0.075,-0.27,-0.074],[0.07,-0.33,-0.084],[-0.043,-0.42,-0.10],
        [0.058,-length+0.06,-0.112]],0.009);
      mesh(panel,'tattered-hem',surface(`hem-${j}`,[[[-0.10,-length+0.07,-0.114],[-0.04,-length+0.07,-0.114]],
        [[-0.128,-length-0.06,-0.143],[-0.104,-length-0.023,-0.133]]]),mats.lining);
    }
  }
  // Back yoke and signature diamond, visible in the model-sheet rear view.
  oval(body,'back-coat-yoke',mats.coat,0.2,[0,1.13,-0.08],[1.04,0.73,0.37]);
  for(let j=0;j<3;j++) {
    const w=0.105-j*0.027,h=0.12-j*0.031;
    path(body,'back-diamond-emblem',red?mats.lining:mats.metal,[[0,1.16+h,-0.168],[-w,1.16,-0.168],[0,1.16-h,-0.168],[w,1.16,-0.168],[0,1.16+h,-0.168]],0.005);
  }
  for(const s of [-1,1]) link(body,'back-harness',mats.leather,[s*0.155,1.245,-0.095],[s*0.065,0.835,-0.132],0.016);

  // Narrow anime face with a modeled jaw, ears, nose, brows and colored irises.
  const faceGeometry=$l(`${key}-face-sculpt`,()=>{
    const rows=[[-0.14,0.012,0.022,0.039],[-0.116,0.051,0.05,0.027],[-0.077,0.085,0.077,0.014],
      [-0.025,0.11,0.097,0.008],[0.034,0.118,0.105,0],[0.085,0.108,0.096,-0.008],[0.126,0.065,0.059,-0.012],[0.142,0.003,0.003,-0.012]];
    const positions=[],uv=[],indices=[],n=24;
    rows.forEach(([y,w,d,offset],i)=>{for(let j=0;j<=n;j++){const a=j/n*Math.PI*2;
      positions.push(Math.sin(a)*w,y,Math.cos(a)*d+offset);uv.push(j/n,i/(rows.length-1));
      if(i<rows.length-1&&j<n){const k=i*(n+1)+j;indices.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
    }});
    const g=new pn();g.setAttribute('position',new en(positions,3));g.setAttribute('uv',new en(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  });
  mesh(head,'sculpted-face',faceGeometry,mats.skin);
  for(const s of [-1,1]) {
    oval(head,'ear',mats.skin,0.025,[s*0.113,-0.032,0],[0.55,1,0.65]);
    oval(head,'ear-inner',mats.skinShade,0.014,[s*0.119,-0.03,0.008],[0.4,1,0.55]);
    oval(head,'eye-white',mats.white,0.025,[s*0.048,0.006,0.103],[1.14,0.38,0.15]);
    oval(head,'colored-iris',mats.eye,0.009,[s*0.046,0.006,0.107],[0.76,0.87,0.2]);
    oval(head,'pupil',mats.leather,0.004,[s*0.046,0.006,0.109],[0.7,1,0.2]);
    link(head,'upper-eyelid',red?mats.hair:mats.hairShade,[s*0.023,0.014,0.109],[s*0.072,0.017,0.086],0.002);
    link(head,'angular-eyebrow',red?mats.hair:mats.hairShade,[s*0.025,0.037,0.105],[s*0.078,0.04,0.079],0.003,0.002);
    if(red) {
      path(head,'crimson-face-mark',mats.ink,[[s*0.084,0.032,0.081],[s*0.073,0.007,0.091],
        [s*0.091,-0.026,0.077],[s*0.055,-0.058,0.089]],0.0035);
      const earring=mesh(head,'silver-earring',au(0.012,0.003),mats.metal,s*0.119,-0.066,0.007);
      earring.scale.y=1.3;
    }
  }
  link(head,'nose-bridge',mats.skin,[0,0.024,0.102],[0,-0.039,0.116],0.01,0.006);
  oval(head,'nose-tip',mats.skin,0.011,[0,-0.041,0.12],[0.8,0.55,0.7]);
  path(head,red?'crooked-smile':'calm-mouth',mats.skinShade,[[-0.018,-0.079,0.089],[0,-0.081,0.094],[0.024,-0.077+(red?0.006:0),0.085]],0.002);
  // Layered curved tapered locks, with asymmetry and pointed swept ends.
  mesh(head,'hair-underlayer',iu(0.145,0.54),mats.hair,0,0.052,-0.026,1,0.95,0.88);
  for(let j=0;j<30;j++) {
    const a=j*2.39996323, band=j%3, r=0.055+band*0.03;
    const x=Math.cos(a)*r,z=Math.sin(a)*r-0.018,y=0.093+(2-band)*0.024;
    const dx=Math.cos(a),dz=Math.sin(a),lift=0.055+(j%5)*0.006;
    const centers=[[x,y,z],[x+dx*0.023,y+lift,z+dz*0.016],
      [x+dx*0.043+0.014,y+lift+0.022,z+dz*0.04],
      [x+dx*0.073+0.025,y+lift+0.008,z+dz*0.07]];
    mesh(head,'swept-hair-lock',tuftGeometry(`hair-${j}`,centers,[0.041,0.034,0.019,0.0008]),j%5===0?mats.hairShade:mats.hair);
  }
  for(let j=0;j<10;j++) {
    const s=j<5?-1:1,k=j%5,x=s*(0.012+k*0.019);
    mesh(head,'layered-fringe',tuftGeometry(`fringe-${j}`,[[x,0.143,0.044],[x+s*0.011,0.125,0.096],
      [x+s*0.032,0.079,0.12],[x+s*0.047,0.005+k*0.009,0.086]], [0.024,0.025,0.014,0.0008]),mats.hair);
  }
  if(red) {
    for(let j=0;j<12;j++) {
      const s=j<6?-1:1,x=s*(0.045+(j%6)*0.018),y=0.095+(j%3)*0.022;
      mesh(head,'crimson-hair-tip',tuftGeometry(`red-tip-${j}`,[[x,y,0.045],[x+s*0.025,y+0.036,0.058],[x+s*0.07,y+0.012,0.082]], [0.009,0.01,0.0005]),mats.lining);
    }
  }
  // Hand effects stay visible so each character's signature power reads at rest and during casts.
  wrists.forEach((w,i) => {
    const fx=new ut();fx.name='hand-energy';fx.position.set(0,-0.08,0.095);w.add(fx);
    fx.userData.noAO=true;
    const material=red?mats.fireGlow:(i===0?mats.blueGlow:mats.redGlow);
    const coreMaterial=red?mats.fireCore:material;
    oval(fx,'energy-core',coreMaterial,red?0.09:0.105,[0,0,0]);
    if(red) {
      for(let j=0;j<3;j++) {
        const angle=j*Math.PI*2/3;
        const flame=mesh(fx,'hand-flame',tuftGeometry(`hand-flame-${j}`,
          [[Math.cos(angle)*0.026,-0.018,Math.sin(angle)*0.026],[Math.cos(angle)*0.042,0.075,Math.sin(angle)*0.042],
            [Math.cos(angle+0.24)*0.032,0.17+(j%2)*0.035,Math.sin(angle+0.24)*0.032]],
          [0.036,0.029,0.0005]),j===0?mats.fireCore:mats.fireGlow);
        flame.rotation.z=angle;
      }
    }
    for(let j=0;j<3;j++) {
      const radius=(red?0.12:0.105)+j*0.022;
      const ring=mesh(fx,'energy-orbit',$l(`sorcerer-energy-arc-${j}`,()=>new Sr(radius,red?0.005:0.0055,5,32,Math.PI*(1.2+j*0.2))),material);
      ring.rotation.set(0.65+j*0.85,0.3+j*0.7,j*0.9);
    }
    for(let j=0;j<4;j++) {
      const angle=j*Math.PI*0.5;
      const shard=mesh(fx,'energy-shard',nu(0,0.011,0.038,4),material,Math.cos(angle)*0.13,Math.sin(angle)*0.13,0);
      shard.rotation.z=angle;
    }
    fx.visible=true;energy.push(fx);
  });
  // Keep the broad, open-armed silhouette from the redesigned model sheets.
  // Fingers stay upright while the shoulders reach outward.
  const pose={armBase:[[-0.12,-1.14],[-0.12,1.14]],punch:true,runLean:0.025};
  arms.forEach((arm,i)=>{
    arm.rotation.x=pose.armBase[i][0];
    arm.rotation.z=pose.armBase[i][1];
    wrists[i].rotation.z=Math.PI-pose.armBase[i][1];
  });
  root.userData.parts=parts;
  const torsoMap=mergeBrawlerPivot(body,key,'body');
  const pivots=[head,...legs,...arms,...elbows,...wrists,...clothPivots,...energy];
  pivots.forEach((pivot,i)=>mergeBrawlerPivot(pivot,key,`pivot-${i}`));
  const model={root,body,head,legs,arms,weapon,torso:torsoMap.get(torso)||torso,pose,
    muzzles:[new H(-0.31,0.9,0.36),new H(0.31,0.9,0.36)],
    flashMats:Object.values(mats).filter(m=>m!==mats.blueGlow&&m!==mats.redGlow&&m!==mats.fireGlow&&m!==mats.fireCore),allMats:Object.values(mats),
    clothPivots,elbows,wrists,energy};
  model.updateVisualPose=(time,moving,power=0,skillPose=null) => {
    clothPivots.forEach((p,i)=>{p.rotation.x=Math.sin(time*2.2+i*0.83)*0.027+(moving?0.13:0)+power*0.07;
      p.rotation.z=Math.sin(time*1.8+i)*0.025;});
    elbows.forEach((p,i)=>{p.rotation.x=-0.15-power*1.15+Math.sin(time*2+i)*0.018;});
    energy.forEach((p,i)=>{
      p.visible=true;
      p.rotation.y=time*(i?2.1:-2.1);
      const pulse=0.92+Math.sin(time*8+i*1.7)*0.09+power*0.16+(skillPose?0.08:0);
      p.scale.setScalar(pulse);
      p.children.forEach((part,j)=>{
        if(part.name==='hand-flame') part.scale.y=0.88+Math.sin(time*16+j*2.2+i)*0.28+power*0.18;
      });
    });
  };
  return model;
}
