'use client';
import dynamic from 'next/dynamic';
import { useGame } from '../lib/store';
import { Lobby } from '../components/lobby/Lobby';
import { HUD } from '../components/game/HUD';
import { useControls } from '../hooks/useControls';
const Scene = dynamic(() => import('../components/game/Scene'), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <span className="ghost-icon">A</span>
      <p>PAINTING THE ARENA…</p>
    </div>
  ),
});
export default function Home() {
  const screen = useGame((s) => s.screen);
  useControls(screen === 'game');
  return (
    <main className={screen === 'game' ? 'game-shell' : 'lobby-shell'}>
      <Scene />
      {screen === 'lobby' ? <Lobby /> : <HUD />}
    </main>
  );
}
