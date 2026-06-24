import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Check, ChevronDown } from 'lucide-react';

// Custom hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// University data
const universities = [
  { id: 1, name: "Harvard University", location: "Cambridge, MA", popular: false },
  { id: 2, name: "Stanford University", location: "Stanford, CA", popular: false },
  { id: 3, name: "MIT", location: "Cambridge, MA", popular: false },
  { id: 4, name: "Yale University", location: "New Haven, CT", popular: false },
  { id: 5, name: "Princeton University", location: "Princeton, NJ", popular: false },
  { id: 6, name: "Columbia University", location: "New York, NY", popular: false },
  { id: 7, name: "University of Chicago", location: "Chicago, IL", popular: false },
  { id: 8, name: "University of Pennsylvania", location: "Philadelphia, PA", popular: false },
  { id: 9, name: "Duke University", location: "Durham, NC", popular: false },
  { id: 10, name: "Northwestern University", location: "Evanston, IL", popular: false },
  { id: 11, name: "Cornell University", location: "Ithaca, NY", popular: false },
  { id: 12, name: "Brown University", location: "Providence, RI", popular: false },
  { id: 13, name: "University of Southern California", location: "Los Angeles, CA", popular: true },
  { id: 14, name: "University of California, Los Angeles", location: "Los Angeles, CA", popular: false },
  { id: 15, name: "University of Michigan", location: "Ann Arbor, MI", popular: false },
  { id: 16, name: "Ohio State University", location: "Columbus, OH", popular: false },
  { id: 17, name: "University of Texas at Austin", location: "Austin, TX", popular: false },
  { id: 18, name: "University of Florida", location: "Gainesville, FL", popular: false },
  { id: 19, name: "Penn State University", location: "State College, PA", popular: false },
  { id: 20, name: "University of Georgia", location: "Athens, GA", popular: false },
  { id: 21, name: "University of Alabama", location: "Tuscaloosa, AL", popular: false },
  { id: 22, name: "University of Illinois", location: "Urbana-Champaign, IL", popular: false },
  { id: 23, name: "University of Wisconsin", location: "Madison, WI", popular: false },
  { id: 24, name: "Syracuse University", location: "Syracuse, NY", popular: false },
  { id: 25, name: "Rutgers University", location: "New Brunswick, NJ", popular: true },
  { id: 26, name: "Northeastern University", location: "Boston, MA", popular: true },
  { id: 27, name: "Stockton University", location: "Galloway, NJ", popular: false },
  { id: 28, name: "The College of New Jersey", location: "Ewing, NJ", popular: false },
  { id: 29, name: "University of Miami (FL)", location: "Coral Gables, FL", popular: false },
  { id: 30, name: "University of Florida", location: "Gainesville, FL", popular: false },
  { id: 31, name: "University of Tampa", location: "Tampa, FL", popular: false },
  { id: 32, name: "University of Central Florida", location: "Orlando, FL", popular: false },
  { id: 33, name: "University of Tennessee (Knoxville)", location: "Knoxville, TN", popular: false },
  { id: 34, name: "University of Alabama", location: "Tuscaloosa, AL", popular: false },
  { id: 35, name: "Auburn University", location: "Auburn, AL", popular: false },
  { id: 36, name: "Tulane University", location: "New Orleans, LA", popular: false },
  { id: 37, name: "Ohio State University", location: "Columbus, OH", popular: false },
  { id: 38, name: "University of Michigan (Ann Arbor)", location: "Ann Arbor, MI", popular: false },
  { id: 39, name: "Michigan State University", location: "East Lansing, MI", popular: false },
];

// Floating background element component
const FloatingElement = ({ delay = 0, duration = 20, size = 100, top = "20%", left = "10%" }) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        opacity: 0.2,
        filter: 'blur(40px)',
        width: size,
        height: size,
        top,
        left,
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.3))",
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
};

// University card component
const UniversityCard = ({ university, isSelected, onClick, isMobile }) => {
  return (
    <motion.div
      whileHover={{ scale: isMobile ? 1 : 1.02, y: isMobile ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: isMobile ? '12px' : '16px',
        border: isSelected ? '2px solid #a855f7' : '2px solid rgba(255, 255, 255, 0.1)',
        padding: isMobile ? '16px' : '24px',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
        background: isSelected 
          ? 'rgba(168, 85, 247, 0.2)' 
          : 'rgba(255, 255, 255, 0.05)',
        boxShadow: isSelected 
          ? '0 10px 25px rgba(168, 85, 247, 0.2)' 
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.target.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '600', color: 'white', margin: '0 0 4px 0', lineHeight: '1.3' }}>
            {university.name}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: isMobile ? '12px' : '14px', color: '#d1d5db' }}>
            {university.location}
          </p>
        </div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              display: 'flex',
              height: isMobile ? '20px' : '24px',
              width: isMobile ? '20px' : '24px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: '#a855f7',
              flexShrink: 0
            }}
          >
            <Check style={{ height: isMobile ? '14px' : '16px', width: isMobile ? '14px' : '16px', color: 'white' }} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Custom dropdown component
