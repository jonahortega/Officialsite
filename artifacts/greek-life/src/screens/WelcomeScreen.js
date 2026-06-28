import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './WelcomeScreen.css';

// Utility function to combine class names
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

function FloatingElement({ className, delay = 0 }) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0,
      }}
      animate={{
        opacity: [0, 0.6, 0.4],
        scale: [0, 1.2, 1],
      }}
      transition={{
        duration: 2,
        delay,
        ease: "easeOut",
      }}
      style={{
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(40px)',
        ...className
      }}
    >
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  );
}

function GreekLifeWelcome({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 800);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.5,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.8,
        ease: "easeInOut",
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180, opacity: 0 },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "exit"}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(to bottom right, #581c87, #312e81, #581c87)'
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent, rgba(0, 0, 0, 0.2))'
      }} />

      <FloatingElement
        delay={0.2}
        className={{
          width: '384px',
          height: '384px',
          background: 'rgba(168, 85, 247, 0.3)',
          top: '40px',
          left: '-80px'
        }}
      />
      <FloatingElement
        delay={0.4}
        className={{
          width: '320px',
          height: '320px',
          background: 'rgba(99, 102, 241, 0.3)',
          top: '25%',
          right: '40px'
        }}
      />
      <FloatingElement
        delay={0.6}
        className={{
          width: '288px',
          height: '288px',
          background: 'rgba(139, 92, 246, 0.3)',
          bottom: '80px',
          left: '25%'
        }}
      />
      <FloatingElement
        delay={0.8}
        className={{
          width: '256px',
          height: '256px',
          background: 'rgba(196, 181, 253, 0.3)',
          bottom: '40px',
          right: '25%'
        }}
      />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1), transparent 50%)'
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px'
      }}>
        <div style={{
          maxWidth: '1024px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <motion.div
            variants={logoVariants}
            style={{ marginBottom: '48px', display: 'flex', justifyContent: 'center' }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
              }}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  style={{ color: 'white' }}
                >
                  <path
                    d="M32 8L8 24L32 40L56 24L32 8Z"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 40L32 56L56 40"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M32 24V56"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{
                position: 'absolute',
                inset: '-16px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 'bold',
              marginBottom: '16px',
              letterSpacing: '-0.025em',
              background: 'linear-gradient(to right, white, rgba(196, 181, 253, 1), white)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Greek Life
            </h1>
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginBottom: '48px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: 'clamp(20px, 4vw, 32px)',
              fontWeight: '300',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                Connect
              </motion.span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.6)'
                }}
              />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
              >
                Engage
              </motion.span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.8, duration: 0.4 }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.6)'
                }}
              />
              <motion.span
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.0, duration: 0.6 }}
              >
                Thrive
              </motion.span>
            </div>
          </motion.div>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '512px',
              margin: '0 auto',
              fontWeight: '300',
              lineHeight: '1.6'
            }}
          >
            Connect, organize, and thrive with the ultimate app designed for college students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            style={{ marginTop: '64px', display: 'flex', justifyContent: 'center' }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.6)'
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent, transparent)',
        pointerEvents: 'none'
      }} />
    </motion.div>
  );
}

const WelcomeScreen = ({ onNavigate }) => {
  const [showLogin, setShowLogin] = useState(false);

  const handleComplete = () => {
    setShowLogin(true);
    // Navigate to login screen after a brief delay
    setTimeout(() => {
      onNavigate('login');
    }, 500);
  };

  return <GreekLifeWelcome onComplete={handleComplete} />;
};

export default WelcomeScreen;