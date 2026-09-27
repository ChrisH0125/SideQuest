// Pip the pixel cat. Pure SVG, no state.
// Sizes to whatever the parent gives; the internal grid is 32x32.

type PipProps = {
  size?: number;
  className?: string;
};

export function Pip({ size = 108, className }: PipProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      {/* ears */}
      <rect x="7" y="5" width="4" height="1" fill="#2d1b3d" />
      <rect x="6" y="6" width="6" height="1" fill="#2d1b3d" />
      <rect x="7" y="6" width="4" height="1" fill="#ff6f59" />
      <rect x="6" y="7" width="6" height="1" fill="#ff6f59" />
      <rect x="21" y="5" width="4" height="1" fill="#2d1b3d" />
      <rect x="20" y="6" width="6" height="1" fill="#2d1b3d" />
      <rect x="21" y="6" width="4" height="1" fill="#ff6f59" />
      <rect x="20" y="7" width="6" height="1" fill="#ff6f59" />
      {/* head */}
      <rect x="5" y="8" width="22" height="1" fill="#2d1b3d" />
      <rect x="4" y="9" width="1" height="8" fill="#2d1b3d" />
      <rect x="27" y="9" width="1" height="8" fill="#2d1b3d" />
      <rect x="5" y="9" width="22" height="8" fill="#ff6f59" />
      {/* stripes */}
      <rect x="6" y="10" width="3" height="1" fill="#d94d33" />
      <rect x="12" y="10" width="3" height="1" fill="#d94d33" />
      <rect x="18" y="10" width="3" height="1" fill="#d94d33" />
      <rect x="24" y="10" width="2" height="1" fill="#d94d33" />
      {/* eyes */}
      <rect x="10" y="12" width="2" height="3" fill="#2d1b3d" />
      <rect x="20" y="12" width="2" height="3" fill="#2d1b3d" />
      <rect x="11" y="12" width="1" height="1" fill="#fff6dc" />
      <rect x="21" y="12" width="1" height="1" fill="#fff6dc" />
      {/* cheeks + nose */}
      <rect x="6" y="14" width="2" height="1" fill="#ff9ec4" />
      <rect x="24" y="14" width="2" height="1" fill="#ff9ec4" />
      <rect x="15" y="14" width="2" height="1" fill="#ff9ec4" />
      <rect x="14" y="15" width="1" height="1" fill="#2d1b3d" />
      <rect x="17" y="15" width="1" height="1" fill="#2d1b3d" />
      {/* body outline */}
      <rect x="7" y="17" width="18" height="1" fill="#2d1b3d" />
      <rect x="6" y="18" width="20" height="1" fill="#2d1b3d" />
      <rect x="6" y="19" width="1" height="5" fill="#2d1b3d" />
      <rect x="25" y="19" width="1" height="5" fill="#2d1b3d" />
      <rect x="7" y="18" width="18" height="6" fill="#ff6f59" />
      {/* belly */}
      <rect x="12" y="20" width="8" height="3" fill="#ffb094" />
      {/* feet */}
      <rect x="8" y="24" width="4" height="1" fill="#ff6f59" />
      <rect x="20" y="24" width="4" height="1" fill="#ff6f59" />
      <rect x="7" y="24" width="1" height="1" fill="#2d1b3d" />
      <rect x="12" y="24" width="1" height="1" fill="#2d1b3d" />
      <rect x="19" y="24" width="1" height="1" fill="#2d1b3d" />
      <rect x="24" y="24" width="1" height="1" fill="#2d1b3d" />
      {/* tail */}
      <rect x="25" y="16" width="2" height="1" fill="#2d1b3d" />
      <rect x="26" y="15" width="2" height="1" fill="#2d1b3d" />
      <rect x="27" y="14" width="2" height="1" fill="#2d1b3d" />
      <rect x="28" y="15" width="1" height="4" fill="#2d1b3d" />
      <rect x="26" y="16" width="2" height="1" fill="#ff6f59" />
      <rect x="27" y="15" width="1" height="4" fill="#ff6f59" />
    </svg>
  );
}
