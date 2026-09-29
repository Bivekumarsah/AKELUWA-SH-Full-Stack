"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Redo2, Undo2 } from "lucide-react";

type Point = { x: number; y: number };
type Stroke = Point[];

export default function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoRef = useRef<Stroke[]>([]);
  const activeStroke = useRef<Stroke | null>(null);
  const [history, setHistory] = useState({ strokes: 0, redo: 0 });

  const draw = useCallback((preview?: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context || !rect.width || !rect.height) return;
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#172554";
    context.fillStyle = "#172554";
    context.lineWidth = 2.35;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of preview ? [...strokesRef.current, preview] : strokesRef.current) {
      if (stroke.length === 1) {
        context.beginPath();
        context.arc(stroke[0].x * rect.width, stroke[0].y * rect.height, 1.2, 0, Math.PI * 2);
        context.fill();
        continue;
      }
      context.beginPath();
      context.moveTo(stroke[0].x * rect.width, stroke[0].y * rect.height);
      for (let index = 1; index < stroke.length - 1; index += 1) {
        const point = stroke[index];
        const next = stroke[index + 1];
        context.quadraticCurveTo(
          point.x * rect.width,
          point.y * rect.height,
          ((point.x + next.x) / 2) * rect.width,
          ((point.y + next.y) / 2) * rect.height,
        );
      }
      const last = stroke[stroke.length - 1];
      context.lineTo(last.x * rect.width, last.y * rect.height);
      context.stroke();
    }
  }, []);

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    onChange(canvas && strokesRef.current.length ? canvas.toDataURL("image/png") : "");
    setHistory({ strokes: strokesRef.current.length, redo: redoRef.current.length });
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(activeStroke.current || undefined);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [draw]);

  function point(event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStroke.current = [point(event)];
    draw(activeStroke.current);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent];
    activeStroke.current.push(...samples.map(point));
    draw(activeStroke.current);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const stroke = activeStroke.current;
    activeStroke.current = null;
    const distance = stroke.slice(1).reduce((total, current, index) => {
      const previous = stroke[index];
      return total + Math.hypot(current.x - previous.x, current.y - previous.y);
    }, 0);
    if (stroke.length < 2 || distance < 0.015) {
      draw();
      return;
    }
    strokesRef.current.push(stroke);
    redoRef.current = [];
    draw();
    emit();
  }

  function clear() {
    redoRef.current = [];
    strokesRef.current = [];
    draw();
    emit();
  }

  function undo() {
    const stroke = strokesRef.current.pop();
    if (!stroke) return;
    redoRef.current.push(stroke);
    draw();
    emit();
  }

  function redo() {
    const stroke = redoRef.current.pop();
    if (!stroke) return;
    strokesRef.current.push(stroke);
    draw();
    emit();
  }

  function keyboard(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  }

  return <div className="signature-pad">
    <canvas ref={canvasRef} tabIndex={0} onKeyDown={keyboard} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label="Signature drawing area" />
    <div><span aria-live="polite">{history.strokes ? `${history.strokes} stroke${history.strokes === 1 ? "" : "s"} recorded` : "Sign inside the area above"}</span><div className="signature-tools">
      <button type="button" onClick={undo} disabled={!history.strokes} aria-label="Undo last signature stroke" title="Undo"><Undo2 size={16} aria-hidden="true" /></button>
      <button type="button" onClick={redo} disabled={!history.redo} aria-label="Redo signature stroke" title="Redo"><Redo2 size={16} aria-hidden="true" /></button>
      <button type="button" onClick={clear} disabled={!history.strokes} aria-label="Erase signature" title="Erase signature"><Eraser size={16} aria-hidden="true" /></button>
    </div></div>
  </div>;
}
