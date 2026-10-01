(function () {
  "use strict";

  if (window.__novaRoseGalaxy?.init) {
    window.__novaRoseGalaxy.init();
    return;
  }

  /**
   * Rose Galaxy — real visible motion version
   * Goal:
   * 1. Particles must drift even when the mouse does nothing.
   * 2. Mouse only creates local attraction.
   * 3. Mouse stop / leave creates local outward scatter and then natural recovery.
   * 4. Sections can opt out with no-galaxy-section or data-galaxy="off".
   */

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

  const STAR_COLORS = [
    { r: 255, g: 250, b: 248, a: 0.92 },
    { r: 255, g: 232, b: 234, a: 0.88 },
    { r: 238, g: 150, b: 166, a: 0.84 },
    { r: 218, g: 82, b: 112, a: 0.78 },
    { r: 168, g: 48, b: 72, a: 0.72 },
    { r: 195, g: 184, b: 205, a: 0.68 },
  ];

  const LINK_COLORS = [
    { r: 255, g: 226, b: 230 },
    { r: 238, g: 154, b: 170 },
    { r: 210, g: 92, b: 120 },
    { r: 188, g: 166, b: 204 },
  ];
  const DARK_GLOW_COLORS = [
    { r: 242, g: 232, b: 233 },
    { r: 224, g: 193, b: 206 },
    { r: 211, g: 214, b: 229 },
    { r: 196, g: 176, b: 205 },
  ];

  const scenes = [];
  const FRAME_INTERVAL = 1000 / 30;
  let rafId = 0;
  let resizeTimer = 0;
  let lastFrameTime = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function rgba(c, a) {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(a, 0, 1)})`;
  }

  function isMobile() {
    return window.innerWidth < 768 || coarsePointerQuery.matches;
  }

  function isMusicSection(el) {
    return Boolean(el.closest(".no-galaxy-section, [data-galaxy='off']"));
  }

  class RoseGalaxyScene {
    constructor(host, canvas, mode) {
      this.host = host;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.mode = mode;
      this.width = 1;
      this.height = 1;
      this.dpr = 1;
      this.visible = true;
      this.particles = [];
      this.textRects = [];
      this.idleTimer = 0;
      this.lastTime = performance.now();

      this.mouse = {
        x: -9999,
        y: -9999,
        inside: false,
        active: false,
        idle: true,
      };

      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);

      this.host.addEventListener("pointermove", this.onPointerMove, { passive: true });
      this.host.addEventListener("pointerleave", this.onPointerLeave, { passive: true });

      if ("IntersectionObserver" in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            this.visible = entries.some((entry) => entry.isIntersecting);
          },
          { threshold: 0.01 }
        );
        this.observer.observe(this.host);
      }

      this.resize();
    }

    destroy() {
      clearTimeout(this.idleTimer);
      this.observer?.disconnect();
      this.host.removeEventListener("pointermove", this.onPointerMove);
      this.host.removeEventListener("pointerleave", this.onPointerLeave);
      this.ctx.clearRect(0, 0, this.width, this.height);
      this._glowSprites = null;
    }

    /* 阶段5 · 5.2 sprite 缓存: 光晕原先是每帧每粒子 createRadialGradient(实测 103 次/帧,
       每次 3 个 addColorStop → 313 次/帧)。改为按颜色分桶预渲染一次 256×256 的分桶纹理,
       绘制时用 globalAlpha 承载逐帧变化的 alpha + drawImage 缩放承载逐粒子变化的 radius。
       因为径向渐变的 stop 位置比例固定、半径为线性缩放, 缩放绘制与原渐变逐点等价:
         原 stop0  = color @ alpha*0.68*(haze?0.62:1)   ≤ alpha*0.68
         sprite 烘焙 alpha=1 → color @ 0.68, 绘制 globalAlpha = alpha*(haze?0.62:1)
         → 等效 alpha 通道 = alpha*0.68*(haze?0.62:1)   ✅ 精确一致(stop 1/0.22 同理)
       纹理用整块 canvas(而非 ctx.createPattern), 以便 drawImage 缩放目标矩形。 */
    glowSprite(colorIndex) {
      if (!this._glowSprites) this._glowSprites = new Array(DARK_GLOW_COLORS.length);
      const cached = this._glowSprites[colorIndex];
      if (cached) return cached;
      const color = DARK_GLOW_COLORS[colorIndex % DARK_GLOW_COLORS.length];
      const SIZE = 256;
      const cv = document.createElement("canvas");
      cv.width = SIZE;
      cv.height = SIZE;
      const g = cv.getContext("2d");
      const r = SIZE / 2;
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, rgba(color, 0.68));
      grad.addColorStop(0.22, rgba(color, 0.2));
      grad.addColorStop(1, rgba(color, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, SIZE, SIZE);
      this._glowSprites[colorIndex] = cv;
      return cv;
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      const oldWidth = this.width;
      const oldHeight = this.height;
      this.width = Math.max(1, Math.round(rect.width));
      this.height = Math.max(1, Math.round(rect.height));
      this.dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);

      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.updateTextRects();
      /* 阶段5 · 5.3: 已有粒子按比例缩放(视觉连续), 仅首次创建时才随机生成。
         原先每次 resize 都 buildParticles() → 位置/大小全部重随, 拖动窗口时整片跳变。 */
      if (this.particles.length) this.scaleParticles(oldWidth, oldHeight);
      else this.buildParticles();
      this.draw(performance.now(), false);
    }

    updateTextRects() {
      const hostRect = this.host.getBoundingClientRect();
      const selectors = [".hero-copy"];

      this.textRects = selectors
        .flatMap((selector) => Array.from(this.host.querySelectorAll(selector)))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const padX = 42;
          const padY = 30;
          return {
            left: r.left - hostRect.left - padX,
            top: r.top - hostRect.top - padY,
            right: r.right - hostRect.left + padX,
            bottom: r.bottom - hostRect.top + padY,
          };
        });
    }

    textFactor(x, y) {
      for (const r of this.textRects) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return 0.14;
        }
      }
      return 1;
    }

    particleTotal() {
      if (isMobile()) return Math.round(random(55, 65));
      return Math.round(random(95, 115));
    }

    pickHeroPosition() {
      const roll = Math.random();
      if (roll < 0.43) {
        return { x: random(this.width * 0.42, this.width * 0.98), y: random(this.height * 0.07, this.height * 0.42) };
      }
      if (roll < 0.72) {
        return { x: random(this.width * 0.3, this.width * 0.96), y: random(this.height * 0.18, this.height * 0.61) };
      }
      if (roll < 0.92) {
        return { x: random(this.width * 0.49, this.width * 0.97), y: random(this.height * 0.43, this.height * 0.86) };
      }
      return { x: random(this.width * 0.08, this.width * 0.42), y: random(this.height * 0.07, this.height * 0.3) };
    }

    createHeroParticle(index, total) {
      const depth = random(0.42, 1);
      const kindRoll = Math.random();
      /* 深色动画(浅色粒子层已移除): 尘埃/雾气/花瓣混合 */
      const kind = kindRoll < 0.07 ? "petal" : (kindRoll < 0.24 ? "haze" : "dust");
      const position = this.pickHeroPosition();
      const x = position.x;
      const y = position.y;

      return {
        kind,
        baseX: x,
        baseY: y,
        x,
        y,
        prevX: x,
        prevY: y,
        depth,
        vr: 0,
        size: (kind === "petal" ? random(3.8, 5.7) : (kind === "haze" ? random(2.2, 3.9) : random(1.1, 2.3))) * depth,
        alpha: (kind === "petal" ? random(0.28, 0.46) : (kind === "haze" ? random(0.24, 0.42) : random(0.42, 0.76))),
        phase: (index / total) * Math.PI * 2 + random(-Math.PI, Math.PI),
        verticalSpeed: random(-0.012, 0.018) * depth,
        sway: random(10, 38) * depth,
        swaySpeed: random(0.00019, 0.00046),
        breeze: random(-0.006, 0.009),
        twinkle: random(0.00125, 0.0034),
        halo: kind === "haze" ? random(10, 17) : random(6, 10),
        colorIndex: index % DARK_GLOW_COLORS.length,
        linkable: kind !== "petal" && Math.random() < 0.5,
        linkSeed: Math.random(),
        focus: 0,
        attractX: 0,
        attractY: 0,
      };
    }

    buildParticles() {
      const count = this.particleTotal();
      this.particles = Array.from({ length: count }, (_, i) => this.createHeroParticle(i, count));
    }

    /* 阶段5 · 5.3: 视口变化时不再重建粒子。
       原先 resize() 直接调 buildParticles() —— 位置/大小/halo/相位全部重随, 拖窗口或
       移动端地址栏收缩都会让整片粒子跳变重排。现改为按新旧宽高比缩放已有粒子:
         - 位置/摆动幅度/吸附位移按比例缩放(横向用 sx, 纵向用 sy)
         - size/halo/竖速用几何均值 s(夹在 [0.8,1.25]), 避免极端宽高比下光晕失比例
         - 相位/颜色/种类/闪烁速度保持不变 → 视觉连续
       横向比例推导: pickHeroPosition 把 x 约束在 [0.08W, 0.98W](跨度 0.90W),
       以 0.08W 为原点按跨度比缩放, 可让所有点的相对位置精确保持。 */
    scaleParticles(oldW, oldH) {
      if (!this.particles.length) return;
      if (oldW < 1 || oldH < 1) return;
      const sx = this.width / oldW;
      const sy = this.height / oldH;
      const s = Math.min(1.25, Math.max(0.8, Math.sqrt(sx * sy)));
      const x0o = 0.08 * oldW, y0o = 0.07 * oldH;
      const x0n = 0.08 * this.width, y0n = 0.07 * this.height;
      for (const p of this.particles) {
        p.x = x0n + (p.x - x0o) * sx;
        p.y = y0n + (p.y - y0o) * sy;
        p.baseX = x0n + (p.baseX - x0o) * sx;
        p.baseY = y0n + (p.baseY - y0o) * sy;
        p.prevX = p.x;
        p.prevY = p.y;
        p.attractX *= sx;
        p.attractY *= sy;
        p.sway *= sx;
        p.size *= s;
        p.halo *= s;
        p.verticalSpeed *= s;
      }
    }

    resetHeroParticle(p) {
      const position = this.pickHeroPosition();
      p.baseX = position.x;
      p.baseY = position.y;
      p.x = p.baseX;
      p.y = p.baseY;
      p.prevX = p.x;
      p.prevY = p.y;
      p.attractX = 0;
      p.attractY = 0;
      p.focus = 0;
    }

    updateHeroParticle(p, time, dt) {
      /* 深色动画(浅色粒子层已移除): 缓慢漂移 */
      const themeMotion = 0.72;
      p.prevX = p.x;
      p.prevY = p.y;
      const verticalSpeed = p.verticalSpeed;
      p.baseY += verticalSpeed * dt * themeMotion;
      p.baseX += p.breeze * dt * themeMotion;

      const naturalX = p.baseX + Math.sin(time * p.swaySpeed + p.phase) * p.sway * themeMotion;
      const naturalY = p.baseY + Math.cos(time * p.swaySpeed * 0.72 + p.phase) * p.sway * 0.16 * themeMotion;
      let targetAttractX = 0;
      let targetAttractY = 0;
      let targetFocus = 0;

      if (this.mouse.active && this.mouse.inside && finePointerQuery.matches && !isMobile()) {
        const dx = this.mouse.x - naturalX;
        const dy = this.mouse.y - naturalY;
        const dist = Math.hypot(dx, dy) || 1;
        const radius = 250;
        if (dist < radius) {
          const influence = Math.pow(1 - dist / radius, 1.35);
          const interaction = 0.12;
          targetAttractX = dx * influence * interaction;
          targetAttractY = dy * influence * interaction;
          targetFocus = influence;
        }
      }

      p.attractX += (targetAttractX - p.attractX) * 0.075;
      p.attractY += (targetAttractY - p.attractY) * 0.075;
      p.focus += (targetFocus - p.focus) * 0.1;
      p.x = naturalX + p.attractX;
      p.y = naturalY + p.attractY;

      if ((verticalSpeed >= 0 && p.baseY > this.height + 28) || (verticalSpeed < 0 && p.baseY < -28)) {
        this.resetHeroParticle(p);
        return;
      }
      if (p.baseX < -50) p.baseX = this.width + 30;
      if (p.baseX > this.width + 50) p.baseX = -30;
    }

    triggerScatter() {
      if (!finePointerQuery.matches || isMobile()) return;

      const mx = this.mouse.x;
      const my = this.mouse.y;
      const now = performance.now();
      const radius = this.mode === "hero" ? 255 : 240;

      this.mouse.active = false;
      this.mouse.idle = true;

      for (const p of this.particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > radius) continue;

        const influence = Math.pow(1 - dist / radius, 1.10);
        const power = random(16, 30) * influence;
        p.scatterX = (dx / dist) * power;
        p.scatterY = (dy / dist) * power;
        p.scatterStart = now;
        p.scatterDuration = random(760, 1360);
        p.scatterPower = power;
      }
    }

    drawHeroConstellation(time) {
      const ctx = this.ctx;
      const candidates = this.particles.filter((p) => p.linkable);
      const linkCount = new Map();
      const mouseActive = this.mouse.active && this.mouse.inside && finePointerQuery.matches;

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";

      for (let i = 0; i < candidates.length; i += 1) {
        const a = candidates[i];
        for (let j = i + 1; j < candidates.length; j += 1) {
          const b = candidates[j];
          const distMax = 155;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > distMax) continue;

          const mouseDist = Math.min(
            Math.hypot(a.x - this.mouse.x, a.y - this.mouse.y),
            Math.hypot(b.x - this.mouse.x, b.y - this.mouse.y),
          );
          const nearMouse = mouseActive && mouseDist < 245;
          if (!nearMouse && Math.abs(a.linkSeed - b.linkSeed) > 0.21) continue;
          if (!nearMouse && a.x < this.width * 0.43 && b.x < this.width * 0.43) continue;

          const maxLinks = nearMouse ? 2 : 1;
          if ((linkCount.get(a) || 0) >= maxLinks || (linkCount.get(b) || 0) >= maxLinks) continue;

          const breathe = 0.64 + Math.sin(time * 0.0012 + a.phase + b.phase) * 0.24;
          const proximity = 1 - dist / distMax;
          const mouseBoost = nearMouse ? (1 - mouseDist / 245) * 0.14 : 0;
          const factor = Math.min(this.textFactor(a.x, a.y), this.textFactor(b.x, b.y));
          let alpha = clamp((0.06 + proximity * 0.15 + mouseBoost) * breathe * factor, 0.04, 0.28);
          if (alpha < 0.028) continue;

          const color = LINK_COLORS[(i + j) % LINK_COLORS.length];
          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, rgba(color, alpha * 0.45));
          gradient.addColorStop(0.5, rgba(color, alpha));
          gradient.addColorStop(1, rgba(color, alpha * 0.45));
          ctx.strokeStyle = gradient;
          ctx.lineWidth = nearMouse ? 1.05 : 0.85;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          linkCount.set(a, (linkCount.get(a) || 0) + 1);
          linkCount.set(b, (linkCount.get(b) || 0) + 1);
        }
      }
      ctx.restore();
    }

    drawHeroParticles(time) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (const p of this.particles) {
        const factor = this.textFactor(p.x, p.y);
        const color = DARK_GLOW_COLORS[p.colorIndex % DARK_GLOW_COLORS.length];
        const wave = 0.5 + Math.sin(time * p.twinkle + p.phase) * 0.5;
        const pulse = 0.5 + wave * 0.52;
        const focusBoost = p.focus * 0.43;
        const alpha = clamp((p.alpha * pulse + focusBoost) * factor, 0.03, 0.86);

        if (p.kind === "petal") {
          /* 深色花瓣(尖瓣): 保持原样 */
          const s = p.size;
          ctx.save();
          ctx.translate(p.x, p.y);
          const breezeTilt = Math.sin(time * p.swaySpeed + p.phase) * 0.7;
          ctx.rotate(breezeTilt);
          ctx.lineWidth = Math.max(0.45, s * 0.14);
          ctx.fillStyle = rgba(color, alpha * 0.12);
          ctx.strokeStyle = rgba(color, alpha * 0.62);
          ctx.beginPath();
          /* 尖瓣(默认) */
          ctx.moveTo(0, s);
          ctx.bezierCurveTo(-s * 0.72, s * 0.28, -s * 0.7, -s * 0.58, -s * 0.2, -s * 0.78);
          ctx.quadraticCurveTo(0, -s * 0.45, s * 0.2, -s * 0.78);
          ctx.bezierCurveTo(s * 0.7, -s * 0.58, s * 0.72, s * 0.28, 0, s);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          continue;
        }

        const radius = p.size * p.halo;
        const hazeScale = p.kind === "haze" ? 0.62 : 1;
        const sprite = this.glowSprite(p.colorIndex);
        /* 光晕: sprite 缩放绘制取代 createRadialGradient(见 glowSprite 注释的等价性推导) */
        ctx.globalAlpha = alpha * hazeScale;
        ctx.drawImage(sprite, p.x - radius, p.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1;

        if (p.kind === "haze") {
          /* 雾团小球: 取自同一张 sprite 的中心区(半径 0.34*size = 光晕半径的 0.02,
             sprite 中该处 alpha 恰为 0.68) → globalAlpha 补 1.3 使 0.68*1.3≈0.884≈原 0.86 */
          const hr = p.size * 0.34;
          ctx.globalAlpha = clamp(alpha * hazeScale * 1.3, 0, 1);
          ctx.drawImage(sprite, p.x - hr, p.y - hr, hr * 2, hr * 2);
          ctx.globalAlpha = 1;
        } else {
          /* 实心小球: 纯色填充无渐变可缓存, 保留 arc+fill(成本极低) */
          ctx.fillStyle = rgba(color, alpha * 0.86);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.52, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.linkable && wave > 0.87) {
          const ray = p.size * (1.8 + wave * 1.5);
          ctx.strokeStyle = rgba(color, alpha * 0.38);
          ctx.lineWidth = Math.max(0.35, p.size * 0.24);
          ctx.beginPath();
          ctx.moveTo(p.x - ray, p.y);
          ctx.lineTo(p.x + ray, p.y);
          ctx.moveTo(p.x, p.y - ray);
          ctx.lineTo(p.x, p.y + ray);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    update(time) {
      const rawDt = time - this.lastTime;
      const dt = clamp(rawDt, 12, 34);
      this.lastTime = time;

      for (const p of this.particles) this.updateHeroParticle(p, time, dt);
    }

    draw(time, shouldUpdate) {
      const ctx = this.ctx;
      if (shouldUpdate) this.update(time);

      ctx.clearRect(0, 0, this.width, this.height);
      this.drawHeroConstellation(time);
      this.drawHeroParticles(time);
    }

    pointerToHost(event) {
      const r = this.host.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    }

    onPointerMove(event) {
      if (!finePointerQuery.matches || isMobile()) return;
      const p = this.pointerToHost(event);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.inside = p.x >= 0 && p.x <= this.width && p.y >= 0 && p.y <= this.height;
      this.mouse.active = this.mouse.inside;
      this.mouse.idle = false;

      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.triggerScatter(), 360);
    }

    onPointerLeave() {
      if (!finePointerQuery.matches || isMobile()) return;
      this.triggerScatter();
      this.mouse.inside = false;
    }
  }

  function setupScenes() {
    scenes.length = 0;

    const hero = document.getElementById("hero");
    const heroCanvas = document.getElementById("nova-particle-canvas") ||
      document.getElementById("hero-galaxy-canvas");
    if (hero && heroCanvas && !isMusicSection(hero)) {
      scenes.push(new RoseGalaxyScene(hero, heroCanvas, "hero"));
    }
  }

  function loop(time) {
    if (document.hidden) {
      rafId = 0;
      lastFrameTime = 0;
      window.__novaRoseGalaxy.rafId = 0;
      return;
    }
    if (!lastFrameTime || time - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = time - ((time - lastFrameTime) % FRAME_INTERVAL);
      for (const scene of scenes) {
        if (scene.visible) scene.draw(time, true);
      }
    }
    rafId = window.requestAnimationFrame(loop);
    window.__novaRoseGalaxy.rafId = rafId;
  }

  function resizeAll() {
    if (!scenes.length) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      for (const scene of scenes) scene.resize();
    }, 120);
  }

  function handleVisibility() {
    if (!reducedMotionQuery.matches && !document.hidden && !rafId && scenes.length) {
      lastFrameTime = 0;
      rafId = window.requestAnimationFrame(loop);
      window.__novaRoseGalaxy.rafId = rafId;
    }
  }

  function destroy() {
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(resizeTimer);
    rafId = 0;
    resizeTimer = 0;
    lastFrameTime = 0;
    scenes.splice(0).forEach((scene) => scene.destroy());
    /* P1 修复(2026-09-11): 原先从不 disconnect —— observer 会一直持有已被 PJAX 移除的
       hero 元素引用, 且下次 init 因旧对象存在而不再观察新 hero。 */
    window.__novaHeroRO?.disconnect();
    window.__novaHeroRO = null;
    window.__novaRoseGalaxy.running = false;
    window.__novaRoseGalaxy.rafId = 0;
  }

  function init() {
    if (reducedMotionQuery.matches) {
      destroy();
      return;
    }
    const hero = document.getElementById("hero");
    if (
      scenes.length &&
      scenes.some((scene) => scene.host === hero) &&
      scenes.every((scene) => scene.host.isConnected)
    ) {
      return;
    }
    destroy();
    setupScenes();
    if (!scenes.length) return;
    /* 布局延迟: hero 初始可能未布局(尺寸 0), 粒子会挤在 0 尺寸画布。
       ResizeObserver 在 hero 尺寸就绪时自动重建粒子。 */
    const heroEl = document.getElementById("hero");
    if (heroEl) {
      /* P1 修复(2026-09-11): 原先写的是 `if (heroEl && !window.__novaHeroRO)`, 于是第二次
         PJAX 进入首页时该对象已存在 —— 新的 #hero 永远不会被观察, 上面承诺的
         "0 尺寸自动重建粒子"随之失效。改为每次都重建 observer 并观察当前 hero;
         旧的先 disconnect, 避免持有已移除元素的引用。 */
      window.__novaHeroRO?.disconnect();
      window.__novaHeroRO = new ResizeObserver(() => resizeAll());
      window.__novaHeroRO.observe(heroEl);
    }
    window.__novaRoseGalaxy.running = true;
    lastFrameTime = 0;
    rafId = window.requestAnimationFrame(loop);
    window.__novaRoseGalaxy.rafId = rafId;
  }

  const syncTheme = () => {
    if (!window.document?.documentElement) return;
    /* P1 修复(2026-09-11): 原先主题变化时先 for (scene) scene.resize(), 紧接着
       init() 又走一遍 —— 粒子位置随机跳变两次; 而粒子颜色取自固定的 DARK_GLOW_COLORS,
       本就与主题无关, 这次重建纯属浪费。现在只走 init(): 深浅态由 CSS 负责, 粒子无需重建。
       (阶段5 · 5.3 后 resize() 本身也不再重随粒子, 只按比例缩放, 此处保持只走 init。) */
    init();
  };

  const themeObserver = new MutationObserver((records) => {
    if (records.some((record) => record.attributeName === "data-theme")) syncTheme();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.__novaRoseGalaxy = { running: false, rafId: 0, init, destroy, syncTheme };
  window.addEventListener("resize", resizeAll, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  document.addEventListener("pjax:send", destroy);
  document.addEventListener("pjax:complete", init);

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", () => {
      if (reducedMotionQuery.matches) destroy();
      else init();
    });
  } else if (reducedMotionQuery.addListener) {
    reducedMotionQuery.addListener(() => {
      if (reducedMotionQuery.matches) destroy();
      else init();
    });
  }

  init();
})();
