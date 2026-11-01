'use client';
import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { VenueModel } from '../../components/game/Arena';
import { PLAN, VENUE_CALIBRATION, planToWorld, VENUE_ROOMS, polygonArea } from '../../../../packages/shared/src/venue';
import './venue.css';

function FitView({ view }: { view: 'plan' | 'perspective' }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(size.width / (PLAN.width * VENUE_CALIBRATION.metresPerPixel + 4),
        size.height / (PLAN.height * VENUE_CALIBRATION.metresPerPixel + 4));
      camera.updateProjectionMatrix();
    } else {
      const fit = Math.max(1, size.height / size.width);
      camera.position.set(40 * fit, 45 * fit, 48 * fit);
    }
  }, [camera, size.width, size.height, view]);
  return null;
}

function ReferencePlan() {
  const texture = useTexture('/venue/hoxton-ground-floor.webp');
  const [x, z] = planToWorld([PLAN.width / 2, PLAN.height / 2]);
  const scale = VENUE_CALIBRATION.metresPerPixel;
  return <mesh position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[PLAN.width * scale, PLAN.height * scale]} />
    <meshBasicMaterial map={texture} transparent opacity={0.65} depthWrite={false} />
  </mesh>;
}
export default function VenuePage() {
  const [overlay, setOverlay] = useState(false), [labels, setLabels] = useState(true);
  const [view, setView] = useState<'plan' | 'perspective'>('plan');
  const scale = VENUE_CALIBRATION.metresPerPixel;
  const [cx, cz] = planToWorld([PLAN.width / 2, PLAN.height / 2]);
  return <main className="venue-review">
    <header>
      <div><a href="/">← Walk-through tour</a><h1>Hoxton Docks / spatial model</h1>
        <p>Ground floor · neutral geometry · 1 game unit = 1 metre at the published drawing scale</p></div>
      <strong>Venue plan · 1:200 at A3</strong>
    </header>
    <section className="venue-tools" aria-label="Model controls">
      <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Top-down plan</button>
      <button aria-pressed={view === 'perspective'} onClick={() => setView('perspective')}>3D orbit</button>
      <label><input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Source plan overlay</label>
      <label><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Room labels</label>
      <span>Grid: 1 m · bold lines: 5 m · scroll to zoom · right-drag to pan</span>
    </section>
    <div className="venue-canvas">
      <Canvas key={view} orthographic={view === 'plan'}
        camera={view === 'plan' ? { position: [cx, 85, cz], up: [0, 0, -1], zoom: 14, near: 0.1, far: 200 }
          : { position: [40, 45, 48], fov: 48, near: 0.1, far: 250 }}>
        <color attach="background" args={['#edf0f2']} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[0, 30, 15]} intensity={2} />
        <Suspense fallback={null}>
          <VenueModel labels={labels} eventSetup />
          {overlay && <ReferencePlan />}
        </Suspense>
        <gridHelper args={[100, 100, '#a4abb3', '#d2d8dd']} position={[0, -0.02, 0]} />
        <gridHelper args={[100, 20, '#8b98a6', '#b1bcc7']} position={[0, -0.019, 0]} />
        <FitView view={view} />
        <OrbitControls target={view === 'plan' ? [cx, 0, cz] : [0, 0, -2]} enableRotate={view !== 'plan'} maxPolarAngle={Math.PI / 2 - 0.02} />
      </Canvas>
    </div>
    <aside>
      <p><b>Calibration:</b> {VENUE_CALIBRATION.basis} Uniform scale on both axes, using the original
        embedded image rather than the resized brochure page. The venue marks this drawing illustrative;
        dimensions are plan-derived and have not been surveyed onsite.</p>
      <p>Boat Space ceiling: provisional 5.5 m (brochure prose; drawing says 5.6 m). Other ceiling heights,
        0.22 m default wall thickness and 2.15 m door height await measurement. Door locations and widths are traced.
        Private spaces are enclosed; perimeter gates are shown closed. No temporary event furniture.</p>
      <details><summary>Room footprints at the current calibration</summary>
        <ul>{VENUE_ROOMS.filter((r) => !r.access).map((r) => <li key={r.id}>{r.name}: approximately {Math.round((polygonArea(r.outline) - (r.holes ?? []).reduce((sum, ring) => sum + polygonArea(ring), 0)) * scale * scale)} m²</li>)}</ul>
      </details>
    </aside>
  </main>;
}
