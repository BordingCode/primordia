// gl.js — premium WebGL layer: animated cosmic nebula + additive bloom particles.
// Two draw passes on one canvas: (1) opaque fullscreen nebula, (2) additive soft particles.
// Degrades gracefully: if WebGL is unavailable, isReady stays false and the app uses a CSS gradient.

const NEBULA_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const NEBULA_FS = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;
uniform vec3  uColA;   // nebula colour 1
uniform vec3  uColB;   // nebula colour 2
uniform float uIntensity;
uniform vec2  uFocus;  // bright core position (0..1)

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., amp=0.5;
  for(int i=0;i<5;i++){ v+=amp*noise(p); p*=2.02; amp*=0.5; }
  return v;
}
void main(){
  vec2 uv = vUv;
  float aspect = uRes.x/uRes.y;
  vec2 p = (uv-0.5)*vec2(aspect,1.0);
  float t = uTime*0.02;

  // drifting nebula clouds
  vec2 q = p*1.6 + vec2(t, t*0.5);
  float cloud = fbm(q + fbm(q*0.7 + t));
  cloud = pow(cloud, 1.7);

  // colour blend
  vec3 col = mix(uColA, uColB, smoothstep(0.2,0.9,fbm(p*0.9 - t*0.3)));
  col *= cloud * 1.4 * uIntensity;

  // deep space base
  vec3 base = vec3(0.015, 0.02, 0.045);
  col += base;

  // bright core glow around focus
  float d = length(p - (uFocus-0.5)*vec2(aspect,1.0));
  col += uColB * 0.25 * uIntensity * exp(-d*2.2);

  // stars (sparse, twinkling)
  vec2 sp = uv*uRes/2.5;
  float star = hash(floor(sp));
  if(star>0.992){
    float tw = 0.6+0.4*sin(uTime*3.0+star*100.0);
    col += vec3(0.8,0.9,1.0)*tw*(star-0.992)*120.0;
  }

  // subtle vignette
  col *= smoothstep(1.25, 0.2, length((uv-0.5)*vec2(aspect,1.0)));

  gl_FragColor = vec4(col, 1.0);
}
`;

const PART_VS = `
attribute vec2 aPos;     // px
attribute float aSize;   // px
attribute vec4 aColor;
uniform vec2 uRes;
varying vec4 vColor;
void main(){
  vColor = aColor;
  vec2 clip = (aPos/uRes)*2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = aSize;
}
`;

const PART_FS = `
precision mediump float;
varying vec4 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  // soft luminous falloff -> reads as bloom under additive blending
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, 1.6);
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('shader error', gl.getShaderInfoLog(s), src);
    return null;
  }
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('link error', gl.getProgramInfoLog(p)); return null;
  }
  return p;
}

const MAX_PARTICLES = 2200;

