'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  LogOut,
  Maximize,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useGame, runtime } from '../../lib/store';
import { MobileControls } from './MobileControls';
import { GhostMark } from '../lobby/Lobby';
import { PETS } from '../../../../packages/shared/src/pets';
export function HUD() {
  const s = useGame(),
    [now, setNow] = useState(Date.now()),
    [board, setBoard] = useState(false),
    [locked, setLocked] = useState(false),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + runtime.clockOffset), 100);
    const lock = () => setLocked(!!document.pointerLockElement);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setBoard(true);
      }
      if (e.code === 'Escape') setMenu(false);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Tab') setBoard(false);
    };
    document.addEventListener('pointerlockchange', lock);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      clearInterval(t);
      document.removeEventListener('pointerlockchange', lock);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  const snap = s.snapshot,
    me = snap?.players.find((p) => p.id === s.id),
    remaining = Math.max(0, Math.ceil(((snap?.endsAt || now) - now) / 1000)),
    dead = me?.hp === 0,
    finished = false;
  const sorted = [...(snap?.players || [])].sort(
    (a, b) => b.score - a.score || a.deaths - b.deaths,
  );
  return (
    <div className={`hud ${now - Date.now() > 1e8 ? '' : ''}`}>
      <header className="hud-top">
        <div className="hud-brand">
          <GhostMark />
          <span>
            GHOST
            <br />
            ARENA
          </span>
        </div>
        <div className="match-clock">
          <span>
            LIVE ARENA <i> / {snap?.players.length || 1} PLAYING</i>
          </span>
          <strong className={remaining < 30 ? 'time-low' : ''}>∞</strong>
        </div>
        <div className="hud-actions">
          <span className="room-pill live-arena-badge">
            <i />
            ALWAYS ON
          </span>
          <button
            className="icon-button hud-menu"
            aria-label="Game menu"
            onClick={() => setMenu(!menu)}
          >
            <Users size={19} />
          </button>
        </div>
      </header>
      {menu && (
        <div className="game-menu">
          <button onClick={() => setBoard(true)}>
            <Trophy size={16} />
            Scoreboard
          </button>
          <button onClick={s.toggleMute}>
            {s.muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {s.muted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Maximize size={16} />
            Fullscreen
          </button>
          <button onClick={s.leave}>
            <LogOut size={16} />
            Leave arena
          </button>
        </div>
      )}
      <div className={`crosshair ${performance.now() - s.hitAt < 180 ? 'confirmed' : ''}`}>
        <span />
        <span />
        <span />
        <span />
        {performance.now() - s.hitAt < 180 && <b>×</b>}
      </div>
      <div className="kill-feed">
        {snap?.feed
          .filter((f) => now - f.at < 7000)
          .slice(0, 4)
          .map((f) => (
            <div key={f.id}>
              <b style={{ color: f.color }}>{f.killer}</b>
              <Crosshair size={13} />
              <span>{f.victim}</span>
            </div>
          ))}
      </div>
      <div className="status-toast">
        {s.status === 'reconnecting' ? (
          <span className="reconnecting">
            <i />
            CONNECTION LOST · RECONNECTING…
          </span>
        ) : s.status === 'practice' ? (
          <span>PRACTICE MODE · NO OTHER PLAYERS</span>
        ) : snap?.players.length === 1 ? (
          <span>THE ARENA IS LIVE. INVITE FRIENDS TO THIS WEBSITE.</span>
        ) : null}
      </div>
      <div className="desktop-hint">
        {!locked && !dead && !finished && (
          <span>
            CLICK THE ARENA TO AIM <small>ESC to release</small>
          </span>
        )}
      </div>
      <div className="hud-bottom">
        <div className="player-status">
          <div className="player-avatar">
            <GhostMark />
          </div>
          <div>
            <span className="callsign">{me?.name || 'ROOKIE'}</span>
            <small className="buddy-readout">BUDDY · {me?.pet && me.pet in PETS ? PETS[me.pet].name.toUpperCase() : 'CODEX'}</small>
            <div className="health-pips">
              {[1, 2, 3].map((n) => (
                <i key={n} className={(me?.hp || 0) >= n ? 'full' : ''} />
              ))}
            </div>
          </div>
          <div className="score-total">
            <strong>{me?.score || 0}</strong>
            <span>ELIMS</span>
          </div>
        </div>
        <div className="desktop-controls">
          <span>
            <kbd>WASD</kbd>MOVE
          </span>
          <span>
            <kbd>SPACE</kbd>JUMP
          </span>
          <span>
            <kbd>SHIFT</kbd>DIVE
          </span>
          <span>
            <kbd>R</kbd>FLOP
          </span>
          <button onClick={() => setBoard(true)}>
            <kbd>TAB</kbd>SCORES
          </button>
        </div>
        <div className="ammo">
          <img className="marker-icon" src="/characters/marker.png" alt="" />
          <strong>∞</strong>
          <span>
            PAINT
            <br />
            REPEAT
          </span>
        </div>
      </div>
      <MobileControls />
      {performance.now() - s.hurtAt < 260 && <div className="damage-vignette" />}
      {dead && (
        <div className="respawn-overlay">
          <span className="eyebrow">A FRESH COAT OF HUMILIATION</span>
          <h2>
            YOU GOT
            <br />
            <em>PAINTED.</em>
          </h2>
          <p>
            Back in <strong>{Math.max(1, Math.ceil(((me?.respawnAt || now) - now) / 1000))}</strong>
          </p>
        </div>
      )}
      {(board || finished) && (
        <div className="score-overlay">
          <section className="scoreboard">
            <div className="score-heading">
              <div>
                <span className="eyebrow">{finished ? 'ROUND COMPLETE' : 'LIVE STANDINGS'}</span>
                <h2>{finished ? 'NICE MESS.' : 'THE LINEUP.'}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close scoreboard"
                onClick={() => setBoard(false)}
              >
                <X />
              </button>
            </div>
            {finished && (
              <p>
                New round starts in{' '}
                {Math.max(0, Math.ceil(((snap?.endsAt || now) + 8000 - now) / 1000))} seconds.
              </p>
            )}
            <div className="score-row score-labels">
              <span>#</span>
              <span>PLAYER</span>
              <span>ELIMS</span>
              <span>OUTS</span>
            </div>
            {sorted.map((p, i) => (
              <div className={`score-row ${p.id === s.id ? 'you' : ''}`} key={p.id}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <i style={{ background: p.color }} />
                  {p.name}
                  {p.id === s.id && <small>YOU</small>}
                </span>
                <b>{p.score}</b>
                <span>{p.deaths}</span>
              </div>
            ))}
            <div className="score-foot">
              <span>LIVE ARENA · {sorted.length}/12 PLAYERS</span>
              <button onClick={s.leave}>
                LEAVE ARENA <LogOut size={14} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
