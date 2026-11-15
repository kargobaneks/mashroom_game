import type { Player } from '../src/sim/Player';
import type { World } from '../src/sim/World';
import type { Action } from '../src/systems/InputState';
import { TestInput } from './helpers';

/**
 * Автопилот для проверки проходимости карт. Неуязвим (как F1), но в пропасть и воду падает.
 *  • вправо: идёт вправо, прыгает перед стеной, ящиком или ямой;
 *  • вниз: спрыгивает с тонких уступов, на сплошном — идёт вправо;
 *  • вверх: ищет платформу на 2 тайла выше и прыгает к ней.
 */
export function autopilotKeys(w: World, p: Player, jumpHeld: boolean): Action[] {
  const g = w.grid;
  const T = g.size;
  const dir = w.camera.segment.dir;
  const feet = p.y + p.h;
  const cx = p.x + p.w / 2;
  const surface = (tx: number, ty: number) => g.isSolid(tx, ty) || g.isOneway(tx, ty);
  const press = (keys: Action[]): Action[] => (jumpHeld ? keys.filter((k) => k !== 'jump') : keys);

  if (dir === 'down') {
    if (!p.onGround) return [];
    const onLedge = g.isOneway(Math.floor(cx / T), Math.floor((feet + 1) / T));
    return onLedge ? press(['down', 'jump']) : ['right'];
  }

  if (dir === 'up') {
    if (!p.onGround)
      return p.vy < 0
        ? ['jump', p.facing > 0 ? 'right' : 'left']
        : [p.facing > 0 ? 'right' : 'left'];
    // Ближайшая колонка с поверхностью на 2 тайла выше ног.
    const row = Math.round(feet / T) - 2;
    let best: number | null = null;
    for (let tx = Math.floor(w.camera.x / T); tx < Math.ceil((w.camera.x + w.camera.w) / T); tx++) {
      if (surface(tx, row) && !g.isSolid(tx, row - 1)) {
        const x = tx * T + T / 2;
        if (best === null || Math.abs(x - cx) < Math.abs(best - cx)) best = x;
      }
    }
    if (best === null) return ['right'];
    const side: Action = best > cx ? 'right' : 'left';
    return Math.abs(best - cx) <= 40 ? press([side, 'jump']) : [side];
  }

  const ahead = p.x + p.w + 6;
  const feetRow = Math.floor((feet - 1) / T);
  const wall =
    g.isSolid(Math.floor(ahead / T), feetRow) ||
    w.solidsFor(p).some((s) => ahead >= s.x && ahead < s.x + s.w && s.y < feet);
  const probe = Math.floor((ahead + 4) / T);
  const groundRow = Math.floor((feet + 1) / T);
  // Провал — если впереди нет опоры ни на уровне ног, ни на 1–3 тайла ниже (туда просто сходят).
  let lowerLanding = false;
  for (let dy = 1; dy <= 3 && !lowerLanding; dy++) {
    for (let dx = 0; dx <= 2 && !lowerLanding; dx++)
      lowerLanding = surface(probe + dx, groundRow + dy);
  }
  const hole = !surface(probe, groundRow) && !lowerLanding;
  // В падении над опорой (стол, ящик, стопка) — перестать лететь вперёд и встать на неё.
  if (!p.onGround && p.vy > 0) {
    const tx = Math.floor(cx / T);
    let below = false;
    for (
      let ty = Math.floor(feet / T);
      ty < Math.floor((w.camera.y + w.camera.h) / T) && !below;
      ty++
    ) {
      below = surface(tx, ty);
    }
    const onItem = w.solidsFor(p).some((sd) => cx >= sd.x && cx < sd.x + sd.w && sd.y >= feet);
    if (below || onItem) return [];
  }
  const wantJump = p.onGround ? wall || hole : p.vy < 0;
  // На земле с ещё зажатым прыжком новое нажатие не сработает: замереть на кадр и отпустить.
  if (p.onGround && wantJump && jumpHeld) return [];
  const keys: Action[] = ['right'];
  if (wantJump) keys.push('jump');
  return keys;
}

/** Гнать автопилот, пока until() не станет true или не кончатся кадры. */
export function drive(w: World, until: () => boolean, maxFrames: number): number {
  const p = w.players[0]!;
  const input = new TestInput();
  let jumpHeld = false;
  let frames = 0;
  while (frames < maxFrames && !until()) {
    const keys = autopilotKeys(w, p, jumpHeld);
    jumpHeld = keys.includes('jump');
    input.hold(...keys);
    w.step({ 1: input });
    frames++;
  }
  return frames;
}
