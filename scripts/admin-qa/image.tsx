/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from "react";
export default function FixtureImage({ fill, unoptimized, priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean; priority?: boolean }) {
  void unoptimized; void priority;
  return <img {...props} alt={props.alt ?? ""} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : props.style} />;
}
