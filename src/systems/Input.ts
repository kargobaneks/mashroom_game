import Phaser from 'phaser';
import { GAMEPAD, KEYBOARD } from '../config/controls';
import {
  ACTIONS,
  emptyButtons,
  mergeButtons,
  PLAYER_IDS,
  PlayerInput,
  readGamepad,
  type Action,
  type GamepadSnapshot,
  type PlayerId,
  type RawButtons,
} from './InputState';

type KeyMap = Record<Action, Phaser.Input.Keyboard.Key[]>;

/**
 * Ввод двух игроков в сцене: клавиатура по раскладке из config/controls и геймпады
 * (первый подключённый — игрок 1, второй — игрок 2). Вызывать update() раз за шаг логики.
 */
export class Controls {
  private readonly players: Record<PlayerId, PlayerInput> = {
    1: new PlayerInput(),
    2: new PlayerInput(),
  };
  private readonly keys: Record<PlayerId, KeyMap>;
  /** Клавиши, нажатые с прошлого шага (даже если уже отпущены). */
  private readonly latched = new Set<Phaser.Input.Keyboard.Key>();
  /**
   * Клавиши, зажатые ещё до этой сцены. У новой сцены свежие объекты Key, и такая клавиша
   * «нажимается» первым автоповтором ОС — это не новое нажатие, игнорируем до отпускания.
   */
  private readonly heldOver = new Set<Phaser.Input.Keyboard.Key>();

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin is disabled');
    const bind = (id: PlayerId): KeyMap => {
      const map = {} as KeyMap;
      for (const a of ACTIONS) {
        map[a] = KEYBOARD[id][a].map((name) => kb.addKey(Phaser.Input.Keyboard.KeyCodes[name]));
      }
      return map;
    };
    this.keys = { 1: bind(1), 2: bind(2) };
    for (const k of this.allKeys()) {
      k.on('down', (_key: unknown, ev: KeyboardEvent) => {
        if (ev.repeat) this.heldOver.add(k);
        else this.latched.add(k);
      });
      k.on('up', () => this.heldOver.delete(k));
    }
  }

  update(): void {
    const keyState = this.snapshotKeys();
    const pads = this.connectedPads();
    PLAYER_IDS.forEach((id, i) => {
      const pad = pads[i];
      const fromPad = pad ? readGamepad(pad, GAMEPAD) : emptyButtons();
      this.player(id).update(mergeButtons(this.readKeyboard(id, keyState), fromPad));
    });
  }

  player(id: PlayerId): PlayerInput {
    return this.players[id];
  }

  /** Для меню: нажал ли кнопку хоть один игрок. */
  anyPressed(...actions: Action[]): boolean {
    return PLAYER_IDS.some((id) => actions.some((a) => this.players[id].pressed(a)));
  }

  /**
   * Состояние каждой клавиши на этот шаг. Защёлка: нажатие короче шага логики (нажал
   * и отпустил в одном кадре) всё равно засчитывается на один шаг. Phaser-овский JustDown
   * тут не годится: отпускание клавиши сбрасывает его в том же кадре.
   */
  private snapshotKeys(): Map<Phaser.Input.Keyboard.Key, boolean> {
    const state = new Map<Phaser.Input.Keyboard.Key, boolean>();
    for (const k of this.allKeys())
      state.set(k, (k.isDown && !this.heldOver.has(k)) || this.latched.has(k));
    this.latched.clear();
    return state;
  }

  /** Уникальные клавиши обоих игроков (общая клавиша, например Enter, — один объект Key). */
  private allKeys(): Set<Phaser.Input.Keyboard.Key> {
    const all = new Set<Phaser.Input.Keyboard.Key>();
    for (const id of PLAYER_IDS)
      for (const a of ACTIONS) for (const k of this.keys[id][a]) all.add(k);
    return all;
  }

  private readKeyboard(
    id: PlayerId,
    state: ReadonlyMap<Phaser.Input.Keyboard.Key, boolean>,
  ): RawButtons {
    const out = emptyButtons();
    for (const a of ACTIONS) out[a] = this.keys[id][a].some((k) => state.get(k) === true);
    return out;
  }

  private connectedPads(): GamepadSnapshot[] {
    const plugin = this.scene.input.gamepad;
    if (!plugin || !plugin.total) return [];
    return plugin
      .getAll()
      .filter((p) => p.connected)
      .sort((a, b) => a.index - b.index)
      .map((p) => ({
        buttons: p.buttons.map((b) => b.pressed),
        axes: p.axes.map((ax) => ax.getValue()),
      }));
  }
}
