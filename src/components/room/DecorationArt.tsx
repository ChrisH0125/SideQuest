import type { DecorationId } from "@/lib/rewards";

export function DecorationArt({ item }: { item: DecorationId }) {
  return <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true" focusable="false" shapeRendering="crispEdges" stroke="#3b2451" strokeWidth="3">
    {(item === "rug" || item === "rainbow-rug") && <>
      <path fill={item === "rug" ? "#ff8b7b" : "#d7c8ff"} d="M8 23h64v36H8z" />
      {item === "rainbow-rug" ? ["#ff8b7b", "#ffe27a", "#aaf0d1", "#b8e7ff"].map((color, i) => <path key={color} fill={color} stroke="none" d={`M${12 + i * 14} 27h14v28H${12 + i * 14}z`} />) : <path fill="none" stroke="#fffbed" d="M16 31h48v20H16z" />}
      <path d="M4 27h4m-4 8h4m-4 8h4m-4 8h4m64-24h4m-4 8h4m-4 8h4m-4 8h4" />
    </>}
    {item === "plant" && <><path fill="#aaf0d1" d="M37 48V15h10v15h10V20h9v20H47v8zM37 37H19V22h9v6h9" /><path fill="#ff8b7b" d="M24 48h36v9H24zM28 57h28v15H28z" /></>}
    {item === "lamp" && <><path fill="#ffe27a" d="M23 10h34l10 29H13z" /><path fill="#a96850" d="M36 39h8v25h16v8H20v-8h16z" /></>}
    {item === "poster" && <><path fill="#fffbed" d="M13 7h54v66H13z" /><path fill="#b8e7ff" d="M20 14h40v40H20z" /><path fill="#aaf0d1" d="m21 53 14-20 10 12 8-10 7 18z" /><path fill="#ffe27a" d="M48 19h8v8h-8z" /><path d="M24 63h32" /></>}
    {item === "fish-bowl" && <><path fill="#b8e7ff" d="M21 17h38v9c20 27 4 45-19 45S1 53 21 26z" /><path fill="#fffbed" d="M19 11h42v7H19z" /><path fill="#ffad61" d="m27 45 9-7h14l7 7-7 8H36l-9-8-8 8V37z" /><path d="M48 43h2" /><path fill="#fffbed" stroke="none" d="M49 28h4v4h-4zM54 22h3v3h-3z" /></>}
  </svg>;
}
