import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { LEVELS } from '../src/data/levels';
import { parseTiledLevel } from '../src/sim/level';
import { World } from '../src/sim/World';
import { overlaps } from '../src/sim/geom';
import { TestInput } from './helpers';
it('dbg', () => {
  const w = new World(parseTiledLevel(LEVELS[1]![3]!.map), [{ id: 1, hero: 'sergey' }]);
  w.warpToBoss(); w.resume();
  const p = w.players[0]!; const b = w.boss!; const inp = new TestInput(); const log: string[] = [];
  let shots = 0, touching = 0;
  for (let f = 0; f < 1200; f++) {
    const before = w.projectiles.length;
    w.step({ 1: inp.hold() });
    if (w.projectiles.length > before) shots++;
    if (w.projectiles.some((q) => overlaps(q, p))) touching++;
    if (f % 60 === 0) log.push(`${f} p ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.state} h${p.vitals.hearts} inv${p.vitals.invuln} god${p.god} | b ${b.state} ${b.x.toFixed(0)},${b.y.toFixed(0)} | proj ${w.projectiles.map(q=>q.kind+'@'+q.x.toFixed(0)+','+q.y.toFixed(0)).join(' ')}`);
  }
  writeFileSync('/private/tmp/claude-501/-Users-nza-Desktop-Develop-mashroom/63bb2781-3fb1-4ac2-a7a0-13767e96a53e/scratchpad/agr.txt', `shots ${shots} touching ${touching} hearts ${p.vitals.hearts} lives ${p.vitals.lives}\n` + log.join('\n'));
});
