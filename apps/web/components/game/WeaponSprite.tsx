import type { WeaponId } from '../../../../packages/shared/src/weapons';
import { WEAPON_ART } from '../../lib/weapon-visuals';

export function WeaponSprite({ weapon }: { weapon: WeaponId }) {
  const shapes = {
    pistol: (
      <>
        <path d="M10 12h37v10H31l-4 13H16l4-13H10z" />
        <path d="M47 15h9v5h-9zM13 9h5v3h-5z" />
        <path d="M31 22v7h8v-7" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ),
    ar: (
      <>
        <path d="M17 15h27v10H17zM4 17h12v14H5zM44 17h23v5H44zM28 25h10l3 12H30zM19 25h6v9h-6z" />
        <path d="M23 11h18v3H23zM48 14h4v12h-4z" />
      </>
    ),
    smg: (
      <>
        <path d="M14 13h31v12H14zM45 16h16v7H45zM18 25h7v11h-7zM31 25h8v14h-8zM4 16h10v5H4zM21 8h12v5H21z" />
      </>
    ),
    sniper: (
      <>
        <path d="M3 20h17v11H3zM20 17h25v8H20zM45 19h25v4H45zM25 25h6v9h-6z" />
        <path
          d="M28 14v-3h16v5H28zM34 16v2M50 24l-4 12M50 24l6 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      </>
    ),
    rpg: (
      <>
        <path d="M5 14h51v13H5zM2 11h5v19H2zM56 12l14 8-14 9zM24 27h7v11h-7zM30 14V6h12v3h-8v5z" />
      </>
    ),
    laser: (
      <>
        <path d="M13 14l10-5 22 6v12l-22 4-10-6zM20 29h8v9h-8zM44 18h23v6H44z" />
        <path d="M49 12v19M56 12v19M63 12v19" stroke="currentColor" strokeWidth="3" />
        <rect x="23" y="3" width="17" height="6" rx="3" />
      </>
    ),
    fart: (
      <>
        <rect x="12" y="12" width="31" height="20" rx="7" />
        <path d="M43 16h17v12H43zM60 13h6v18h-6zM19 31h8v9h-8z" />
        <circle cx="27" cy="11" r="8" />
        <path d="M22 2h10M27 2v3" fill="none" stroke="currentColor" strokeWidth="3" />
      </>
    ),
    confetti: (
      <>
        <path d="M17 15h25v13H17zM4 17h13v16H4zM23 28h7v10h-7zM42 15h23v5H42zM42 23h23v5H42z" />
        <path d="M48 11l-2-5M57 9l3-5M67 12l4-3" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  };
  return (
    <svg className="weapon-sprite" viewBox="0 0 74 42" aria-hidden="true" fill="currentColor">
      {shapes[weapon]}
    </svg>
  );
}
function AmmoSprite({ weapon }: { weapon: WeaponId }) {
  return (
    <svg className="ammo-sprite" viewBox="0 0 32 36" aria-hidden="true" fill="currentColor">
      {weapon === 'rpg' ? (
        <>
          <path d="M16 2l7 11v14H9V13z" />
          <path d="M9 22l-5 10 9-4h6l9 4-5-10" />
          <path d="M13 30l3 5 3-5" />
        </>
      ) : weapon === 'fart' ? (
        <>
          <rect x="8" y="11" width="16" height="21" rx="6" />
          <path d="M12 5h8v6h-8z" />
          <circle cx="9" cy="6" r="3" />
          <circle cx="23" cy="3" r="2" />
        </>
      ) : weapon === 'laser' ? (
        <>
          <rect
            x="7"
            y="4"
            width="18"
            height="28"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M18 8l-8 12h6l-2 9 9-13h-7z" />
        </>
      ) : weapon === 'confetti' ? (
        <>
          <rect x="9" y="12" width="14" height="19" rx="2" />
          <rect x="7" y="29" width="18" height="4" />
          <path d="M9 7l-3-4M16 7V1M23 7l3-4" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="10" r="2" />
        </>
      ) : (
        <>
          <path
            d={`M11 28V${weapon === 'sniper' ? 11 : 16}Q11 6 16 2q5 4 5 ${weapon === 'sniper' ? 9 : 14}v12z`}
          />
          <path d="M9 29h14v4H9z" />
          <path d="M11 22h10" fill="none" stroke="#172421" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
export function AmmoReadout({ weapon }: { weapon: WeaponId }) {
  return (
    <div className="ammo-readout">
      <AmmoSprite weapon={weapon} />
      <span>{WEAPON_ART[weapon].ammo}</span>
      <b>∞</b>
    </div>
  );
}
