"use client";
import Image from "next/image";
import { useRef } from "react";
import { ArrowUpRight, Check, Leaf, ScanLine } from "lucide-react";
export function FoodSculpture() {
  const scene = useRef<HTMLDivElement>(null);
  function tilt(event: React.PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    scene.current?.style.setProperty(
      "--tilt-x",
      `${((event.clientY - bounds.top) / bounds.height - 0.5) * -12}deg`,
    );
    scene.current?.style.setProperty(
      "--tilt-y",
      `${((event.clientX - bounds.left) / bounds.width - 0.5) * 12}deg`,
    );
  }
  function reset() {
    scene.current?.style.setProperty("--tilt-x", "0deg");
    scene.current?.style.setProperty("--tilt-y", "0deg");
  }
  return (
    <div
      className="food-scene"
      ref={scene}
      onPointerMove={tilt}
      onPointerLeave={reset}
      aria-hidden="true"
    >
      <div className="scene-grid" />
      <div className="scene-ring ring-one" />
      <div className="scene-ring ring-two" />
      <div className="scene-caption">
        FRESH THINKING.
        <br />
        EVERYDAY EATING.
      </div>
      <div className="sculpture">
        <div className="bowl-shadow" />
        <div className="bowl-base" />
        <div className="food-bowl">
          <Image
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop"
            alt=""
            fill
            priority
            sizes="(max-width: 700px) 280px, 400px"
            unoptimized
          />
          <span className="bowl-shine" />
        </div>
        <div className="floating-leaf leaf-one">
          <Leaf size={48} />
        </div>
        <div className="floating-leaf leaf-two">
          <Leaf size={32} />
        </div>
        <div className="scene-chip chip-scan">
          <span>
            <ScanLine size={20} />
          </span>
          <div>
            <strong>Look a little closer.</strong>
            <small>One scan. More clarity.</small>
          </div>
          <ArrowUpRight size={16} />
        </div>
        <div className="scene-chip chip-choice">
          <span>
            <Check size={15} />
          </span>
          Make an informed choice
        </div>
      </div>
      <span className="scene-smallprint">Illustrative food photography</span>
    </div>
  );
}
