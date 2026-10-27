import { useEffect, useRef, useState } from "react";
import { IPhoneMockup } from "@/components/IPhoneMockup";

declare const gsap: any;
declare const THREE: any;

export type LuminaSlide = {
  title: string;
  description: string;
  media: string;
  navLabel?: string;
  links?: { label: string; href: string }[];
  showPhone?: boolean;
};

type Props = {
  slides: LuminaSlide[];
};

const APP_STORE =
  "https://apps.apple.com/us/app/gated-event-discovery/id6806819801";

export function LuminaInteractiveList({ slides }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const showPhone = !!slides[activeSlide]?.showPhone;

  useEffect(() => {
    setLoaded(false);
    let disposed = false;
    let renderer: any = null;
    let progressAnimation: any = null;
    let autoSlideTimer: any = null;
    let rafId = 0;
    let onVisibility: (() => void) | null = null;
    let onResize: (() => void) | null = null;
    let onPhoneInteract: ((e: Event) => void) | null = null;
    let onWheel: ((e: WheelEvent) => void) | null = null;
    let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onTouchStart: ((e: TouchEvent) => void) | null = null;
    let onTouchEnd: ((e: TouchEvent) => void) | null = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let touchNavEnabled = false;

    const loadScripts = async () => {
      const loadScript = (src: string, globalName: string) =>
        new Promise<void>((res, rej) => {
          if ((window as any)[globalName]) {
            res();
            return;
          }
          if (document.querySelector(`script[src="${src}"]`)) {
            const check = setInterval(() => {
              if ((window as any)[globalName]) {
                clearInterval(check);
                res();
              }
            }, 50);
            setTimeout(() => {
              clearInterval(check);
              rej(new Error(`Timeout waiting for ${globalName}`));
            }, 10000);
            return;
          }
          const s = document.createElement("script");
          s.src = src;
          s.onload = () => {
            setTimeout(() => res(), 100);
          };
          s.onerror = () => rej(new Error(`Failed to load ${src}`));
          document.head.appendChild(s);
        });

      try {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js",
          "gsap",
        );
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
          "THREE",
        );
      } catch (e) {
        console.error("Failed to load base scripts:", e);
        return;
      }

      if (!disposed) initApplication();
    };

    const initApplication = async () => {
      const SLIDER_CONFIG: any = {
        settings: {
          transitionDuration: 1.2,
          autoSlideSpeed: 8000,
          currentEffect: "glass",
          currentEffectPreset: "Default",
          globalIntensity: 1.0,
          speedMultiplier: 1.0,
          distortionStrength: 1.0,
          colorEnhancement: 1.0,
          glassRefractionStrength: 1.0,
          glassChromaticAberration: 1.0,
          glassBubbleClarity: 1.0,
          glassEdgeGlow: 1.0,
          glassLiquidFlow: 1.0,
          frostIntensity: 1.5,
          frostCrystalSize: 1.0,
          frostIceCoverage: 1.0,
          frostTemperature: 1.0,
          frostTexture: 1.0,
          rippleFrequency: 25.0,
          rippleAmplitude: 0.08,
          rippleWaveSpeed: 1.0,
          rippleRippleCount: 1.0,
          rippleDecay: 1.0,
          plasmaIntensity: 1.2,
          plasmaSpeed: 0.8,
          plasmaEnergyIntensity: 0.4,
          plasmaContrastBoost: 0.3,
          plasmaTurbulence: 1.0,
          timeshiftDistortion: 1.6,
          timeshiftBlur: 1.5,
          timeshiftFlow: 1.4,
          timeshiftChromatic: 1.5,
          timeshiftTurbulence: 1.4,
        },
      };

      let currentSlideIndex = 0;
      let isTransitioning = false;
      let pendingSlideIndex: number | null = null;
      let activeTransition: any = null;
      let scrollGestureActive = false;
      let scrollAccum = 0;
      let scrollSettleTimer: ReturnType<typeof setTimeout> | null = null;
      let scrollUnlockTimer: ReturnType<typeof setTimeout> | null = null;
      let shaderMaterial: any;
      let scene: any;
      let camera: any;
      const slideTextures: any[] = [];
      let texturesLoaded = false;
      let sliderEnabled = false;

      const SLIDE_DURATION = () =>
        slides[currentSlideIndex]?.showPhone
          ? Math.max(SLIDER_CONFIG.settings.autoSlideSpeed, 14000)
          : SLIDER_CONFIG.settings.autoSlideSpeed;
      const PROGRESS_UPDATE_INTERVAL = 50;
      const TRANSITION_DURATION = () => SLIDER_CONFIG.settings.transitionDuration;

      const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
      const fragmentShader = `
            uniform sampler2D uTexture1, uTexture2;
            uniform float uProgress;
            uniform vec2 uResolution, uTexture1Size, uTexture2Size;
            uniform int uEffectType;
            uniform float uGlobalIntensity, uSpeedMultiplier, uDistortionStrength, uColorEnhancement;
            uniform float uGlassRefractionStrength, uGlassChromaticAberration, uGlassBubbleClarity, uGlassEdgeGlow, uGlassLiquidFlow;
            uniform float uFrostIntensity, uFrostCrystalSize, uFrostIceCoverage, uFrostTemperature, uFrostTexture;
            uniform float uRippleFrequency, uRippleAmplitude, uRippleWaveSpeed, uRippleRippleCount, uRippleDecay;
            uniform float uPlasmaIntensity, uPlasmaSpeed, uPlasmaEnergyIntensity, uPlasmaContrastBoost, uPlasmaTurbulence;
            uniform float uTimeshiftDistortion, uTimeshiftBlur, uTimeshiftFlow, uTimeshiftChromatic, uTimeshiftTurbulence;
            varying vec2 vUv;

            vec2 getCoverUV(vec2 uv, vec2 textureSize) {
                vec2 s = uResolution / textureSize;
                float scale = max(s.x, s.y);
                vec2 scaledSize = textureSize * scale;
                vec2 offset = (uResolution - scaledSize) * 0.5;
                return (uv * uResolution - offset) / scaledSize;
            }

            vec4 glassEffect(vec2 uv, float progress) {
                float time = progress * 5.0 * uSpeedMultiplier;
                vec2 uv1 = getCoverUV(uv, uTexture1Size); vec2 uv2 = getCoverUV(uv, uTexture2Size);
                float maxR = length(uResolution) * 0.85; float br = progress * maxR;
                vec2 p = uv * uResolution; vec2 c = uResolution * 0.5;
                float d = length(p - c); float nd = d / max(br, 0.001);
                float param = smoothstep(br + 3.0, br - 3.0, d);
                vec4 img;
                if (param > 0.0) {
                     float ro = 0.08 * uGlassRefractionStrength * uDistortionStrength * uGlobalIntensity * pow(smoothstep(0.3 * uGlassBubbleClarity, 1.0, nd), 1.5);
                     vec2 dir = (d > 0.0) ? (p - c) / d : vec2(0.0);
                     vec2 distUV = uv2 - dir * ro;
                     distUV += vec2(sin(time + nd * 10.0), cos(time * 0.8 + nd * 8.0)) * 0.015 * uGlassLiquidFlow * uSpeedMultiplier * nd * param;
                     float ca = 0.02 * uGlassChromaticAberration * uGlobalIntensity * pow(smoothstep(0.3, 1.0, nd), 1.2);
                     img = vec4(texture2D(uTexture2, distUV + dir * ca * 1.2).r, texture2D(uTexture2, distUV + dir * ca * 0.2).g, texture2D(uTexture2, distUV - dir * ca * 0.8).b, 1.0);
                     if (uGlassEdgeGlow > 0.0) {
                        float rim = smoothstep(0.95, 1.0, nd) * (1.0 - smoothstep(1.0, 1.01, nd));
                        img.rgb += rim * 0.08 * uGlassEdgeGlow * uGlobalIntensity;
                     }
                } else { img = texture2D(uTexture2, uv2); }
                vec4 oldImg = texture2D(uTexture1, uv1);
                if (progress > 0.95) img = mix(img, texture2D(uTexture2, uv2), (progress - 0.95) / 0.05);
                return mix(oldImg, img, param);
            }
            vec4 frostEffect(vec2 uv, float progress) { return mix(texture2D(uTexture1, getCoverUV(uv, uTexture1Size)), texture2D(uTexture2, getCoverUV(uv, uTexture2Size)), progress); }
            vec4 rippleEffect(vec2 uv, float progress) { return mix(texture2D(uTexture1, getCoverUV(uv, uTexture1Size)), texture2D(uTexture2, getCoverUV(uv, uTexture2Size)), progress); }
            vec4 plasmaEffect(vec2 uv, float progress) { return mix(texture2D(uTexture1, getCoverUV(uv, uTexture1Size)), texture2D(uTexture2, getCoverUV(uv, uTexture2Size)), progress); }
            vec4 timeshiftEffect(vec2 uv, float progress) { return mix(texture2D(uTexture1, getCoverUV(uv, uTexture1Size)), texture2D(uTexture2, getCoverUV(uv, uTexture2Size)), progress); }

            void main() {
                if (uEffectType == 0) gl_FragColor = glassEffect(vUv, uProgress);
                else if (uEffectType == 1) gl_FragColor = frostEffect(vUv, uProgress);
                else if (uEffectType == 2) gl_FragColor = rippleEffect(vUv, uProgress);
                else if (uEffectType == 3) gl_FragColor = plasmaEffect(vUv, uProgress);
                else gl_FragColor = timeshiftEffect(vUv, uProgress);
            }
        `;

      const getEffectIndex = (n: string) =>
        ({ glass: 0, frost: 1, ripple: 2, plasma: 3, timeshift: 4 } as any)[n] ||
        0;

      const updateShaderUniforms = () => {
        if (!shaderMaterial) return;
        const s = SLIDER_CONFIG.settings;
        const u = shaderMaterial.uniforms;
        for (const key in s) {
          const uName = "u" + key.charAt(0).toUpperCase() + key.slice(1);
          if (u[uName]) u[uName].value = s[key];
        }
        u.uEffectType.value = getEffectIndex(s.currentEffect);
      };

      const splitText = (text: string) =>
        text
          .split("")
          .map(
            (char) =>
              `<span style="display: inline-block; opacity: 0;">${char === " " ? "&nbsp;" : char}</span>`,
          )
          .join("");

      const renderSlideLinks = (idx: number) => {
        const linksEl = document.getElementById("slideLinks");
        if (!linksEl) return;
        const links = slides[idx].links ?? [];
        if (!links.length) {
          linksEl.innerHTML = "";
          linksEl.classList.add("is-empty");
          return;
        }
        linksEl.classList.remove("is-empty");
        linksEl.innerHTML = links
          .map(
            (l) =>
              `<a class="slide-link" href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`,
          )
          .join("");
      };

      const updateContent = (idx: number) => {
        const titleEl = document.getElementById("mainTitle");
        const descEl = document.getElementById("mainDesc");
        if (!titleEl || !descEl) return;

        gsap.killTweensOf([titleEl, descEl, ...Array.from(titleEl.children)]);

        const swap = () => {
          if (disposed) return;
          titleEl.innerHTML = splitText(slides[idx].title);
          descEl.textContent = slides[idx].description;
          renderSlideLinks(idx);
          gsap.fromTo(
            titleEl.children,
            { y: 14, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.018,
              ease: "power2.out",
            },
          );
          gsap.fromTo(
            descEl,
            { y: 10, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, delay: 0.08, ease: "power2.out" },
          );
        };

        if (!titleEl.children.length) {
          swap();
          return;
        }

        gsap.to(titleEl.children, {
          y: -10,
          opacity: 0,
          duration: 0.22,
          stagger: 0.01,
          ease: "power2.in",
        });
        gsap.to(descEl, {
          y: -6,
          opacity: 0,
          duration: 0.2,
          ease: "power2.in",
          onComplete: swap,
        });
      };

      const updateNavigationState = (idx: number) =>
        document
          .querySelectorAll(".slide-nav-item")
          .forEach((el, i) => el.classList.toggle("active", i === idx));

      const updateSlideProgress = (_idx: number, _prog: number) => {};
      const fadeSlideProgress = (_idx: number) => {};
      const quickResetProgress = (_idx: number) => {};

      const createSlidesNavigation = () => {
        const nav = document.getElementById("slidesNav");
        if (!nav) return;
        nav.innerHTML = "";
        slides.forEach((slide, i) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = `slide-nav-item${i === 0 ? " active" : ""}`;
          item.dataset.slideIndex = String(i);
          item.setAttribute(
            "aria-label",
            `Go to ${slide.navLabel ?? slide.title}`,
          );
          const label = slide.navLabel ?? slide.title;
          item.innerHTML = `<span class="slide-nav-title">${label}</span>`;
          item.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            stopAutoSlideTimer();
            navigateToSlide(i);
          });
          nav.appendChild(item);
        });
      };

      const updateCounter = (idx: number) => {
        const sn = document.getElementById("slideNumber");
        if (sn) sn.textContent = String(idx + 1).padStart(2, "0");
        const st = document.getElementById("slideTotal");
        if (st) st.textContent = String(slides.length).padStart(2, "0");
      };

      const stopAutoSlideTimer = () => {
        if (progressAnimation) clearInterval(progressAnimation);
        if (autoSlideTimer) clearTimeout(autoSlideTimer);
        progressAnimation = null;
        autoSlideTimer = null;
      };

      const startAutoSlideTimer = () => {
        if (!texturesLoaded || !sliderEnabled || disposed) return;
        stopAutoSlideTimer();
        let progress = 0;
        const increment =
          (100 / SLIDE_DURATION()) * PROGRESS_UPDATE_INTERVAL;
        progressAnimation = setInterval(() => {
          if (!sliderEnabled || disposed) {
            stopAutoSlideTimer();
            return;
          }
          progress += increment;
          updateSlideProgress(currentSlideIndex, progress);
          if (progress >= 100) {
            clearInterval(progressAnimation);
            progressAnimation = null;
            fadeSlideProgress(currentSlideIndex);
            if (!isTransitioning) handleSlideChange();
          }
        }, PROGRESS_UPDATE_INTERVAL);
      };

      const safeStartTimer = (delay = 0) => {
        stopAutoSlideTimer();
        if (sliderEnabled && texturesLoaded && !disposed) {
          if (delay > 0)
            autoSlideTimer = setTimeout(startAutoSlideTimer, delay);
          else startAutoSlideTimer();
        }
      };

      const navigateToSlide = (targetIndex: number) => {
        if (!texturesLoaded || !shaderMaterial) return;
        const next =
          ((targetIndex % slides.length) + slides.length) % slides.length;
        if (next === currentSlideIndex && !isTransitioning) return;

        if (isTransitioning) {
          pendingSlideIndex = next;
          return;
        }

        const currentTexture = slideTextures[currentSlideIndex];
        const targetTexture = slideTextures[next];
        if (!currentTexture || !targetTexture) return;

        stopAutoSlideTimer();
        quickResetProgress(currentSlideIndex);
        pendingSlideIndex = null;
        isTransitioning = true;

        shaderMaterial.uniforms.uTexture1.value = currentTexture;
        shaderMaterial.uniforms.uTexture2.value = targetTexture;
        shaderMaterial.uniforms.uTexture1Size.value =
          currentTexture.userData.size;
        shaderMaterial.uniforms.uTexture2Size.value =
          targetTexture.userData.size;
        shaderMaterial.uniforms.uProgress.value = 0;

        updateContent(next);
        currentSlideIndex = next;
        setActiveSlide(currentSlideIndex);
        updateCounter(currentSlideIndex);
        updateNavigationState(currentSlideIndex);

        if (activeTransition) activeTransition.kill();
        activeTransition = gsap.fromTo(
          shaderMaterial.uniforms.uProgress,
          { value: 0 },
          {
            value: 1,
            duration: TRANSITION_DURATION(),
            ease: "power3.inOut",
            onComplete: () => {
              if (disposed) return;
              shaderMaterial.uniforms.uProgress.value = 0;
              shaderMaterial.uniforms.uTexture1.value = targetTexture;
              shaderMaterial.uniforms.uTexture1Size.value =
                targetTexture.userData.size;
              isTransitioning = false;
              activeTransition = null;
              if (
                pendingSlideIndex !== null &&
                pendingSlideIndex !== currentSlideIndex
              ) {
                const queued = pendingSlideIndex;
                pendingSlideIndex = null;
                navigateToSlide(queued);
                return;
              }
              pendingSlideIndex = null;
              // Let trackpad inertia settle before accepting another scroll
              if (scrollUnlockTimer) clearTimeout(scrollUnlockTimer);
              scrollUnlockTimer = setTimeout(() => {
                scrollGestureActive = false;
                scrollAccum = 0;
              }, 320);
              safeStartTimer(220);
            },
          },
        );
      };

      const handleSlideChange = () => {
        if (!texturesLoaded || !sliderEnabled) return;
        navigateToSlide(currentSlideIndex + 1);
      };

      const stepSlide = (dir: 1 | -1) => {
        if (!texturesLoaded || !sliderEnabled) return;
        navigateToSlide(currentSlideIndex + dir);
      };

      const normalizeWheelDelta = (e: WheelEvent) => {
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        if (e.deltaMode === 2) dy *= window.innerHeight;
        // Cap huge trackpad bursts so one flick = one page
        return Math.max(-120, Math.min(120, dy));
      };

      const loadImageTexture = (src: string) =>
        new Promise<any>((resolve, reject) => {
          const l = new THREE.TextureLoader();
          l.load(
            src,
            (t: any) => {
              t.minFilter = t.magFilter = THREE.LinearFilter;
              t.userData = {
                size: new THREE.Vector2(t.image.width, t.image.height),
              };
              resolve(t);
            },
            undefined,
            reject,
          );
        });

      const initRenderer = async () => {
        const canvas = document.querySelector(
          ".webgl-canvas",
        ) as HTMLCanvasElement;
        if (!canvas || disposed) return;
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        shaderMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTexture1: { value: null },
            uTexture2: { value: null },
            uProgress: { value: 0 },
            uResolution: {
              value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
            uTexture1Size: { value: new THREE.Vector2(1, 1) },
            uTexture2Size: { value: new THREE.Vector2(1, 1) },
            uEffectType: { value: 0 },
            uGlobalIntensity: { value: 1.0 },
            uSpeedMultiplier: { value: 1.0 },
            uDistortionStrength: { value: 1.0 },
            uColorEnhancement: { value: 1.0 },
            uGlassRefractionStrength: { value: 1.0 },
            uGlassChromaticAberration: { value: 1.0 },
            uGlassBubbleClarity: { value: 1.0 },
            uGlassEdgeGlow: { value: 1.0 },
            uGlassLiquidFlow: { value: 1.0 },
            uFrostIntensity: { value: 1.0 },
            uFrostCrystalSize: { value: 1.0 },
            uFrostIceCoverage: { value: 1.0 },
            uFrostTemperature: { value: 1.0 },
            uFrostTexture: { value: 1.0 },
            uRippleFrequency: { value: 25.0 },
            uRippleAmplitude: { value: 0.08 },
            uRippleWaveSpeed: { value: 1.0 },
            uRippleRippleCount: { value: 1.0 },
            uRippleDecay: { value: 1.0 },
            uPlasmaIntensity: { value: 1.2 },
            uPlasmaSpeed: { value: 0.8 },
            uPlasmaEnergyIntensity: { value: 0.4 },
            uPlasmaContrastBoost: { value: 0.3 },
            uPlasmaTurbulence: { value: 1.0 },
            uTimeshiftDistortion: { value: 1.6 },
            uTimeshiftBlur: { value: 1.5 },
            uTimeshiftFlow: { value: 1.4 },
            uTimeshiftChromatic: { value: 1.5 },
            uTimeshiftTurbulence: { value: 1.4 },
          },
          vertexShader,
          fragmentShader,
        });
        scene.add(
          new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial),
        );

        for (const s of slides) {
          try {
            slideTextures.push(await loadImageTexture(s.media));
          } catch {
            console.warn("Failed texture", s.media);
          }
        }
        if (disposed) return;

        if (slideTextures.length >= 1) {
          const first = slideTextures[0];
          const second = slideTextures[1] ?? slideTextures[0];
          shaderMaterial.uniforms.uTexture1.value = first;
          shaderMaterial.uniforms.uTexture2.value = second;
          shaderMaterial.uniforms.uTexture1Size.value = first.userData.size;
          shaderMaterial.uniforms.uTexture2Size.value = second.userData.size;
          texturesLoaded = true;
          sliderEnabled = slideTextures.length >= 2;
          updateShaderUniforms();
          setLoaded(true);
          if (sliderEnabled) safeStartTimer(500);
        }

        const render = () => {
          if (disposed) return;
          rafId = requestAnimationFrame(render);
          renderer.render(scene, camera);
        };
        render();
      };

      createSlidesNavigation();
      updateCounter(0);
      setActiveSlide(0);

      const tEl = document.getElementById("mainTitle");
      const dEl = document.getElementById("mainDesc");
      if (tEl && dEl) {
        tEl.innerHTML = splitText(slides[0].title);
        dEl.textContent = slides[0].description;
        renderSlideLinks(0);
        gsap.fromTo(
          tEl.children,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.03,
            ease: "power3.out",
            delay: 0.5,
          },
        );
        gsap.fromTo(
          dEl,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            delay: 0.8,
          },
        );
      }

      await initRenderer();

      onVisibility = () => {
        if (document.hidden) stopAutoSlideTimer();
        else if (!isTransitioning) safeStartTimer();
      };
      onResize = () => {
        if (!renderer || !shaderMaterial) return;
        renderer.setSize(window.innerWidth, window.innerHeight);
        shaderMaterial.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight,
        );
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("resize", onResize);

      onPhoneInteract = (e: Event) => {
        const interacting = (e as CustomEvent).detail === true;
        if (interacting) stopAutoSlideTimer();
        else if (!isTransitioning && !document.hidden) safeStartTimer(800);
      };
      window.addEventListener("lumina-phone-interact", onPhoneInteract);

      onWheel = (e: WheelEvent) => {
        if (!texturesLoaded || !sliderEnabled) return;
        const target = e.target as Element | null;
        if (target?.closest?.(".lumina-phone-stage")) return;
        e.preventDefault();
        stopAutoSlideTimer();

        const dy = normalizeWheelDelta(e);
        if (Math.abs(dy) < 1) return;

        // Mid-transition: remember latest intent, don't fight the current tween
        if (isTransitioning || scrollGestureActive) {
          if (Math.abs(dy) > 8) {
            pendingSlideIndex = currentSlideIndex + (dy > 0 ? 1 : -1);
          }
          if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
          scrollSettleTimer = setTimeout(() => {
            scrollAccum = 0;
          }, 180);
          return;
        }

        scrollAccum += dy;
        if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
        scrollSettleTimer = setTimeout(() => {
          scrollAccum = 0;
        }, 180);

        const threshold = 42;
        if (Math.abs(scrollAccum) < threshold) return;

        const dir: 1 | -1 = scrollAccum > 0 ? 1 : -1;
        scrollAccum = 0;
        scrollGestureActive = true;
        stepSlide(dir);
        if (!isTransitioning) scrollGestureActive = false;
      };
      window.addEventListener("wheel", onWheel, { passive: false });

      onKeyDown = (e: KeyboardEvent) => {
        if (!texturesLoaded || !sliderEnabled) return;
        if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
          e.preventDefault();
          if (scrollGestureActive || isTransitioning) return;
          scrollGestureActive = true;
          stepSlide(1);
        } else if (
          e.key === "ArrowUp" ||
          e.key === "ArrowLeft" ||
          e.key === "PageUp"
        ) {
          e.preventDefault();
          if (scrollGestureActive || isTransitioning) return;
          scrollGestureActive = true;
          stepSlide(-1);
        }
      };
      window.addEventListener("keydown", onKeyDown);

      onTouchStart = (e: TouchEvent) => {
        const target = e.target as Element | null;
        touchNavEnabled = !(
          target?.closest?.(".lumina-phone-stage") ||
          target?.closest?.(".lumina-topbar") ||
          target?.closest?.(".lumina-footer")
        );
        const t = e.changedTouches[0];
        if (!t) return;
        touchStartY = t.clientY;
        touchStartX = t.clientX;
      };
      onTouchEnd = (e: TouchEvent) => {
        if (!touchNavEnabled || scrollGestureActive || isTransitioning) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dy = t.clientY - touchStartY;
        const dx = t.clientX - touchStartX;
        if (Math.abs(dy) < 48 || Math.abs(dy) < Math.abs(dx) * 1.15) return;
        scrollGestureActive = true;
        stepSlide(dy < 0 ? 1 : -1);
      };
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
    };

    loadScripts();

    return () => {
      disposed = true;
      if (progressAnimation) clearInterval(progressAnimation);
      if (autoSlideTimer) clearTimeout(autoSlideTimer);
      if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
      if (scrollUnlockTimer) clearTimeout(scrollUnlockTimer);
      if (rafId) cancelAnimationFrame(rafId);
      if (onVisibility)
        document.removeEventListener("visibilitychange", onVisibility);
      if (onResize) window.removeEventListener("resize", onResize);
      if (onPhoneInteract)
        window.removeEventListener("lumina-phone-interact", onPhoneInteract);
      if (onWheel) window.removeEventListener("wheel", onWheel);
      if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
      if (onTouchStart)
        window.removeEventListener("touchstart", onTouchStart);
      if (onTouchEnd) window.removeEventListener("touchend", onTouchEnd);
      try {
        renderer?.dispose?.();
      } catch {
        /* ignore */
      }
    };
  }, [slides]);

  return (
    <main
      className={[
        "slider-wrapper",
        loaded ? "loaded" : "",
        showPhone ? "has-phone" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={containerRef}
    >
      <canvas className="webgl-canvas" />
      <div className="lumina-vignette" aria-hidden />

      <header className="lumina-topbar">
        <div className="lumina-brand">Gated</div>
        <a
          className="lumina-cta"
          href={APP_STORE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </header>

      <span className="slide-number" id="slideNumber">
        01
      </span>
      <span className="slide-total" id="slideTotal">
        {String(slides.length).padStart(2, "0")}
      </span>

      <div className="slide-content">
        <h1 className="slide-title" id="mainTitle" />
        <p className="slide-description" id="mainDesc" />
        <div className="slide-links is-empty" id="slideLinks" />
      </div>

      <div
        className={`lumina-phone-stage${showPhone ? " is-visible" : ""}`}
        aria-hidden={!showPhone}
        onPointerEnter={() => {
          window.dispatchEvent(new CustomEvent("lumina-phone-interact", { detail: true }));
        }}
        onPointerLeave={() => {
          window.dispatchEvent(new CustomEvent("lumina-phone-interact", { detail: false }));
        }}
      >
        <IPhoneMockup maxScale={0.92} skipIntro active={showPhone} />
      </div>

      <nav className="slides-navigation" id="slidesNav" aria-label="Sections" />

      <footer className="lumina-footer">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="mailto:support@gatedapp.us">Contact</a>
      </footer>
    </main>
  );
}

const base = import.meta.env.BASE_URL;

const GATED_SLIDES: LuminaSlide[] = [
  {
    title: "Gated.",
    description: "Campus life, unlocked.",
    navLabel: "Gated",
    media: `${base}lumina/slide-01.png`,
  },
  {
    title: "The App",
    description:
      "Swipe through the real product. Home, Discover, Profile, Map, and Tickets. See how campus nights actually work.",
    navLabel: "App",
    media: `${base}lumina/slide-app.png`,
    showPhone: true,
  },
  {
    title: "Discover",
    description:
      "Find campus events, buy tickets, and check in with a QR. Feed, map, and tickets in one place.",
    navLabel: "Discover",
    media: `${base}lumina/slide-02.png`,
  },
  {
    title: "Organizations",
    description:
      "Run your chapter. Sell tickets. Get paid. Publish in minutes, check in with QR, and keep 100% of ticket revenue.",
    navLabel: "Organizations",
    media: `${base}lumina/slide-03.png`,
  },
  {
    title: "Media",
    description: "Follow the journey on Instagram and TikTok.",
    navLabel: "Media",
    media: `${base}lumina/slide-04.png`,
    links: [
      { label: "Instagram", href: "https://instagram.com/thegatedapp" },
      { label: "TikTok", href: "https://www.tiktok.com/@thegatedapp" },
    ],
  },
];

export function Component() {
  return <LuminaInteractiveList slides={GATED_SLIDES} />;
}
