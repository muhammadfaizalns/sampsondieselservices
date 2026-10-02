/**
 * Involute gear geometry for a Three.js scene. No imports: pass THREE explicitly.
 * Axis: X. Gear centre: origin. Tooth zero points along +Y; positive rotation.x
 * moves that tooth toward +Z. Tooth count/pitch determine all mating dimensions.
 *
 * Pair: createGearGeometry(THREE, 24, .08, .40, { helix: .10 });
 *       createGearGeometry(THREE, 16, .08, .40, { helix: -.15 });
 * Centre distance = .08 * (24 + 16) / 2 = 1.60.
 * For gear B displaced along +Y: B.rotation.x = Math.PI / 16 - A.rotation.x*24/16.
 * Gear B's .15-rad opposite twist matches A's .10-rad twist at their pitch radii.
 * helix means TOTAL tooth twist from the rear face to the front face, in radians.
 */
export function createGearGeometry(THREE, teeth, moduleSize, width, options = {}) {
  if (!Number.isInteger(teeth) || teeth < 8 || !(moduleSize > 0) || !(width > 0)) {
    throw new RangeError('Gear requires integer teeth >= 8, moduleSize > 0, and width > 0.');
  }
  const tau = Math.PI * 2;
  const pitch = teeth * moduleSize / 2;
  const pressure = (options.pressureAngle ?? 20) * Math.PI / 180;
  const base = pitch * Math.cos(pressure);
  const root = pitch - (options.dedendum ?? 1.25) * moduleSize;
  const tip = pitch + (options.addendum ?? 1) * moduleSize;
  const bore = options.boreRadius ?? pitch * .19;
  const backlash = options.backlash ?? moduleSize * .0375;
  const helix = options.helix ?? 0;
  const flankSteps = Math.max(6, Math.round(options.flankSteps ?? 12));
  const arcSteps = Math.max(3, Math.round(options.arcSteps ?? 6));
  const slices = Math.max(1, Math.round(options.axialSegments ?? (helix ? 10 : 1)));
  if (!(bore >= 0 && bore < root) || !(pressure > 0 && pressure < Math.PI / 3) || root <= 0) {
    throw new RangeError('Bore must fit inside the gear root and pressureAngle must be 0–60 degrees.');
  }
  const inv = r => {
    const alpha = Math.acos(Math.min(1, base / r));
    return Math.tan(alpha) - alpha;
  };
  const polar = (r, a) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
  const half = Math.PI / (2 * teeth) - backlash / (2 * pitch);
  const halfBase = half + inv(pitch);
  const startRadius = Math.max(root, base);
  const rootHalf = half + inv(pitch) - inv(startRadius);
  const flare = root < base ? moduleSize * .0875 / root : 0;
  const contour = [];
  const push = p => {
    const prev = contour[contour.length - 1];
    if (!prev || prev.distanceToSquared(p) > moduleSize * moduleSize * 1e-16) contour.push(p);
  };
  const cubic = (p0, p1, p2, p3, t) => {
    const a = 1 - t;
    return new THREE.Vector2(
      a*a*a*p0.x + 3*a*a*t*p1.x + 3*a*t*t*p2.x + t*t*t*p3.x,
      a*a*a*p0.y + 3*a*a*t*p1.y + 3*a*t*t*p2.y + t*t*t*p3.y
    );
  };
  for (let n = 0; n < teeth; n++) {
    const c = n * tau / teeth;
    if (root < base) {
      const p0=polar(root,c-halfBase-flare), p1=polar(root,c-halfBase);
      const p2=polar(base-moduleSize*.0875,c-halfBase), p3=polar(base,c-halfBase);
      for(let j=0;j<=4;j++) push(cubic(p0,p1,p2,p3,j/4));
    } else push(polar(root,c-rootHalf));
    for(let j=1;j<=flankSteps;j++) {
      const r=startRadius+(tip-startRadius)*j/flankSteps;
      push(polar(r,c-half-inv(pitch)+inv(r)));
    }
    const halfTip=half+inv(pitch)-inv(tip);
    for(let j=1;j<=arcSteps;j++) push(polar(tip,c-halfTip+2*halfTip*j/arcSteps));
    for(let j=flankSteps-1;j>=0;j--) {
      const r=startRadius+(tip-startRadius)*j/flankSteps;
      push(polar(r,c+half+inv(pitch)-inv(r)));
    }
    if(root<base) {
      const p0=polar(base,c+halfBase), p1=polar(base-moduleSize*.0875,c+halfBase);
      const p2=polar(root,c+halfBase), p3=polar(root,c+halfBase+flare);
      for(let j=1;j<=4;j++) push(cubic(p0,p1,p2,p3,j/4));
    }
    const from=c+rootHalf+flare, to=c+tau/teeth-rootHalf-flare;
    for(let j=1;j<=arcSteps;j++) push(polar(root,from+(to-from)*j/arcSteps));
  }
  if(contour[0].distanceToSquared(contour[contour.length-1]) < moduleSize*moduleSize*1e-14) contour.pop();
  const hole=[];
  if(bore>0) for(let j=0;j<Math.max(48,teeth*3);j++) hole.push(polar(bore,-j*tau/Math.max(48,teeth*3)));
  const holes=hole.length?[hole]:[];
  const faces=THREE.ShapeUtils.triangulateShape(contour,holes);
  const flat=contour.concat(hole), positions=[], uvs=[], indices=[];
  const add=(p,t)=>{
    const a=helix*(t-.5), co=Math.cos(a),si=Math.sin(a);
    positions.push((t-.5)*width,p.x*co-p.y*si,p.x*si+p.y*co);
    uvs.push(.5+p.x/(2*tip),.5+p.y/(2*tip));
    return positions.length/3-1;
  };
  // Separate cap vertices keep machined face normals sharp against the tooth walls.
  for(const t of [0,1]) {
    const offset=positions.length/3;
    for(const p of flat) add(p,t);
    for(const face of faces) {
      let [a,b,c]=face;
      const p=flat[a],q=flat[b],r=flat[c];
      const signed=(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
      if((signed>0)!==(t===1)) [b,c]=[c,b];
      indices.push(offset+a,offset+b,offset+c);
    }
  }
  // CCW outside and CW bore loops yield outward-facing walls with the same winding.
  for(const loop of [contour,...holes]) {
    const offset=positions.length/3, count=loop.length;
    for(let s=0;s<=slices;s++) for(const p of loop) add(p,s/slices);
    for(let s=0;s<slices;s++) for(let i=0;i<count;i++) {
      const next=(i+1)%count;
      const a=offset+s*count+i,b=a+count;
      const d=offset+s*count+next,c=d+count;
      indices.push(a,d,c,a,c,b);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData={...geometry.userData,teeth,moduleSize,pitchRadius:pitch,rootRadius:root,tipRadius:tip,boreRadius:bore,width,helix,pressureAngle:pressure*180/Math.PI};
  return geometry;
}
