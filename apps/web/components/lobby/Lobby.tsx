'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Crosshair, LoaderCircle } from 'lucide-react';
import { useGame, unlockAudio } from '../../lib/store';
export function Lobby() {
  const [name, setName] = useState('');
  const status = useGame((s) => s.status),
    error = useGame((s) => s.error),
    join = useGame((s) => s.join);
  useEffect(() => {
    setName(localStorage.getItem('ghost:name') || '');
  }, []);
  const enter = () => {
    unlockAudio();
    localStorage.setItem('ghost:name', name.trim());
    join(name.trim());
  };
  return (
    <div className="lobby simple-lobby">
      <header className="lobby-header">
        <a className="brand" href="/" aria-label="Ghost Arena home">
          <span className="ghost-mark">
            <GhostMark />
          </span>
          <span>
            GHOST<span className="brand-light">ARENA</span>
          </span>
        </a>
        <span className="build-tag">
          <i />
          ONE ARENA. ALWAYS ON.
        </span>
      </header>
      <section className="hero">
        <div className="eyebrow">
          <span className="tiny-cross">✳</span> GOOD FRIENDS. QUESTIONABLE AIM.
        </div>
        <h1>
          MAKE A<br />
          <span>MESS.</span>
          <span className="hero-asterisk">✳</span>
        </h1>
        <p className="hero-copy">
          The paint never dries. The game never stops.
          <br />
          Pick a name. Everyone’s already in there.
        </p>
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
      </section>
      <div className="arena-caption">
        <span className="live-label">
          <i />
          LIVE / LONDON
        </span>
        <h2>
          DEV DAY
          <br />
          EXCHANGE<span>↗</span>
        </h2>
        <p>YOUR VENUE. EVERYONE’S PLAYGROUND.</p>
      </div>
      <footer className="lobby-footer">
        <div>
          <span className="footer-dot" />
          NO HARD FEELINGS. JUST PAINT.
        </div>
        <a href="/venue">VIEW VENUE FLOOR PLAN ↗</a>
      </footer>
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
