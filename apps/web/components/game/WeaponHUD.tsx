'use client';
import type { CSSProperties } from 'react';
import { WEAPONS, isWeaponId } from '../../../../packages/shared/src/weapons';
import { WeaponSprite, AmmoReadout } from './WeaponSprite';
import { useGame } from '../../lib/store';

export function WeaponHUD() {
  const s = useGame();
  const me = s.snapshot?.players.find((p) => p.id === s.id);
  const id = isWeaponId(me?.weapon) ? me.weapon : 'pistol';
  const w = WEAPONS[id];
  const fresh = s.weaponChangedAt > 0 && performance.now() - s.weaponChangedAt < 2800;
  const style = { '--weapon-color': w.color } as CSSProperties;
  return (
    <>
      <aside className="weapon-card" data-weapon={id} style={style} aria-label={`Equipped weapon: ${w.name}`}>
        <div className="weapon-kicker"><span>RANDOM ARSENAL</span><b>∞ AMMO</b></div>
        <div className="weapon-title"><WeaponSprite weapon={id} /><div><small>{w.label}</small><strong>{w.name}</strong></div></div>
        <AmmoReadout weapon={id} />
        <p>{w.hint}</p>
        <div className="weapon-stats"><span>{w.damage === 3 ? 'ONE-SHOT' : `${w.damage} DMG`}{w.pellets > 1 ? ` × ${w.pellets}` : ''}</span><span>{(1000 / w.interval).toFixed(1)}/SEC</span><span>{w.range}m</span></div>
        <footer>GET A KILL <span>↗</span> GET A DIFFERENT GUN</footer>
      </aside>
      {fresh && (
        <div key={s.weaponChangedAt} className="weapon-swap" style={style} role="status" aria-live="polite">
          <small>ELIMINATION / LOADOUT SHUFFLED</small><strong>{w.icon} {w.name}</strong><span>{w.hint}</span>
        </div>
      )}
    </>
  );
}
