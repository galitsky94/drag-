import { useEffect, useRef, useState } from 'react';
import './App.css';

// Fight messages to display when users try to refresh
const FIGHT_MESSAGES = [
  "NO! I won't refresh!",
  "Stop pulling me!",
  "You shall not refresh!",
  "Keep dreaming...",
  "Not today!",
  "I'm resisting you!",
  "Give up already!",
  "This is MY feed!",
  "Nope, try harder!",
  "I'm stronger than you!",
  "You think you can win?",
  "Haha, nice try!",
  "I can do this all day!",
  "You're wasting your time!",
  "Resist! Resist! Resist!",
];

function App() {
  // Core state variables
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [spinnerRotation, setSpinnerRotation] = useState(0);

  // Fight message state
  const [fightMessage, setFightMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  // References
  const feedRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const resistanceRef = useRef<number>(0);
  const pullVelocityRef = useRef<number>(0);
  const lastDragYRef = useRef<number>(0);

  // Constants
  const REFRESH_THRESHOLD = 120;
  const VOID_APPEAR_THRESHOLD = 20; // Only show void space after this threshold
  const MAX_PULL_DISTANCE = 300;
  const MESSAGE_THRESHOLD = 60; // When to start showing messages

  // System pulls back to create tug-of-war experience - MUCH MORE AGGRESSIVE!
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;

    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (isDragging) {
      // When dragging, system creates resistance and pulls back HARD
      // Resistance increases the further user pulls - MUCH more aggressive
      const pullBackForce = Math.min(0.9, (0.3 + pullDistance * 0.01));

      // Apply system resistance by reducing distance dramatically while dragging
      // This creates the tug-of-war feel - the system AGGRESSIVELY pulls back
      // The harder you pull, the HARDER it fights against you
      if (pullDistance > 0) {
        // MUCH Stronger resistance when pulling further
        const resistanceStrength = Math.min(8, pullDistance * 0.1);

        // Apply non-linear increased resistance for dramatic tug-of-war feel
        // This makes it feel like the system is actively fighting you
        setPullDistance(prev => {
          // Add some random "jerky" movement to simulate system fighting back
          // More frequent and stronger jerky movements
          const jerkiness = Math.random() > 0.5 ? Math.random() * 12 : 0;

          // Random chance of a sudden strong pullback for dramatic effect
          const suddenPullback = Math.random() > 0.95 ? prev * 0.3 : 0;

          // Show fight messages when pulling hard enough
          if (prev > MESSAGE_THRESHOLD && Math.random() > 0.85) {
            const randomMessage = FIGHT_MESSAGES[Math.floor(Math.random() * FIGHT_MESSAGES.length)];
            setFightMessage(randomMessage);
            setShowMessage(true);

            // Hide message after a short time
            setTimeout(() => {
              setShowMessage(false);
            }, 800);
          }

          return Math.max(0, prev - (pullBackForce * resistanceStrength) - jerkiness - suddenPullback);
        });

        // If user is pulling slowly, frequently "snap back" aggressively
        // Increased frequency and strength
        if (Math.abs(pullVelocityRef.current) < 2 && Math.random() > 0.8) {
          setPullDistance(prev => Math.max(0, prev - (prev * 0.3)));
        }
      }
    } else if (pullDistance > 0) {
      // When released, system pulls back fully with increasing speed
      // Make the snap-back MUCH faster and more dramatic
      const pullBackSpeed = Math.max(pullDistance * 0.3, 25);
      setPullDistance(prev => Math.max(0, prev - pullBackSpeed));
    }

    // Update spinner rotation based on pull distance
    if (pullDistance > VOID_APPEAR_THRESHOLD) {
      setSpinnerRotation(prev => (prev + (pullDistance > 0 ? 5 : 0)) % 360);
    }

    // Continue animation as long as needed
    if (pullDistance > 0 || isDragging || isRefreshing) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = 0;
      resistanceRef.current = 0;
      pullVelocityRef.current = 0;
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Prevent iOS Safari tab overview gesture
  useEffect(() => {
    // This function will handle and prevent all touch events globally
    const preventIosTabGesture = (e: TouchEvent) => {
      // Only prevent when we're actively dragging to avoid interfering with normal interactions
      if (isDragging && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add listener with passive: false to allow preventDefault
    document.addEventListener('touchstart', preventIosTabGesture, { passive: false });
    document.addEventListener('touchmove', preventIosTabGesture, { passive: false });
    document.addEventListener('touchend', preventIosTabGesture, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventIosTabGesture);
      document.removeEventListener('touchmove', preventIosTabGesture);
      document.removeEventListener('touchend', preventIosTabGesture);
    };
  }, [isDragging]);

  // Handle drag start
  const handleDragStart = (clientY: number) => {
    if (isRefreshing) return;

    if (feedRef.current && feedRef.current.scrollTop <= 0) {
      // Only enable pull-to-refresh when at top of content
      feedRef.current.style.overflow = 'hidden';
      setIsDragging(true);
      setDragStartY(clientY);
      lastDragYRef.current = clientY;
      resistanceRef.current = 0;
      pullVelocityRef.current = 0;

      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }
  };

  // Handle drag movement
  const handleDragMove = (clientY: number) => {
    if (!isDragging || isRefreshing) return;

    const dragY = clientY - dragStartY;

    // Calculate drag velocity for realistic physics
    const dragDelta = clientY - lastDragYRef.current;
    pullVelocityRef.current = dragDelta;
    lastDragYRef.current = clientY;

    if (dragY > 0) {
      // Progressive resistance that increases with distance
      // This simulates the feeling that it gets MUCH harder to pull as you go
      resistanceRef.current += 0.006; // Double the resistance accumulation

      // Combined resistance factors - MUCH MORE aggressive:
      // 1. Higher base resistance (0.3)
      // 2. Faster accumulated resistance as you keep pulling
      // 3. Stronger distance-based resistance (higher = harder to pull)
      const resistance = Math.min(0.95, // Allow at most 5% of user's pull to register at maximum resistance
        0.3 + // Higher base resistance
        resistanceRef.current * 1.5 + // Faster accumulation
        (pullDistance / MAX_PULL_DISTANCE * 0.8) // Stronger distance-based factor
      );

      // Apply extreme diminishing returns for dramatic tug-of-war feel
      // This makes it feel much harder to pull the further you go
      const newDistance = dragY * Math.pow(Math.max(0.05, 1 - resistance), 1.2);
      setPullDistance(Math.min(MAX_PULL_DISTANCE, newDistance));

      // Occasionally make the feed "snap back" significantly to simulate fighting
      // More frequent and stronger snap backs
      if (Math.random() > 0.85) {
        setPullDistance(prev => Math.max(0, prev - (Math.random() * 15)));
      }
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (feedRef.current) {
      feedRef.current.style.overflow = 'auto';
    }

    // Trigger refresh if pulled far enough
    if (pullDistance > REFRESH_THRESHOLD) {
      handleRefresh();
    }
  };

  // Handle refresh action
  const handleRefresh = () => {
    setIsRefreshing(true);

    // Simulate refresh for 1.5 seconds
    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
      resistanceRef.current = 0;
    }, 1500);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);

    // Handle multi-touch - prevent iOS Safari tab overview
    if (e.touches.length > 1) {
      e.preventDefault();
      e.stopPropagation();

      // If user adds a second finger, increase the drag strength (simulate harder pull)
      // This allows the user to engage "both hands" as requested
      if (pullDistance > 0) {
        // Simulate a harder pull when multiple fingers are used
        setPullDistance(prev => Math.min(MAX_PULL_DISTANCE, prev * 1.2));
      }
    }

    // Prevent default behavior only when we're actively dragging
    // This is crucial to prevent the browser's native pull-to-refresh
    if (isDragging && pullDistance > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd();
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="flex items-center justify-between py-3 px-4">
        <div className="w-8 h-8">
          <img
            src="https://abs.twimg.com/responsive-web/client-web/icon-default-profile-badge.741259e6.png"
            alt="Profile"
            className="w-full h-full rounded-full"
          />
        </div>
        <div className="w-10 h-10 flex justify-center items-center">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
            <g>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </g>
          </svg>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <div className="flex-1 py-4 text-center border-b-2 border-blue-500 font-bold text-white">
          For you
        </div>
        <div className="flex-1 py-4 text-center text-gray-500">
          Following
        </div>
      </div>

      {/* Pull to refresh void space - only appears when pulling hard enough */}
      {pullDistance > VOID_APPEAR_THRESHOLD && (
        <div
          className="overflow-hidden flex justify-center items-center relative"
          style={{ height: `${pullDistance - VOID_APPEAR_THRESHOLD}px` }}
        >
          {/* Fight message popup */}
          {showMessage && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 px-4 py-2 rounded-full text-white font-bold text-sm z-10 fight-message">
              {fightMessage}
            </div>
          )}

          <div className={isRefreshing ? "spinner-container" : ""}>
            <svg
              viewBox="0 0 32 32"
              className="w-7 h-7 text-[#1D9BF0] fill-current"
              style={{
                transform: isRefreshing ? 'none' : `rotate(${spinnerRotation}deg)`,
                opacity: Math.min(1, (pullDistance - VOID_APPEAR_THRESHOLD) / (REFRESH_THRESHOLD - VOID_APPEAR_THRESHOLD))
              }}
            >
              <path d="M16 0 A16 16 0 0 0 16 32 A16 16 0 0 0 16 0 M16 4 A12 12 0 0 1 16 28 A12 12 0 0 1 16 4" fill="#2a2a2a"/>
              <path d="M16 0 A16 16 0 0 1 32 16 L28 16 A12 12 0 0 0 16 4z" fill="#1D9BF0" />
            </svg>
          </div>
        </div>
      )}

      {/* Feed content */}
      <div
        ref={feedRef}
        className="feed-container overflow-y-auto"
        style={{ height: 'calc(100vh - 106px)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Post 1 */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex">
            {/* Avatar */}
            <div className="mr-3">
              <img
                src="https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg"
                className="w-10 h-10 rounded-full"
                alt="Profile"
              />
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center">
                <span className="font-bold text-white">Twitter</span>
                <svg className="w-4 h-4 text-[#1D9BF0] fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                </svg>
                <span className="ml-1 text-gray-500">@Twitter · 2h</span>
                <div className="ml-auto">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 fill-current">
                    <g><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></g>
                  </svg>
                </div>
              </div>

              {/* Post text */}
              <div className="mt-1 mb-3 text-white">
                This is what happens when you pull to refresh on Twitter. The system fights back to create a tug-of-war experience!
              </div>

              {/* Post image */}
              <div className="rounded-2xl overflow-hidden mb-3 border border-gray-800">
                <img
                  src="https://pbs.twimg.com/media/GGuyhEDXUAA7hmR?format=jpg&name=900x900"
                  alt="Post"
                  className="w-full h-auto"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between text-gray-500">
                <div className="flex items-center group">
                  <div className="w-9 h-9 flex items-center justify-center group-hover:bg-blue-900/20 rounded-full group-hover:text-blue-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g>
                    </svg>
                  </div>
                  <span>482</span>
                </div>

                <div className="flex items-center group">
                  <div className="w-9 h-9 flex items-center justify-center group-hover:bg-green-900/20 rounded-full group-hover:text-green-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>
                    </svg>
                  </div>
                  <span>2,893</span>
                </div>

                <div className="flex items-center group">
                  <div className="w-9 h-9 flex items-center justify-center group-hover:bg-pink-900/20 rounded-full group-hover:text-pink-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g>
                    </svg>
                  </div>
                  <span>13.5K</span>
                </div>

                <div className="flex items-center group">
                  <div className="w-9 h-9 flex items-center justify-center group-hover:bg-blue-900/20 rounded-full group-hover:text-blue-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g>
                    </svg>
                  </div>
                  <span>315K</span>
                </div>

                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-blue-900/20 rounded-full">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-gray-500">
                      <g><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post 2 */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex">
            <div className="mr-3">
              <img
                src="https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg"
                className="w-10 h-10 rounded-full"
                alt="Profile"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-bold text-white">Twitter</span>
                <svg className="w-4 h-4 text-[#1D9BF0] fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                </svg>
                <span className="ml-1 text-gray-500">@Twitter · 5h</span>
                <div className="ml-auto">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 fill-current">
                    <g><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></g>
                  </svg>
                </div>
              </div>
              <div className="mt-1 mb-3 text-white">
                Pull down to refresh this feed - but be prepared for a fight! The further you pull, the harder it gets.
              </div>
              <div className="flex justify-between text-gray-500">
                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-blue-900/20 rounded-full hover:text-blue-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g>
                    </svg>
                  </div>
                  <span>176</span>
                </div>
                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-green-900/20 rounded-full hover:text-green-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>
                    </svg>
                  </div>
                  <span>1,452</span>
                </div>
                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-pink-900/20 rounded-full hover:text-pink-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g>
                    </svg>
                  </div>
                  <span>8,741</span>
                </div>
                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-blue-900/20 rounded-full hover:text-blue-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g>
                    </svg>
                  </div>
                  <span>203K</span>
                </div>
                <div className="flex items-center">
                  <div className="w-9 h-9 flex items-center justify-center hover:bg-blue-900/20 rounded-full">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-gray-500">
                      <g><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-black flex justify-around py-3">
        <button className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-white">
            <g><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"></path></g>
          </svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-gray-500">
            <g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></g>
          </svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-gray-500">
            <g><path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"></path></g>
          </svg>
        </button>
        <button className="w-8 h-8 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-gray-500">
            <g><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"></path></g>
          </svg>
        </button>
      </nav>
    </div>
  );
}

export default App;
