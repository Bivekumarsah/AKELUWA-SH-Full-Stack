"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Isolated, dependency-free interactive concept for the company homepage.
 * Not mounted on production pages until approved and tested.
 */
export function ImmersiveHeroPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const platforms = [
    { name: "AKELUWA ToolBox", detail: "Free online tools", href: "/akeluwatoolbox/", color: "#40baff" },
    { name: "AKELUWA PublicInfoHub", detail: "Public information", href: "/publicinfohub/", color: "#32dfb6" },
    { name: "Custom Software", detail: "Business applications", href: "/services", color: "#ffa85c" },
  ];
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let width = 0, height = 0, frame = 0, angle = 0.4, tilt = 0.15, dragging = false;
    let lastX = 0, lastY = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const down = (event: PointerEvent) => {
      dragging = true; lastX = event.clientX; lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      angle += (event.clientX - lastX) * 0.008;
      tilt = Math.max(-0.7, Math.min(0.7, tilt + (event.clientY - lastY) * 0.005));
      lastX = event.clientX; lastY = event.clientY;
    };
    const up = () => { dragging = false; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const draw = () => {
      context.clearRect(0, 0, width, height);
      const radius = Math.min(width * 0.32, height * 0.35, 225);
      const cx = width / 2, cy = height / 2;
      const sphere = context.createRadialGradient(cx-radius*0.35, cy-radius*0.4, 4, cx, cy, radius);
      if (theme === "dark") {
        sphere.addColorStop(0, "#1e5da4"); sphere.addColorStop(0.7, "#0b2857"); sphere.addColorStop(1, "#030b1d");
      } else {
        sphere.addColorStop(0, "#e4f4ff"); sphere.addColorStop(0.7, "#8ec1fa"); sphere.addColorStop(1, "#2863ac");
      }
      context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI*2);
      context.fillStyle = sphere; context.fill();
      context.strokeStyle = platforms[active].color;
      context.lineWidth = 1.5; context.shadowColor = platforms[active].color;
      context.shadowBlur = 18; context.stroke(); context.shadowBlur = 0;
      const project = (lat: number, lon: number) => {
        const x = Math.cos(lat)*Math.cos(lon+angle);
        const y = Math.sin(lat);
        const z = Math.cos(lat)*Math.sin(lon+angle);
        return {x:cx+x*radius, y:cy-(y*Math.cos(tilt)-z*Math.sin(tilt))*radius, visible:y*Math.sin(tilt)+z*Math.cos(tilt)>0};
      };
      context.save(); context.beginPath(); context.arc(cx, cy, radius-1, 0, Math.PI*2); context.clip();
      context.strokeStyle = theme === "dark" ? "#89c7ff55" : "#1553a555";
      context.lineWidth = 0.8;
      for (let lat=-75; lat<=75; lat+=15) {
        context.beginPath(); let started=false;
        for(let lon=-180; lon<=180; lon+=3) {
          const p=project(lat*Math.PI/180,lon*Math.PI/180);
          if(!p.visible){started=false;continue;}
          if(!started){context.moveTo(p.x,p.y);started=true;}else context.lineTo(p.x,p.y);
        }
        context.stroke();
      }
      for(let lon=0;lon<360;lon+=15){
        context.beginPath();let started=false;
        for(let lat=-90;lat<=90;lat+=3){
          const p=project(lat*Math.PI/180,lon*Math.PI/180);
          if(!p.visible){started=false;continue;}
          if(!started){context.moveTo(p.x,p.y);started=true;}else context.lineTo(p.x,p.y);
        }
        context.stroke();
      }
      context.restore();
      context.save(); context.translate(cx,cy); context.rotate(-0.3);
      context.beginPath();context.ellipse(0,0,radius*1.43,radius*0.32,0,0,Math.PI*2);
      context.strokeStyle=platforms[active].color;context.lineWidth=2;
      context.shadowColor=platforms[active].color;context.shadowBlur=14;context.stroke();
      context.restore();
      if(!reduced && !dragging) angle+=0.002;
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);observer.disconnect();
      canvas.removeEventListener("pointerdown",down);
      canvas.removeEventListener("pointermove",move);
      canvas.removeEventListener("pointerup",up);
      canvas.removeEventListener("pointercancel",up);
    };
  }, [active,theme]);
  return (
    <section className={`ak-immersive ${theme}`} aria-label="Explore AKELUWA platforms">
      <div className="ak-immersive-copy">
        <p>FROM NEPAL TO THE WORLD</p>
        <h2>Building the <span>digital future.</span></h2>
        <p>Discover software solutions, free digital tools, and accessible public information.</p>
        <Link href={platforms[active].href}>Explore {platforms[active].name} →</Link>
        <button type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={`Switch to ${theme==="dark"?"light":"dark"} mode`}> {theme==="dark"?"☀ Light":"☾ Dark"} </button>
      </div>
      <canvas ref={canvasRef} className="ak-immersive-canvas" aria-label="Rotatable digital globe. Drag to rotate." />
      <nav className="ak-immersive-platforms" aria-label="Choose platform">
        {platforms.map((platform,index)=><button type="button" key={platform.name} onClick={()=>setActive(index)} aria-pressed={active===index}><strong>{platform.name}</strong><small>{platform.detail}</small></button>)}
      </nav>
      <style jsx>{`
        .ak-immersive{position:relative;isolation:isolate;min-height:610px;overflow:hidden;border-radius:24px;background:radial-gradient(ellipse at 65% 45%,#133970,#06142e 65%,#030a18);color:#fff;padding:clamp(24px,4vw,64px);display:flex;flex-direction:column;justify-content:space-between}
        .ak-immersive.light{background:radial-gradient(ellipse at 65% 45%,#c5e0ff,#f1f7ff 65%,#fff);color:#102345}
        .ak-immersive-copy{position:relative;z-index:2;max-width:410px;pointer-events:none}
        .ak-immersive-copy p:first-child{font-size:11px;letter-spacing:.22em;color:#59c6ff}
        .ak-immersive-copy h2{font-size:clamp(36px,4.5vw,72px);line-height:1.06;letter-spacing:-.055em;margin:20px 0}
        .ak-immersive-copy h2 span{background:linear-gradient(100deg,#2ecbff,#8d80ff);background-clip:text;color:transparent}
        .ak-immersive-copy p{font-size:15px;line-height:1.7;opacity:.85}
        .ak-immersive-copy a,.ak-immersive-copy button{pointer-events:auto;display:inline-block;margin:14px 10px 0 0;padding:12px 18px;border:1px solid #6f9bc6;border-radius:10px;color:inherit;background:#357af322;font-size:13px;cursor:pointer}
        .ak-immersive-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y;cursor:grab}
        .ak-immersive-platforms{z-index:2;display:flex;gap:12px;flex-wrap:wrap}
        .ak-immersive-platforms button{flex:1;min-width:160px;text-align:left;border:1px solid #6592bf66;border-radius:14px;padding:16px;background:#0e2c52db;color:white;cursor:pointer}
        .light .ak-immersive-platforms button{background:#ffffffdb;color:#142a4b}
        .ak-immersive-platforms button[aria-pressed="true"]{border-color:#4cc7ff;box-shadow:0 0 18px #278cff33}
        .ak-immersive-platforms strong,.ak-immersive-platforms small{display:block}
        .ak-immersive-platforms strong{font-size:13px}.ak-immersive-platforms small{font-size:11px;margin-top:5px;opacity:.75}
        @media(max-width:700px){.ak-immersive{min-height:740px}.ak-immersive-copy{max-width:320px}.ak-immersive-platforms{margin-top:350px}.ak-immersive-platforms button{min-width:120px;padding:12px}}
        @media(prefers-reduced-motion:reduce){.ak-immersive *{scroll-behavior:auto}}
      `}</style>
    </section>
  );
}
