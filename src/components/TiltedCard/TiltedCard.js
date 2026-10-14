import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import './TiltedCard.css';

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export default function TiltedCard({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '300px',
  containerWidth = '100%',
  imageHeight = '300px',
  imageWidth = '300px',
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = false,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
  className = '',
  onClick
}) {
  const ref = useRef(null);
  
  // Detect touch / mobile screen once to skip expensive useSpring animations on mobile
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.innerWidth <= 768
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(hover: none)');
    const update = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        mql.matches ||
        window.innerWidth <= 768
      );
    };
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
    };
  }, []);

  // Motion values (only actively utilized on desktop)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1
  });

  const [lastY, setLastY] = useState(0);

  function handleMouse(e) {
    if (isTouchDevice || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    if (isTouchDevice) return;
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    if (isTouchDevice) return;
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  // Optimized lightweight touch render (eliminates WebGL/GPU crash on mobile devices)
  if (isTouchDevice) {
    return (
      <figure
        ref={ref}
        className={`tilted-card-figure tilted-card-mobile ${className}`.trim()}
        style={{
          height: containerHeight,
          width: containerWidth
        }}
        onClick={onClick}
      >
        <div
          className="tilted-card-inner"
          style={{
            width: imageWidth,
            height: imageHeight
          }}
        >
          <img
            src={imageSrc}
            alt=""
            className="tilted-card-bg-blur"
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />

          <img
            src={imageSrc}
            alt={altText}
            className="tilted-card-img"
            loading="lazy"
            decoding="async"
            style={{
              width: imageWidth,
              height: imageHeight,
              objectFit: 'cover',
              objectPosition: 'center top'
            }}
          />

          {displayOverlayContent && overlayContent && (
            <div className="tilted-card-overlay">{overlayContent}</div>
          )}
        </div>
      </figure>
    );
  }

  // Desktop render with Framer Motion spring physics
  return (
    <figure
      ref={ref}
      className={`tilted-card-figure ${className}`.trim()}
      style={{
        height: containerHeight,
        width: containerWidth
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {showMobileWarning && (
        <div className="tilted-card-mobile-alert">This effect is not optimized for mobile. Check on desktop.</div>
      )}

      <motion.div
        className="tilted-card-inner"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale
        }}
      >
        <img
          src={imageSrc}
          alt=""
          className="tilted-card-bg-blur"
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />

        <motion.img
          src={imageSrc}
          alt={altText}
          className="tilted-card-img"
          loading="lazy"
          decoding="async"
          style={{
            width: imageWidth,
            height: imageHeight,
            objectFit: 'cover',
            objectPosition: 'center top'
          }}
        />

        {displayOverlayContent && overlayContent && (
          <motion.div className="tilted-card-overlay">{overlayContent}</motion.div>
        )}
      </motion.div>

      {showTooltip && captionText && (
        <motion.figcaption
          className="tilted-card-caption"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
