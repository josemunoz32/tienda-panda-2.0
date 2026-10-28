import React from 'react';
import styled from 'styled-components';
import pandaLogo from '../../assets/logos/miicono.webp';

const Loader = ({
  text = "Cargando...",
  subtext = "PandaStore",
  fullScreen = true,
  showLogo = true,
  size = 200,
  minHeight
}) => {
  const letters = (text || "Cargando...").split('');

  return (
    <StyledWrapper $fullScreen={fullScreen} $minHeight={minHeight} role="status" aria-live="polite">
      <div className="loader-container">
        <div className="loader-wrapper" style={{ width: `${size}px`, height: `${size}px` }}>
          <div className="loader-content">
            {showLogo && (
              <div className="loader-logo-wrap">
                <img src={pandaLogo} alt="Panda Store" className="loader-logo-img" width="77" height="77" decoding="async" />
              </div>
            )}
            <div className="loader-text-row">
              {letters.map((char, index) => (
                <span
                  key={index}
                  className="loader-letter"
                  style={{ animationDelay: `${index * 0.09}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </div>
          </div>
          <div className="loader" />
        </div>
        {subtext && <div className="loader-subtext">{subtext}</div>}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  ${props => props.$fullScreen ? `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999999;
    background: radial-gradient(circle at center, #1e1038 0%, #110822 55%, #070310 100%);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
  ` : `
    position: relative;
    width: 100%;
    min-height: ${props.$minHeight || '55vh'};
    background: radial-gradient(circle at center, rgba(30, 16, 56, 0.96) 0%, rgba(17, 8, 34, 0.98) 60%, rgba(7, 3, 16, 0.99) 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin: 20px 0;
  `}

  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    animation: loader-fade-in 0.3s ease-out forwards;
  }

  .loader-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border-radius: 50%;
    background-color: rgba(14, 7, 26, 0.6);
    user-select: none;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 60px rgba(173, 95, 255, 0.15);
  }

  .loader-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: none;
  }

  .loader-logo-wrap {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: #ffffff;
    padding: 3px;
    box-shadow: 0 0 24px rgba(173, 95, 255, 0.7), 0 0 44px rgba(71, 30, 236, 0.5);
    border: 2px solid #ad5fff;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: loader-panda-float 2.6s ease-in-out infinite;
  }

  .loader-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .loader-text-row {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    color: #ffffff;
    text-transform: uppercase;
  }

  .loader {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background-color: transparent;
    animation: loader-rotate 2s linear infinite;
    z-index: 1;
    pointer-events: none;
  }

  @keyframes loader-rotate {
    0% {
      transform: rotate(90deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 30px 0 #ad5fff inset,
        0 60px 60px 0 #471eec inset;
    }
    50% {
      transform: rotate(270deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 10px 0 #d60a47 inset,
        0 40px 60px 0 #311e80 inset;
    }
    100% {
      transform: rotate(450deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 30px 0 #ad5fff inset,
        0 60px 60px 0 #471eec inset;
    }
  }

  .loader-letter {
    display: inline-block;
    opacity: 0.4;
    transform: translateY(0);
    animation: loader-letter-anim 2s infinite;
    border-radius: 50ch;
    border: none;
  }

  @keyframes loader-letter-anim {
    0%,
    100% {
      opacity: 0.4;
      transform: translateY(0) scale(1);
    }
    20% {
      opacity: 1;
      transform: translateY(-2px) scale(1.16);
      color: #ffffff;
      text-shadow: 0 0 14px rgba(173, 95, 255, 0.95), 0 0 24px rgba(71, 30, 236, 0.8);
    }
    40% {
      opacity: 0.7;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes loader-panda-float {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-3px) scale(1.04);
    }
  }

  @keyframes loader-fade-in {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .loader-subtext {
    font-family: "Inter", sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: #d8b4fe;
    letter-spacing: 2px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(162, 89, 255, 0.14);
    border: 1px solid rgba(162, 89, 255, 0.28);
    padding: 6px 18px;
    border-radius: 20px;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
`;

export default Loader;
