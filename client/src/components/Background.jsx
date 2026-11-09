import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Vanta needs THREE on the window object globally BEFORE it initializes
// This global assignment is now moved inside useEffect to ensure it's set before dynamic import.
// if (typeof window !== 'undefined') {
//     window.THREE = THREE;
// }

const Background = () => {
    const [vantaEffect, setVantaEffect] = useState(null);
    const myRef = useRef(null);

    useEffect(() => {
        // Vanta needs THREE on the window object globally BEFORE it initializes
        if (typeof window !== 'undefined') {
            window.THREE = THREE;
        }

        const initVanta = async () => {
            try {
                // Dynamically import Vanta to ensure THREE is on window first
                const module = await import('vanta/dist/vanta.dots.min');
                const DOTS = module.default;

                if (!vantaEffect && myRef.current) {
                    const effect = DOTS({
                        el: myRef.current,
                        THREE: THREE,
                        mouseControls: true,
                        touchControls: true,
                        gyroControls: false,
                        minHeight: 200.00,
                        minWidth: 200.00,
                        scale: 1.00,
                        scaleMobile: 1.00,
                        color: 0xff0000,
                        color2: 0x1fd277,
                        backgroundColor: 0x0,
                        showLines: true
                    });
                    setVantaEffect(effect);
                }
            } catch (err) {
                console.error("Vanta initialization failed inside useEffect:", err);
            }
        };

        initVanta();

        return () => {
            if (vantaEffect) {
                vantaEffect.destroy();
            }
        };
    }, [vantaEffect]);

    return (
        <div ref={myRef} style={{ width: '100%', height: '100%' }}>
            {/* Vanta will render inside this div */}
        </div>
    );
};

export default Background;
