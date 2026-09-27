// Pip the pixel cat — div-based sprite from the Figma Make design.
// The `.cat` class + all its children are styled in `room-styles.css`.

type PipProps = {
  size?: number;
  className?: string;
};

const BASE = 148;

export function Pip({ size, className }: PipProps) {
  const scale = size ? size / BASE : 1;
  const style = size
    ? { transform: `scale(${scale})`, transformOrigin: "center center" }
    : undefined;
  return (
    <div
      className={`cat${className ? ` ${className}` : ""}`}
      role="img"
      aria-label="Pip, an orange pixel cat"
      style={style}
    >
      <div className="cat-tail" />
      <div className="cat-body">
        <div className="cat-belly" />
        <div className="cat-paw paw-left" />
        <div className="cat-paw paw-right" />
      </div>
      <div className="cat-head">
        <div className="cat-ear ear-left"><i /></div>
        <div className="cat-ear ear-right"><i /></div>
        <div className="stripe stripe-one" />
        <div className="stripe stripe-two" />
        <div className="cat-eye eye-left"><i /></div>
        <div className="cat-eye eye-right"><i /></div>
        <div className="cat-cheek cheek-left" />
        <div className="cat-cheek cheek-right" />
        <div className="cat-muzzle">w</div>
      </div>
    </div>
  );
}
