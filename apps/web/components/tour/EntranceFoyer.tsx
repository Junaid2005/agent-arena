'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ENTRANCE_BANNERS, ENTRANCE_FOYER, ENTRANCE_SCALE_POINT } from '../../../../packages/shared/src/entranceFoyer';
import { planToWorld, VENUE_ROOMS } from '../../../../packages/shared/src/venue';
import { masonryTexture, metricBoxGeometry } from './roomTwoMaterials';

function canvasTexture(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function gaugeTexture() {
  return canvasTexture((ctx) => {
    ctx.fillStyle = '#e6e1cf'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#302d27'; ctx.lineWidth = 3;
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2 - Math.PI / 2, inner = i % 5 ? 416 : 392;
      ctx.beginPath(); ctx.moveTo(512 + Math.cos(a) * inner, 512 + Math.sin(a) * inner);
      ctx.lineTo(512 + Math.cos(a) * 451, 512 + Math.sin(a) * 451); ctx.stroke();
      if (i % 10 === 0) { ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.fillText(String(i), 512 + Math.cos(a) * 355, 522 + Math.sin(a) * 355); }
    }
    ctx.fillStyle = '#26251f'; ctx.textAlign = 'center'; ctx.font = 'bold 74px serif'; ctx.fillText('AVERY', 512, 720);
    ctx.font = '25px serif'; ctx.fillText('WEIGHING MACHINES', 512, 763);
    ctx.strokeStyle = '#932d29'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(512, 549); ctx.lineTo(426, 185); ctx.stroke();
    ctx.fillStyle = '#242727'; ctx.beginPath(); ctx.arc(512, 549, 26, 0, Math.PI * 2); ctx.fill();
  });
}
function bannerTexture(blue: boolean, title: string) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = blue ? '#4d9bb7' : '#202629'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = blue ? '#122f38' : '#eeeae2'; ctx.font = 'bold 80px sans-serif'; ctx.fillText('OpenAI', 80, 145);
    ctx.font = 'bold 142px sans-serif'; ctx.fillText(title, 80, 400, 880);
    ctx.font = '50px monospace'; ctx.fillText('> _', 80, 510);
    ctx.lineWidth = 6; ctx.strokeStyle = blue ? '#204b59' : '#8b9796';
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(80, 640 + i * 37); ctx.lineTo(810 - i * 50, 640 + i * 37); ctx.stroke(); }
  });
}
function AveryScale({ texture }: { texture: THREE.Texture }) {
  const [x, z] = planToWorld(ENTRANCE_SCALE_POINT);
  return <group position={[x, 0, z]} rotation={[0, ENTRANCE_FOYER.yaw, 0]}>
    <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.85, 0.24, 0.52]} /><meshStandardMaterial color="#a12b26" roughness={0.75} /></mesh>
    <mesh position={[0, 0.73, 0]}><boxGeometry args={[0.65, 1.25, 0.36]} /><meshStandardMaterial color="#a52e2a" roughness={0.7} /></mesh>
    <mesh position={[0, 1.67, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.625, 0.625, 0.25, 48]} /><meshStandardMaterial color="#9a302a" roughness={0.72} /></mesh>
    <mesh position={[0, 1.67, 0.131]}><circleGeometry args={[0.545, 48]} /><meshStandardMaterial map={texture} roughness={0.9} /></mesh>
    <mesh position={[0, 0.48, 0.19]}><boxGeometry args={[0.45, 0.24, 0.015]} /><meshStandardMaterial color="#7d2523" /></mesh>
  </group>;
}
function Extinguisher({ z }: { z: number }) {
  const [x, worldZ] = planToWorld([825.5, z]);
  return <group position={[x, 0, worldZ]}>
    <mesh position={[0, 0.77, 0]}><cylinderGeometry args={[0.115, 0.115, 0.52, 12]} /><meshStandardMaterial color="#b2b7b4" metalness={0.8} roughness={0.35} /></mesh>
    <mesh position={[0, 1.06, 0]}><boxGeometry args={[0.17, 0.07, 0.055]} /><meshStandardMaterial color="#303838" metalness={0.65} /></mesh>
    <mesh position={[0.08, 0.78, 0]}><boxGeometry args={[0.025, 0.43, 0.035]} /><meshStandardMaterial color="#2c3333" /></mesh>
    <mesh position={[0.119, 0.77, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.13, 0.27]} /><meshStandardMaterial color="#dfded4" /></mesh>
  </group>;
}
export function EntranceFoyer({ furniture = true, roof = true }: { furniture?: boolean; roof?: boolean }) {
  const textures = useMemo(() => ({ wall: masonryTexture(false), gauge: gaugeTexture(), banners: ENTRANCE_BANNERS.map((banner) => bannerTexture(banner.blue, banner.title)), ceiling: canvasTexture((ctx) => {
    ctx.fillStyle = '#ddd9c5'; ctx.fillRect(0, 0, 1024, 1024); ctx.lineWidth = 5;
    for (const color of ['#bbb9a7', '#eeead8']) { ctx.strokeStyle = color;
      const shift = color === '#bbb9a7' ? 0 : 7;
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const x = col * 512 + 26 + shift, y = row * 512 + 26 + shift;
        ctx.strokeRect(x, y, 460, 460); ctx.strokeRect(x + 20, y + 20, 420, 420);
        ctx.beginPath(); ctx.arc(x + 230, y + 230, 106, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }), art: canvasTexture((ctx) => {
    ctx.fillStyle = '#d17b3d'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#aa4f31'; ctx.lineWidth = 18;
    for (let i = 0; i < 15; i++) { ctx.beginPath(); ctx.moveTo(0, i * 80); ctx.lineTo(1024, i * 80 - 220); ctx.stroke(); }
  }) }), []);
  textures.ceiling.wrapS = textures.ceiling.wrapT = THREE.RepeatWrapping;
  const wallGeometry = useMemo(() => metricBoxGeometry([0.025, 3.3, 3.65]), []);
  useEffect(() => () => { wallGeometry.dispose(); textures.wall.dispose(); textures.gauge.dispose(); textures.art.dispose(); textures.ceiling.dispose(); textures.banners.forEach((texture) => texture.dispose()); }, [textures, wallGeometry]);
  const ceiling = useMemo(() => {
    const shape = new THREE.Shape();
    VENUE_ROOMS.find((room) => room.id === 'foyer')!.outline.forEach((point, i) => {
      const [x, z] = planToWorld(point); if (i) shape.lineTo(x, -z); else shape.moveTo(x, -z);
    });
    shape.closePath(); return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => ceiling.dispose(), [ceiling]);
  const [x, z] = planToWorld(ENTRANCE_FOYER.point), [wallX, wallZ] = planToWorld([822, 780]);
  return <group>
    <group position={[x, 0, z]} rotation={[0, ENTRANCE_FOYER.yaw, 0]}>
      {[-1, 1].map((side) => <mesh key={side} position={[side * (ENTRANCE_FOYER.width / 2 + 0.055), ENTRANCE_FOYER.doorHeight / 2, -0.08]}>
        <boxGeometry args={[0.11, ENTRANCE_FOYER.doorHeight, 0.26]} /><meshStandardMaterial color="#795936" roughness={0.92} />
      </mesh>)}
      <mesh position={[0, ENTRANCE_FOYER.doorHeight + 0.035, -0.08]}><boxGeometry args={[ENTRANCE_FOYER.width + 0.22, 0.1, 0.26]} /><meshStandardMaterial color="#795936" roughness={0.92} /></mesh>
      {[-1, 1].map((side) => <group key={`leaf-${side}`} position={[side * (ENTRANCE_FOYER.width / 2 + 0.08), 0, 0.1]} rotation={[0, side * Math.PI / 2, 0]}>
        <group position={[-side * ENTRANCE_FOYER.width / 4, 0, 0]}>
          <mesh position={[0, ENTRANCE_FOYER.doorHeight / 2, 0]}><boxGeometry args={[ENTRANCE_FOYER.width / 2, ENTRANCE_FOYER.doorHeight, 0.06]} /><meshStandardMaterial color="#795936" roughness={0.96} /></mesh>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[(i - 2.5) * ENTRANCE_FOYER.width / 12, ENTRANCE_FOYER.doorHeight / 2, 0]}>
            <boxGeometry args={[0.008, ENTRANCE_FOYER.doorHeight, 0.064]} /><meshStandardMaterial color="#4c3b29" roughness={1} />
          </mesh>)}
          {[0.3, 1.7].map((y) => <mesh key={y} position={[0, y, -0.05]}><boxGeometry args={[ENTRANCE_FOYER.width / 2 - 0.1, 0.11, 0.05]} /><meshStandardMaterial color="#6b5032" /></mesh>)}
        </group>
      </group>)}
    </group>
    {/* Shared brick finish requested by user, on the existing cloakroom boundary. */}
    <mesh position={[wallX + 0.13, 1.65, wallZ]} geometry={wallGeometry}><meshStandardMaterial map={textures.wall} bumpMap={textures.wall} bumpScale={0.02} roughness={0.97} /></mesh>
    <group position={[wallX + 0.153, 1.9, wallZ]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><boxGeometry args={[1.75, 0.55, 0.045]} /><meshStandardMaterial color="#403d34" /></mesh>
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[1.66, 0.46]} /><meshStandardMaterial map={textures.art} roughness={0.9} /></mesh>
    </group>
    <Extinguisher z={794} /><Extinguisher z={800} />
    {roof && <group>
      {/* Local entrance soffit is a photo estimate, separate from the global height reference. */}
      <mesh geometry={ceiling} rotation={[-Math.PI / 2, 0, 0]} position={[0, 3.4, 0]}><meshStandardMaterial map={textures.ceiling} roughness={1} side={THREE.DoubleSide} /></mesh>
      {[690, 710, 735, 755, 775, 795].flatMap((z) => {
        const outline = VENUE_ROOMS.find((room) => room.id === 'foyer')!.outline;
        const intersections: number[] = [];
        outline.forEach((a, i) => { const b = outline[(i + 1) % outline.length];
          if ((a[1] > z) !== (b[1] > z)) intersections.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        });
        intersections.sort((a, b) => a - b);
        return intersections.filter((_, i) => i % 2 === 0).map((start, i) => {
          const [startX, worldZ] = planToWorld([start, z]), [endX] = planToWorld([intersections[i * 2 + 1], z]);
          return <mesh key={`${z}-${i}`} position={[(startX + endX) / 2, 3.31, worldZ]}><boxGeometry args={[endX - startX, 0.18, 0.13]} /><meshStandardMaterial color="#282c2b" roughness={0.9} /></mesh>;
        });
      })}
    </group>}
    {furniture && <group>
      <AveryScale texture={textures.gauge} />
      {ENTRANCE_BANNERS.map((banner, i) => {
        const [bannerX, bannerZ] = planToWorld(banner.point);
        return <group key={banner.id} position={[bannerX, 0, bannerZ]} rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 1.05, 0]}><boxGeometry args={[0.82, 2.0, 0.025]} /><meshStandardMaterial color={banner.blue ? '#4d9bb7' : '#202629'} /></mesh>
          <mesh position={[0, 1.05, 0.017]}><planeGeometry args={[0.82, 2]} /><meshStandardMaterial map={textures.banners[i]} roughness={1} /></mesh>
          <mesh position={[0, 0.035, 0]}><boxGeometry args={[0.88, 0.07, 0.22]} /><meshStandardMaterial color="#787e7b" metalness={0.55} /></mesh>
        </group>;
      })}
    </group>}
  </group>;
}
