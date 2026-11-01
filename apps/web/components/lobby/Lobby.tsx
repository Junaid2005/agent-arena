'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Crosshair, LoaderCircle } from 'lucide-react';
import { useGame, unlockAudio } from '../../lib/store';
import { PETS, isPetId, type PetId } from '../../../../packages/shared/src/pets';
export function Lobby() {
  const [name, setName] = useState('');
  const pet = useGame((s) => s.selectedPet);
  const setPet = useGame((s) => s.selectPet);
  const status = useGame((s) => s.status),
    error = useGame((s) => s.error),
    join = useGame((s) => s.join);
  useEffect(() => {
    setName(localStorage.getItem('ghost:name') || '');
    const savedPet = localStorage.getItem('ghost:pet');
    if (isPetId(savedPet)) setPet(savedPet);
  }, [setPet]);
  const enter = () => {
    unlockAudio();
    localStorage.setItem('ghost:name', name.trim());
    localStorage.setItem('ghost:pet', pet);
    join(name.trim(), pet);
  };
  return (
    <div className="lobby simple-lobby">
      <section className="hero" aria-labelledby="arena-title">
        <h1 id="arena-title">AGENT <span>ARENA</span></h1>
        <form
          className="join-card"
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
        >
          <label className="field-label" htmlFor="player-name">
            YOUR CALLSIGN
          </label>
          <div className="name-field">
            <input
              id="player-name"
              placeholder="What should we call you?"
              value={name}
              maxLength={18}
              required
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
            />
            <Crosshair size={20} />
          </div>
          <fieldset className="pet-picker">
            <legend>CHOOSE YOUR CHARACTER</legend>
            <div className="pet-grid">
              {(Object.entries(PETS) as [PetId, (typeof PETS)[PetId]][]).map(([id, item]) => (
                <button
                  type="button"
                  key={id}
                  className={pet === id ? 'pet-choice selected' : 'pet-choice'}
                  onClick={() => setPet(id)}
                  aria-pressed={pet === id}
                >
                  <span className="pet-preview" style={{ backgroundImage: `url(${item.sprite})` }} />
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <button className="play-button" type="submit" disabled={status === 'connecting'}>
            {status === 'connecting' ? (
              <>
                <LoaderCircle className="spin" size={20} />
                ENTERING…
              </>
            ) : (
              <>
                ENTER ARENA
                <ArrowUpRight size={25} />
              </>
            )}
          </button>
        </form>
        <div className="pet-poster" aria-hidden="true" style={{ backgroundImage: `url(${PETS[pet].sprite})` }} />
      </section>
      <footer className="venue-name"><a href="/venue">HOXTON DOCKS / DEV DAY EXCHANGE ↗</a></footer>
    </div>
  );
}
export function GhostMark() {
  return (
    <svg viewBox="0 0 32 34" fill="none" aria-hidden="true">
      <path d="M4 31V14a12 12 0 0 1 24 0v17l-6-4-6 4-6-4-6 4Z" fill="currentColor" />
      <rect x="10" y="12" width="4" height="7" rx="2" fill="#172421" />
      <rect x="19" y="12" width="4" height="7" rx="2" fill="#172421" />
    </svg>
  );
}