export class GLLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.isReady = false;
    this.lowMotion = false;        // when true, suppress particle bursts (reduce-motion)
    this.particles = [];
    this.nebula = { colA: [0.18, 0.10, 0.42], colB: [0.10, 0.45, 0.55], intensity: 1.0, focus: [0.5, 0.45] };
    this._target = { ...this.nebula };
    try {
      const gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: false })
              || canvas.getContext('experimental-webgl');
      if (!gl) return;
      this.gl = gl;
      this._init();
      this.isReady = true;
    } catch (e) { console.warn('GL init failed', e); }
  }

  _init() {
    const gl = this.gl;
    this.nProg = program(gl, NEBULA_VS, NEBULA_FS);
    this.pProg = program(gl, PART_VS, PART_FS);
    if (!this.nProg || !this.pProg) { this.isReady = false; return; }

    // fullscreen quad
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    // particle dynamic buffers
    this.pData = new Float32Array(MAX_PARTICLES * 7); // x,y,size,r,g,b,a
    this.pBuf = gl.createBuffer();

    this.nLoc = {
      aPos: gl.getAttribLocation(this.nProg, 'aPos'),
      uTime: gl.getUniformLocation(this.nProg, 'uTime'),
      uRes: gl.getUniformLocation(this.nProg, 'uRes'),
      uColA: gl.getUniformLocation(this.nProg, 'uColA'),
      uColB: gl.getUniformLocation(this.nProg, 'uColB'),
      uIntensity: gl.getUniformLocation(this.nProg, 'uIntensity'),
      uFocus: gl.getUniformLocation(this.nProg, 'uFocus'),
    };
    this.pLoc = {
      aPos: gl.getAttribLocation(this.pProg, 'aPos'),
      aSize: gl.getAttribLocation(this.pProg, 'aSize'),
      aColor: gl.getAttribLocation(this.pProg, 'aColor'),
      uRes: gl.getUniformLocation(this.pProg, 'uRes'),
    };
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  setNebula(opts) { Object.assign(this._target, opts); }

  // spawn an additive particle. life in seconds.
  spawn(x, y, { size = 30, color = [0.4, 0.9, 1.0], alpha = 0.8, vx = 0, vy = 0,
                life = 1.0, drag = 0.96, grow = 0, gravity = 0 } = {}) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ x, y, vx, vy, size, color, alpha, life, max: life, drag, grow, gravity });
  }

  burst(x, y, n, opts = {}) {
    if (this.lowMotion) return;               // reduce-motion: no particle showers
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 120) * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, {
        ...opts,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: (opts.size || 26) * (0.5 + Math.random()),
        life: (opts.life || 0.9) * (0.6 + Math.random() * 0.6),
      });
    }
  }

  update(dt) {
    // ease nebula toward target
    const k = Math.min(1, dt * 1.5);
    const n = this.nebula, t = this._target;
    for (let i = 0; i < 3; i++) { n.colA[i] += (t.colA[i] - n.colA[i]) * k; n.colB[i] += (t.colB[i] - n.colB[i]) * k; }
    n.intensity += (t.intensity - n.intensity) * k;
    n.focus[0] += (t.focus[0] - n.focus[0]) * k;
    n.focus[1] += (t.focus[1] - n.focus[1]) * k;

    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.size += p.grow * dt;
    }
  }

  render(timeSec) {
    if (!this.isReady) return;
    const gl = this.gl;
    gl.disable(gl.BLEND);

    // --- nebula pass ---
    gl.useProgram(this.nProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(this.nLoc.aPos);
    gl.vertexAttribPointer(this.nLoc.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(this.nLoc.uTime, timeSec);
    gl.uniform2f(this.nLoc.uRes, this.canvas.width, this.canvas.height);
    gl.uniform3fv(this.nLoc.uColA, this.nebula.colA);
    gl.uniform3fv(this.nLoc.uColB, this.nebula.colB);
    gl.uniform1f(this.nLoc.uIntensity, this.nebula.intensity);
    gl.uniform2fv(this.nLoc.uFocus, this.nebula.focus);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- particle pass (additive) ---
    const ps = this.particles;
    if (ps.length) {
      const data = this.pData; let j = 0;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const a = p.alpha * Math.min(1, p.life / (p.max * 0.5));
        data[j++] = p.x * this.dpr; data[j++] = p.y * this.dpr;
        data[j++] = p.size * this.dpr;
        data[j++] = p.color[0]; data[j++] = p.color[1]; data[j++] = p.color[2]; data[j++] = a;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(this.pProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, ps.length * 7), gl.DYNAMIC_DRAW);
      const stride = 7 * 4;
      gl.enableVertexAttribArray(this.pLoc.aPos);
      gl.vertexAttribPointer(this.pLoc.aPos, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.pLoc.aSize);
      gl.vertexAttribPointer(this.pLoc.aSize, 1, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(this.pLoc.aColor);
      gl.vertexAttribPointer(this.pLoc.aColor, 4, gl.FLOAT, false, stride, 12);
      gl.uniform2f(this.pLoc.uRes, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.POINTS, 0, ps.length);
      gl.disable(gl.BLEND);
    }
  }
}
