import React from "react";
import { Vortex } from "@/components/ui/vortex";

export default function VortexDemoSecond({ containerClassName = "w-[calc(100%-4rem)] mx-auto rounded-md h-screen overflow-hidden" }: { containerClassName?: string }) {
  return (
    <div className={containerClassName}>
      <Vortex
        backgroundColor="transparent"
        rangeY={800}
        particleCount={500}
        baseHue={220}
        baseSpeed={0.02}
        rangeSpeed={0.5}
        baseRadius={2}
        rangeRadius={4}
        className="w-full h-full"
      />
    </div>
  );
}


