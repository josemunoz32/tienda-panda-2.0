import { useRef } from 'react';
import './SpecularButton.css';

const PAD = 20;


export default function SpecularButton({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  style
}) {
  const btnRef = useRef(null);
  const fxRef = useRef(null);

  const sizeClass = size === 'sm' ? 'specular-btn-sm' : size === 'md' ? 'specular-btn-md' : 'specular-btn-lg';

  const inlineStyles = {
    borderRadius: `${radius}px`,
    color: textColor,
    ...style
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`specular-btn ${sizeClass} specular-btn-fallback ${className}`}
      style={inlineStyles}
    >
      <div className="specular-btn-bg" style={{ background: tint, opacity: tintOpacity }} />
      <div ref={fxRef} className="specular-btn-fx" style={{ padding: PAD }} />
      <div className="specular-btn-content">{children}</div>
    </button>
  );
}
