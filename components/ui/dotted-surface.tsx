'use client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

/**
 * A full-bleed, animated dotted surface rendered as a Three.js
 * `THREE.Points` grid. Particles wave on the Y axis via two phase-shifted
 * sine waves so the field feels alive without being noisy.
 *
 * Theme-aware: dot colour flips between near-white (`#C8C8C8`) in dark
 * mode and brand-ink black in light mode, so the surface is visible
 * against the current `bg-background` of the page.
 *
 * Mounts a single `THREE.WebGLRenderer` into the container ref and
 * disposes all GPU resources (geometry, material, renderer) and the
 * `requestAnimationFrame` handle on unmount so the effect is leak-safe
 * across route changes.
 */
export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
    const { theme } = useTheme();

    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        particles: THREE.Points[];
        animationId: number;
        count: number;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const SEPARATION = 150;
        const AMOUNTX = 40;
        const AMOUNTY = 60;

        // Scene setup. The fog colour matches the page background so the
        // particle field fades into the page edges instead of cutting off
        // with a hard line. We resolve the actual computed background
        // colour at mount time so the fog stays in sync if the theme
        // changes via the provider above.
        const fogColor = new THREE.Color(
            theme === 'dark' ? 0x101010 : 0xffffff,
        );
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(fogColor.getHex(), 2000, 10000);

        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            10000,
        );
        camera.position.set(0, 355, 1220);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(fogColor.getHex(), 0);

        containerRef.current.appendChild(renderer.domElement);

        // Create particles
        const particles: THREE.Points[] = [];
        const positions: number[] = [];
        const colors: number[] = [];

        // Create geometry for all particles
        const geometry = new THREE.BufferGeometry();

        for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
                const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
                const y = 0; // Will be animated
                const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

                positions.push(x, y, z);
                if (theme === 'dark') {
                    colors.push(200, 200, 200);
                } else {
                    colors.push(0, 0, 0);
                }
            }
        }

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Create material
        const material = new THREE.PointsMaterial({
            size: 8,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });

        // Create points object
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        let count = 0;
        // Initialise to 0 so TypeScript can prove it's assigned before
        // the cleanup function reads `sceneRef.current.animationId`.
        // The first call to `animate()` overwrites it with the real id
        // from `requestAnimationFrame`; cancelling frame 0 is a no-op.
        let animationId = 0;

        // Animation function
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            const positionAttribute = geometry.attributes.position;
            const positions = positionAttribute.array as Float32Array;

            let i = 0;
            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    const index = i * 3;

                    // Animate Y position with sine waves
                    positions[index + 1] =
                        Math.sin((ix + count) * 0.3) * 50 +
                        Math.sin((iy + count) * 0.5) * 50;

                    i++;
                }
            }

            positionAttribute.needsUpdate = true;

            renderer.render(scene, camera);
            count += 0.1;
        };

        // Handle window resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Start animation. The first call to `animate()` schedules the
        // first frame and assigns `animationId` before we snapshot the
        // scene refs into `sceneRef.current`.
        animate();

        // Store references
        sceneRef.current = {
            scene,
            camera,
            renderer,
            particles: [points],
            animationId,
            count,
        };

        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);

            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);

                // Clean up Three.js objects
                sceneRef.current.scene.traverse((object) => {
                    if (object instanceof THREE.Points) {
                        object.geometry.dispose();
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });

                sceneRef.current.renderer.dispose();

                if (containerRef.current && sceneRef.current.renderer.domElement) {
                    containerRef.current.removeChild(
                        sceneRef.current.renderer.domElement,
                    );
                }
            }
        };
    }, [theme]);

    return (
        <div
            ref={containerRef}
            // `-z-10` (not `-z-1`, which isn't a valid Tailwind class and
            // would render as plain z-auto) parks the canvas behind all
            // page content. `pointer-events-none` lets clicks pass through
            // to the hero CTAs underneath.
            className={cn('pointer-events-none fixed inset-0 -z-10', className)}
            {...props}
        />
    );
}
