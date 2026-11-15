import { describe, expect, it } from 'vitest';
import { GAMEPAD } from '../src/config/controls';
import { emptyButtons, mergeButtons, PlayerInput, readGamepad } from '../src/systems/InputState';

const withButtons = (...on: (keyof ReturnType<typeof emptyButtons>)[]) => {
  const b = emptyButtons();
  for (const a of on) b[a] = true;
  return b;
};

describe('PlayerInput', () => {
  it('detects press and release edges', () => {
    const p = new PlayerInput();
    p.update(emptyButtons());
    p.update(withButtons('jump'));
    expect(p.pressed('jump')).toBe(true);
    expect(p.down('jump')).toBe(true);
    p.update(withButtons('jump'));
    expect(p.pressed('jump')).toBe(false);
    expect(p.down('jump')).toBe(true);
    p.update(emptyButtons());
    expect(p.released('jump')).toBe(true);
    expect(p.down('jump')).toBe(false);
  });

  it('does not report a key held on scene entry as a new press', () => {
    const p = new PlayerInput();
    p.update(withButtons('start'));
    expect(p.down('start')).toBe(true);
    expect(p.pressed('start')).toBe(false);
  });
});

describe('mergeButtons', () => {
  it('ORs keyboard and gamepad', () => {
    const m = mergeButtons(withButtons('left'), withButtons('jump'));
    expect(m).toEqual(withButtons('left', 'jump'));
  });
});

describe('readGamepad', () => {
  const pad = (buttons: number[], axes: number[] = [0, 0]) => {
    const b = Array<boolean>(17).fill(false);
    for (const i of buttons) b[i] = true;
    return { buttons: b, axes };
  };

  it('maps standard buttons', () => {
    expect(readGamepad(pad([0, 2, 9]), GAMEPAD)).toEqual(withButtons('jump', 'action', 'start'));
    expect(readGamepad(pad([12, 14]), GAMEPAD)).toEqual(withButtons('up', 'left'));
  });

  it('applies stick deadzone', () => {
    expect(readGamepad(pad([], [0.3, -0.3]), GAMEPAD)).toEqual(emptyButtons());
    expect(readGamepad(pad([], [0.9, 0.8]), GAMEPAD)).toEqual(withButtons('right', 'down'));
    expect(readGamepad(pad([], [-0.9, -0.8]), GAMEPAD)).toEqual(withButtons('left', 'up'));
  });
});
