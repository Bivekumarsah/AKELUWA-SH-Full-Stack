"use client";

import { useEffect, useRef, useState } from "react";

export default function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const context = canvas.getContext("2d");
      context?.scale(ratio, ratio);
      if (context) {
        context.strokeStyle = "#f5f1e8";
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineJoin = "round";
      }
    };
    resize();
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const position = point(event);
    context?.beginPath();
    context?.moveTo(position.x, position.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const position = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.lineTo(position.x, position.y);
    context?.stroke();
    ink.current = true;
    setHasInk(true);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    event.currentTarget.getContext("2d")?.closePath();
    if (ink.current) onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    ink.current = false;
    onChange("");
  }

  return <div className="signature-pad"><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label="Draw your signature" /><div><span>Draw signature above</span><button type="button" onClick={clear} disabled={!hasInk}>Clear</button></div></div>;
}
