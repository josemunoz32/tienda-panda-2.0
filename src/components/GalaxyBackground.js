import React, { useRef, useEffect } from "react";
import "./GalaxyBackground.css";

export default function GalaxyBackground() {
  const galaxyRef = useRef(null);

  useEffect(() => {
    const canvas = galaxyRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resizeCanvas();

    // Más estrellas, más pequeñas y densas
    const particles = Array.from({length: 1200}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.1 + 0.2,
      speed: Math.random() * 0.12 + 0.04,
      alpha: Math.random() * 0.7 + 0.2
    }));

    // Nebulosas: nubes translúcidas
    const nebulas = Array.from({length: 4}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 320 + 180,
      alpha: Math.random() * 0.18 + 0.08,
      rotation: Math.random() * Math.PI * 2
    }));

    let shootingStars = [];
    function spawnShootingStar() {
      if (Math.random() < 0.025) {
        shootingStars.push({
          x: Math.random() * width * 0.8 + width * 0.1,
          y: Math.random() * height * 0.4 + height * 0.05,
          len: Math.random() * 180 + 80,
          speed: Math.random() * 10 + 8,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.18,
          alpha: 1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      // Fondo base negro profundo
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Dibujar nebulosas (nubes)
      for (const n of nebulas) {
        ctx.save();
        ctx.globalAlpha = n.alpha;
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);
        // Gradiente radial para la nube
        const nebGrad = ctx.createRadialGradient(0, 0, n.r * 0.1, 0, 0, n.r);
        nebGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
        nebGrad.addColorStop(0.25, 'rgba(180,180,180,0.10)');
        nebGrad.addColorStop(0.7, 'rgba(80,80,80,0.04)');
        nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, n.r, 0, 2 * Math.PI);
        ctx.fillStyle = nebGrad;
        ctx.fill();
        ctx.restore();
      }

      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
        p.y += p.speed;
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = 'rgba(173,216,230,0.85)';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
        ctx.stroke();
        ctx.restore();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.009;
        if (s.alpha <= 0) shootingStars.splice(i, 1);
      }
      spawnShootingStar();
      animationId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas ref={galaxyRef} className="galaxy-bg-canvas" aria-hidden="true"></canvas>
  );
}