const UniversityDropdown = ({ selected, onSelect, universities }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUniversities = universities.filter((uni) =>
    uni.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
          e.target.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <span style={{ color: 'white' }}>
          {selected ? selected.name : "Search for your university..."}
        </span>
        <ChevronDown
          style={{
            height: '20px',
            width: '20px',
            color: 'white',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          />
        </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            zIndex: 50,
            marginTop: '8px',
            width: '100%',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div style={{ padding: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                height: '16px',
                width: '16px',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search universities..."
                style={{
                  width: '100%',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  paddingLeft: '40px',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '12px 12px 12px 40px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
            {filteredUniversities.map((uni) => (
              <div
                key={uni.id}
                onClick={() => {
                  onSelect(uni);
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  cursor: 'pointer',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '12px 16px',
                  color: 'white',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(168, 85, 247, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: '500' }}>{uni.name}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>{uni.location}</div>
              </div>
            ))}
            {filteredUniversities.length === 0 && (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                No universities found
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const UniversityScreen = ({ onNavigate, onUniversitySelect, onBack }) => {
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const canvasRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    let particles = [];
    let raf = 0;

    const makeParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.3 + 0.1,
      o: Math.random() * 0.4 + 0.2,
    });

    const init = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < count; i++) particles.push(makeParticle());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 50;
          p.v = Math.random() * 0.3 + 0.1;
          p.o = Math.random() * 0.4 + 0.2;
        }
        ctx.fillStyle = `rgba(200,200,255,${p.o})`;
        ctx.fillRect(p.x, p.y, 1, 3);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleContinue = () => {
    if (selectedUniversity) {
      if (onUniversitySelect) {
        onUniversitySelect({ name: selectedUniversity.name });
      } else if (onNavigate) {
        onNavigate('user-info');
      }
    }
  };

  const popularUniversities = universities.filter((u) => u.popular);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(to bottom right, #312e81, #581c87, #4c1d95)'
    }}>
      {/* Animated particles */}
      <canvas
        ref={canvasRef}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          opacity: 0.4
        }}
      />

      {/* Floating background elements */}
      <FloatingElement delay={0} duration={25} size={300} top="10%" left="5%" />
      <FloatingElement delay={2} duration={30} size={250} top="60%" left="70%" />
      <FloatingElement delay={4} duration={28} size={200} top="30%" left="80%" />
      <FloatingElement delay={1} duration={32} size={180} top="70%" left="15%" />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: isMobile ? '12px 16px' : '16px 24px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: 'white' }}
            >
              Greek Life
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ fontSize: isMobile ? '12px' : '14px', color: '#d1d5db' }}
            >
              Step 2 of 3
            </motion.div>
          </div>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '24px 16px' : '48px 24px'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ width: '100%', maxWidth: '1024px' }}
          >
            {/* Title */}
            <div style={{ marginBottom: isMobile ? '24px' : '48px', textAlign: 'center' }}>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  marginBottom: isMobile ? '8px' : '16px',
                  fontSize: isMobile ? '28px' : '48px',
                  fontWeight: 'bold',
                  color: 'white',
                  lineHeight: '1.2'
                }}
              >
                Select Your University
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: isMobile ? '14px' : '20px', color: '#d1d5db' }}
              >
                Choose from popular universities or search for yours
              </motion.p>
            </div>

            {/* Search dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ marginBottom: isMobile ? '24px' : '48px' }}
            >
              <UniversityDropdown
                selected={selectedUniversity}
                onSelect={setSelectedUniversity}
                universities={universities}
              />
            </motion.div>

            {/* Popular universities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 style={{
                marginBottom: isMobile ? '16px' : '24px',
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '600',
                color: 'white'
              }}>
                Popular Universities
              </h2>
              <div style={{
                display: 'grid',
                gap: isMobile ? '12px' : '16px',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))'
              }}>
                {popularUniversities.map((university, index) => (
                  <motion.div
                    key={university.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <UniversityCard
                      university={university}
                      isSelected={selectedUniversity?.id === university.id}
                      onClick={() => setSelectedUniversity(university)}
                      isMobile={isMobile}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Continue button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              style={{ marginTop: isMobile ? '32px' : '48px', display: 'flex', justifyContent: 'center' }}
            >
              <motion.button
                disabled={!selectedUniversity}
                onClick={handleContinue}
                whileHover={selectedUniversity && !isMobile ? { scale: 1.05 } : {}}
                whileTap={selectedUniversity ? { scale: 0.95 } : {}}
                style={{
                  height: isMobile ? '48px' : '56px',
                  borderRadius: isMobile ? '10px' : '12px',
                  background: selectedUniversity 
                    ? 'linear-gradient(to right, #a855f7, #6366f1)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  padding: isMobile ? '0 32px' : '0 48px',
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: '600',
                  color: 'white',
                  border: 'none',
                  cursor: selectedUniversity ? 'pointer' : 'not-allowed',
                  opacity: selectedUniversity ? 1 : 0.5,
                  boxShadow: selectedUniversity 
                    ? '0 10px 25px rgba(168, 85, 247, 0.3)' 
                    : 'none',
                  transition: 'all 0.3s ease',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UniversityScreen; 