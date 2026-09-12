<script lang="ts">
  import { onMount } from 'svelte';

  let { className = '', interactive = true, fullscreen = false } = $props();

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  // All scene dimensions scale off the visible box so it looks right on any screen
  let W = 0;
  let H = 0;
  let dpr = 1;
  let ctx: CanvasRenderingContext2D | null = null;

  const reduceMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Normalized mouse position (0..1 across the canvas box); smoothed toward target
  let mouseX = 0.5;
  let mouseY = 0.5;
  let smX = 0.5; // smoothed values used for drawing
  let smY = 0.5;
  let isVisible = true;
  let time = 0;

  const TWO_PI = Math.PI * 2;

  // ------------------------------------------------------------------
  // Wave layer configuration.
  //   baseFrac : top of the band as a fraction of height
  //   ampFrac  : wave amplitude as a fraction of height
  //   fills    : [top color, bottom color] vertical gradient of the water face
  //   comps    : summed sines, each { len (x wavelength as fraction of W),
  //              speed (rad/s), amp (fraction of H), shift (phase off) }
  // ------------------------------------------------------------------
  const LAYERS = [
    {
      name: 'far',
      baseFrac: 0.6,
      ampFrac: 0.012,
      fills: ['#7ba79e', '#5f8f8c'],
      foam: { count: 6, r: 0.006, alpha: 0.5 },
      glints: 14,
      comps: [
        { len: 0.55, speed: 0.35, amp: 0.010, shift: 0.4 },
        { len: 0.28, speed: 0.55, amp: 0.006, shift: 2.1 },
      ],
    },
    {
      name: 'mid',
      baseFrac: 0.7,
      ampFrac: 0.02,
      fills: ['#5f8f8c', '#3f736f'],
      foam: { count: 9, r: 0.009, alpha: 0.7 },
      glints: 20,
      comps: [
        { len: 0.7, speed: 0.9, amp: 0.016, shift: 0 },
        { len: 0.34, speed: 1.2, amp: 0.010, shift: 1.3 },
        { len: 0.16, speed: 1.8, amp: 0.005, shift: 3.1 },
      ],
    },
    {
      name: 'front',
      baseFrac: 0.845,
      ampFrac: 0.03,
      fills: ['#4a8178', '#2e5d59'],
      foam: { count: 12, r: 0.014, alpha: 0.85 },
      glints: 26,
      comps: [
        { len: 0.82, speed: 1.15, amp: 0.024, shift: 0.8 },
        { len: 0.4, speed: 1.7, amp: 0.015, shift: 2.2 },
        { len: 0.2, speed: 2.4, amp: 0.007, shift: 4.4 },
      ],
    },
  ];

  const depths = [0.25, 0.5, 1]; // parallax depth per layer (far -> front)

  const SAND_FRAC = 0.955; // top of the wet sand strip

  // ---------------------------------------------------------------
  // Animational state
  // ---------------------------------------------------------------
  type Bird = { x: number; y: number; s: number; spd: number; ph: number };
  let birds: Bird[] = [];

  type Glint = { x: number; ph: number };
  let glints: { far: Glint[]; mid: Glint[]; front: Glint[] } = { far: [], mid: [], front: [] };

  type Spray = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };
  let sprays: Spray[] = [];

  const SURF_SPEED = 55; // px/s along the wave
  const SURF_SCALE = 0.028; // board half-width as a fraction of H

  // Doubles as a tiny PRNG so the animation is reproducible per resize event
  function rand(seedRef: { v: number }) {
    seedRef.v = (seedRef.v * 9301 + 49297) % 233280;
    return seedRef.v / 233280;
  }

  function buildSeeds() {
    const seed = { v: 12345 };
    birds = [];
    for (let i = 0; i < 3; i++) {
      birds.push({
        x: rand(seed) * W,
        y: H * (0.08 + rand(seed) * 0.22),
        s: H * (0.012 + rand(seed) * 0.006),
        spd: W * (0.018 + rand(seed) * 0.02),
        ph: rand(seed) * TWO_PI,
      });
    }
    glints = { far: [], mid: [], front: [] };
    LAYERS.forEach((l) => {
      const arr: Glint[] = [];
      const key = l.name as keyof typeof glints;
      for (let g = 0; g < l.glints; g++) {
        arr.push({ x: rand(seed) * W, ph: rand(seed) * TWO_PI * 6 });
      }
      glints[key] = arr;
    });
    sprays = [];
  }

  // ---------------------------------------------------------------
  // Wave math. Returns the top edge Y (px) of a band at a given x.
  // option 'mouse' injects an extra swell that leans toward the cursor.
  // ---------------------------------------------------------------
  function waveY(layer: (typeof LAYERS)[number], x: number, mouseSwell: number) {
    let y = layer.baseFrac * H;
    for (const c of layer.comps) {
      const a = c.amp * H * (1 + mouseSwell * Math.min(c.amp * 60, 1));
      y += Math.sin((x / (c.len * W)) * TWO_PI + time * c.speed + c.shift) * a;
    }
    return y;
  }

  function waveSlope(layer: (typeof LAYERS)[number], x: number, mouseSwell: number) {
    const dy = waveY(layer, x + 4, mouseSwell) - waveY(layer, x - 4, mouseSwell);
    return Math.atan2(dy, 8);
  }

  function mouseSwellFor(layerIndex: number) {
    if (!interactive) return 0;
    const depth = depths[layerIndex];
    const dx = (mouseX - 0.5) * 2;
    // Near the cursor the swell grows; the effect fades with distance
    return Math.max(0, 1 - Math.abs(dx)) * depth * 0.6;
  }

  // ---------------------------------------------------------------
  // Drawing helpers
  // ---------------------------------------------------------------
  function sky(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, '#f7e7cb');
    g.addColorStop(0.45, '#f7d8ac');
    g.addColorStop(0.75, '#f3bd8f');
    g.addColorStop(1, '#f2b07f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.62);
  }

  function clouds(ctx: CanvasRenderingContext2D, horizonY: number) {
    ctx.save();
    for (const b of birds) {
      // soft receding cloud patches, drifting slowly left
      const cx = ((b.x - time * b.spd * 0.55 + W * 2) % (W + 300)) - 150;
      const cy = b.y - H * 0.06;
      if (cx < -200 || cx > W + 200) continue;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff6e6';
      const s = b.s * 5;
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * s * 0.8;
        const oy = Math.sin(i * 2.4) * s * 0.28;
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + oy, s, s * 0.42, 0, 0, TWO_PI);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function farIsland(ctx: CanvasRenderingContext2D, horizonY: number) {
    // hazy tropical island silhouette: a low dome with a couple of palms,
    // sitting on the horizon far out to sea. Semi-transparent for heat-haze.
    const islandX = W * 0.16;
    const islandW = H * 0.16;
    const islandH = H * 0.05;
    const baseY = horizonY + H * 0.008;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#6fa89e';
    ctx.beginPath();
    ctx.moveTo(islandX - islandW / 2, baseY);
    ctx.quadraticCurveTo(islandX, baseY - islandH * 1.6, islandX + islandW / 2, baseY);
    ctx.quadraticCurveTo(islandX + islandW * 0.6, baseY - islandH * 0.6, islandX + islandW * 0.95, baseY);
    ctx.closePath();
    ctx.fill();

    // short palm silhouettes poking up
    ctx.strokeStyle = '#5b8f86';
    ctx.lineWidth = Math.max(1, H * 0.003);
    ctx.beginPath();
    for (const fx of [-0.18, 0.12, 0.42]) {
      const px = islandX + fx * islandW;
      const topY = baseY - islandH * (1.1 + Math.sin(fx * 6) * 0.5);
      ctx.moveTo(px, baseY - islandH * 0.6);
      ctx.quadraticCurveTo(px + 2, topY + islandH * 0.3, px + 1, topY);
      // fronds
      for (const dir of [-1, 1]) {
        ctx.moveTo(px + 1, topY);
        ctx.quadraticCurveTo(px + 1 + dir * islandH * 0.5, topY - islandH * 0.12, px + 1 + dir * islandH * 0.95, topY + islandH * 0.08);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function sun(ctx: CanvasRenderingContext2D, horizonY: number) {
    const sunX = W * 0.7 + (smX - 0.5) * W * 0.05;
    const sunY = horizonY - H * 0.035;
    const sunR = H * (0.055 + Math.sin(time * 0.9) * 0.003);

    // soft outer glow
    const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
    glow.addColorStop(0, 'rgba(255,236,190,0.75)');
    glow.addColorStop(0.35, 'rgba(255,214,150,0.28)');
    glow.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - sunR * 3.2, sunY - sunR * 3.2, sunR * 6.4, sunR * 6.4);

    // crisp core
    const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    core.addColorStop(0, '#fff9e8');
    core.addColorStop(0.65, '#ffe9b0');
    core.addColorStop(1, 'rgba(255,221,150,0.45)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
    ctx.fill();

    // shimmering reflection path on the water below the sun
    ctx.globalCompositeOperation = 'lighter';
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const ry = horizonY + 3 + t * (H * 0.11);
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.7);
      const half = sunR * (0.5 + t * 1.5) * (0.7 + 0.3 * pulse);
      ctx.fillStyle = `rgba(255,228,170,${0.1 + 0.22 * (1 - t) * pulse})`;
      ctx.fillRect(sunX - half, ry, half * 2, 1.4);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function horizonBand(ctx: CanvasRenderingContext2D, horizonY: number) {
    // warm hazy band where sea meets sky + distant reflections
    const g = ctx.createLinearGradient(0, horizonY, 0, horizonY + H * 0.03);
    g.addColorStop(0, '#c8cdb2');
    g.addColorStop(0.5, '#9bbaa8');
    g.addColorStop(1, '#7ba79e');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, W, H * 0.03);
  }

  function sailboat(ctx: CanvasRenderingContext2D, horizonY: number) {
    const bob = Math.sin(time * 0.9) * H * 0.005;
    const x = (((time * W * 0.012) % (W + 500)) - 250) + W * 0.35;
    // wrap into a drifting loop
    const bx = ((x % (W + 500)) + W + 500) % (W + 500) - 250;
    const by = horizonY + H * 0.036 + bob;
    const hullW = H * 0.045;
    const hullH = H * 0.008;

    // hull
    ctx.fillStyle = 'rgba(56,74,66,0.85)';
    ctx.beginPath();
    ctx.moveTo(bx - hullW / 2, by);
    ctx.lineTo(bx + hullW / 2, by);
    ctx.lineTo(bx + hullW * 0.32, by + hullH);
    ctx.lineTo(bx - hullW * 0.2, by + hullH);
    ctx.closePath();
    ctx.fill();

    // sails
    ctx.fillStyle = 'rgba(250,242,226,0.95)';
    ctx.beginPath();
    ctx.moveTo(bx + hullW * 0.04, by);
    ctx.lineTo(bx + hullW * 0.04, by - hullW * 1.1);
    ctx.lineTo(bx + hullW * 0.5, by);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(250,242,226,0.75)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - hullW * 0.8);
    ctx.lineTo(bx - hullW * 0.42, by);
    ctx.closePath();
    ctx.fill();

    // mast
    ctx.strokeStyle = 'rgba(56,74,66,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - hullW * 1.1);
    ctx.stroke();
  }

  function flock(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(84,62,48,0.55)';
    ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.lineCap = 'round';
    for (const b of birds) {
      const flap = Math.abs(Math.sin(time * 6 + b.ph));
      const x = ((b.x + time * b.spd) % (W + 400)) - 200;
      const y = b.y + Math.sin(time * 1.1 + b.ph) * H * 0.004;
      const s = b.s;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.4, y - s * 1.1 * flap, x, y);
      ctx.quadraticCurveTo(x + s * 0.4, y - s * 1.1 * flap, x + s, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + s * 0.45);
      ctx.stroke();
    }
  }

  function drawWaveLayer(ctx: CanvasRenderingContext2D, layer: (typeof LAYERS)[number], index: number, bottomY: number) {
    const swell = mouseSwellFor(index);
    const amp = layer.ampFrac * H * (1 + swell * 0.25);

    // sample the top edge
    const step = 8;
    const n = Math.ceil(W / step) + 1;
    const ys = new Float32Array(n);
    let minY = Infinity;
    for (let i = 0; i < n; i++) {
      const x = i * step;
      ys[i] = waveY(layer, x, swell);
      if (ys[i] < minY) minY = ys[i];
    }

    // water face with vertical gradient
    const g = ctx.createLinearGradient(0, minY - amp, 0, bottomY);
    g.addColorStop(0, layer.fills[0]);
    g.addColorStop(1, layer.fills[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, bottomY);
    for (let i = 0; i < n; i++) {
      ctx.lineTo(i * step, ys[i]);
    }
    ctx.lineTo(W, bottomY);
    ctx.closePath();
    ctx.fill();

    // crest foam: scallops along the peak of each swell plus the front tube lip
    const foam = layer.foam;
    for (let i = 1; i < n - 1; i++) {
      const py = ys[i];
      const prev = ys[i - 1];
      const next = ys[i + 1];
      if (py >= prev || py >= next) continue; // not a local peak
      const rise = (layer.baseFrac * H) - py;
      if (rise < amp * 0.35) continue; // shallow ripples don't foam
      const crestPerc = (rise - amp * 0.35) / (amp * 0.65);
      if (crestPerc <= 0) continue;

      const x = i * step;
      const r = foam.r * H * (0.6 + crestPerc * 0.8);
      ctx.globalAlpha = foam.alpha * (0.4 + 0.6 * crestPerc) * (0.75 + 0.25 * Math.sin(time * 3 + x * 0.05));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // foam tucks just under the crest
      ctx.ellipse(x, py + r * 0.25, r, r * 0.4, 0, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // sun glints twinkling on the water face
    const glKey = layer.name as keyof typeof glints;
    for (const gpt of glints[glKey]) {
      const x = gpt.x;
      const top = waveY(layer, x, mouseSwellFor(index));
      const y = top + (index + 1) * H * 0.018;
      if (y > bottomY - 2) continue;
      const tw = 0.5 + 0.5 * Math.sin(time * 2.6 + gpt.ph);
      ctx.globalAlpha = 0.05 + 0.16 * tw;
      ctx.fillStyle = 'rgba(255,235,200,1)';
      ctx.fillRect(x, y, Math.max(2, (index + 1) * 4), 1.2);
    }
    ctx.globalAlpha = 1;
  }

  function surfer(ctx: CanvasRenderingContext2D) {
    const mid = LAYERS[1];
    const range = W + 600;
    // carves slowly rightward across the mid wave, looping
    const sx = ((time * SURF_SPEED) % range) - 300;
    const sy = waveY(mid, sx, mouseSwellFor(1)) + Math.sin(time * 2.4) * H * 0.004;
    const ang = waveSlope(mid, sx, mouseSwellFor(1));

    const boardRx = SURF_SCALE * H;
    const boardRy = boardRx * 0.28;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);

    // foam churn behind the board
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const wob = Math.sin(time * 9 + i * 1.9);
      ctx.beginPath();
      ctx.arc(-boardRx * (1.1 + i * 0.5), 1 + i * 1.4 + wob, Math.max(1, boardRy * (1.2 - i * 0.2)), 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // shadow under board on the water
    ctx.fillStyle = 'rgba(20,50,48,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, boardRy * 0.4, boardRx * 1.05, boardRy, 0, 0, TWO_PI);
    ctx.fill();

    // surfboard
    const bg = ctx.createLinearGradient(0, -boardRy, 0, boardRy);
    bg.addColorStop(0, '#e9d9b4');
    bg.addColorStop(1, '#b99d72');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 0, boardRx, boardRy, 0, 0, TWO_PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,40,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // center stripe
    ctx.strokeStyle = 'rgba(140,110,80,0.5)';
    ctx.beginPath();
    ctx.moveTo(-boardRx * 0.9, 0);
    ctx.lineTo(boardRx * 0.9, 0);
    ctx.stroke();

    // surfer silhouette leaning forward into the ride
    const skin = 'rgba(64,44,38,0.92)';
    const shp = Math.min(56, H * 0.085); // body height in px
    const lean = 0.25;
    ctx.strokeStyle = skin;
    ctx.fillStyle = skin;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, shp * 0.09);

    // back leg (bent, knee up)
    ctx.beginPath();
    ctx.moveTo(0, -boardRy * 0.4);
    ctx.lineTo(-boardRx * 0.22, -shp * 0.16);
    ctx.stroke();
    // front leg (extended forward)
    ctx.beginPath();
    ctx.moveTo(0, -boardRy * 0.4);
    ctx.lineTo(boardRx * 0.32, -shp * 0.12);
    ctx.stroke();

    // torso leaning forward
    const hipX = boardRx * 0.1;
    const hipY = -shp * 0.3;
    const shX = hipX + shp * 0.14;
    const shY = hipY - shp * (0.55 - lean * 0.3);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(shX, shY);
    ctx.stroke();

    // trailing arm (back behind)
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.lineTo(shX - shp * 0.14, shY - shp * 0.12);
    ctx.stroke();
    // lead arm reaching toward the nose of the board
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.lineTo(shX + shp * 0.18, shY + shp * 0.04);
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(shX + shp * 0.05, shY - shp * 0.13, shp * 0.075, 0, TWO_PI);
    ctx.fill();

    // spray kicked off the rails
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const wob = Math.sin(time * 11 + i * 2.2);
      ctx.beginPath();
      ctx.arc(boardRx * 0.55 + i * 3, -boardRy * 0.5 + wob * 2, Math.max(1, boardRy * 0.5), 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function foregroundSpray(ctx: CanvasRenderingContext2D, bottomY: number) {
    // occasional mist kicked up by the front wave curling over the sand
    if (sprays.length < 22 && Math.random() < 0.06 * (interactive ? 1 : 0)) {
      const front = LAYERS[2];
      const x = W * (0.12 + Math.random() * 0.76);
      const y = waveY(front, x, mouseSwellFor(2));
      sprays.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: -(20 + Math.random() * 45),
        life: 0,
        max: 0.9 + Math.random() * 0.7,
        size: H * (0.004 + Math.random() * 0.006),
      });
    }
    ctx.fillStyle = 'rgba(255,252,244,1)';
    for (let i = sprays.length - 1; i >= 0; i--) {
      const p = sprays[i];
      p.life += 1 / 60;
      p.x += p.vx * (1 / 60);
      p.y += p.vy * (1 / 60);
      p.vy += 55 * (1 / 60);
      if (p.life >= p.max || p.y > bottomY) {
        sprays.splice(i, 1);
        continue;
      }
      const k = 1 - p.life / p.max;
      // particles grow then fade; a subtle white trail sells the motion
      ctx.globalAlpha = k * 0.7;
      ctx.fillRect(p.x, p.y, p.size * (1 + (1 - k) * 2), p.size * (1 + (1 - k) * 2) * 0.7);
    }
    ctx.globalAlpha = 1;
  }

  function sandAndFoam(ctx: CanvasRenderingContext2D) {
    const sandY = SAND_FRAC * H;
    const g = ctx.createLinearGradient(0, sandY, 0, H);
    g.addColorStop(0, '#e2cfa4');
    g.addColorStop(0.5, '#e9d6ac');
    g.addColorStop(1, '#efe0ba');
    ctx.fillStyle = g;
    ctx.fillRect(0, sandY, W, H - sandY);

    // advancing/retreating water line with foam
    const wetY = sandY - H * 0.012;
    const g2 = ctx.createLinearGradient(0, wetY, 0, sandY);
    g2.addColorStop(0, 'rgba(110,140,118,0.5)');
    g2.addColorStop(1, 'rgba(110,140,118,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, wetY, W, sandY - wetY);

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, H * 0.003);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const step = 12;
    for (let x = -10; x <= W + 10; x += step) {
      const y = wetY + Math.sin(x * 0.03 + time * 1.6) * H * 0.007;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // tiny wet speckles that light up as water runs over the sand
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 16; i++) {
      const x = (i / 16) * W + Math.sin(time * 2 + i * 3.1) * W * 0.02;
      ctx.fillStyle = 'rgba(255,235,200,0.8)';
      ctx.fillRect(x, wetY + 2 + Math.sin(time * 3 + i) * 2.4, 3, 1);
    }

    // lingering dissolved foam patches left above the water line
    for (let i = 0; i < 24; i++) {
      const x = ((i * 137) % 997) / 997 * W;
      const wave = Math.sin(x * 0.021 + time * 0.7);
      const dist = (wave * 0.5 + 0.5) * H * 0.018; // how far this foam rode up
      const fy = wetY - dist;
      const breathe = 0.5 + 0.5 * Math.sin(time * 1.3 + i * 1.7);
      ctx.globalAlpha = 0.18 * (1 - dist / (H * 0.018)) * (0.4 + 0.6 * breathe);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(time + i) * 4, fy, 3 + (i % 3) * 1.5, 1.6, 0, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function vignette(ctx: CanvasRenderingContext2D, horizonY: number) {
    // subtle darkening at the very top for depth, letting the hero text breathe
    const g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, 'rgba(120,80,40,0.16)');
    g.addColorStop(1, 'rgba(120,80,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY);
  }

  function draw() {
    if (!ctx || W === 0 || H === 0) return;
    const horizonY = H * 0.575;

    ctx.clearRect(0, 0, W, H);

    sky(ctx);
    clouds(ctx, horizonY);
    horizonBand(ctx, horizonY);
    farIsland(ctx, horizonY);
    sun(ctx, horizonY);
    sailboat(ctx, horizonY);
    flock(ctx);

    // ocean layers back -> front
    // each layer's band runs from its own wave base down to the start of the next
    // layer, so the water face reads as one continuous body with implied depth
    for (let i = 0; i < LAYERS.length; i++) {
      const layer = LAYERS[i];
      const nextBase = i < LAYERS.length - 1 ? LAYERS[i + 1].baseFrac * H : SAND_FRAC * H;
      drawWaveLayer(ctx, layer, i, nextBase);
    }

    surfer(ctx);
    foregroundSpray(ctx, SAND_FRAC * H);
    sandAndFoam(ctx);
    vignette(ctx, horizonY);
  }

  // ---------------------------------------------------------------
  // Canvas + lifecycle
  // ---------------------------------------------------------------
  function resize() {
    if (fullscreen) {
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
    } else {
      const parent = container?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
    }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    buildSeeds();
    if (reduceMotion) draw();
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    resize();

    if (reduceMotion) {
      // draw a single considered frame and stop
      resize();
      return;
    }

    const onPointer = (e: PointerEvent) => {
      if (!canvas || !interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;
    };
    const onLeave = () => {
      mouseX = 0.5;
      mouseY = 0.5;
    };
    const ro = new ResizeObserver(() => resize());
    if (container?.parentElement) ro.observe(container.parentElement);
    const onWinResize = () => resize();
    if (fullscreen) window.addEventListener('resize', onWinResize);

    const io = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(container);

    window.addEventListener('pointermove', onPointer, { passive: true });
    container.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      // ease the smoothed mouse position for a fluid response
      smX += (mouseX - smX) * 0.06;
      smY += (mouseY - smY) * 0.06;
      mouseX = smX;
      mouseY = smY;
      if (isVisible) draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      if (fullscreen) window.removeEventListener('resize', onWinResize);
      container.removeEventListener('pointerleave', onLeave);
    };
  });
</script>

<div class={className} bind:this={container} aria-hidden="true" style="pointer-events: none;">
  <canvas bind:this={canvas} class="block h-full w-full"></canvas>
</div>