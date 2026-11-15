import Phaser from 'phaser';
import { DISPLAY } from './config/display';
import { SCENES } from './scenes';
import { computeZoom } from './systems/Zoom';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  roundPixels: true,
  scale: {
    // Свой целочисленный масштаб вместо FIT: пиксели не плывут, по краям чёрные поля.
    mode: Phaser.Scale.NONE,
    zoom: computeZoom(window.innerWidth, window.innerHeight),
  },
  fps: { target: DISPLAY.fps },
  input: { gamepad: true },
  physics: {
    default: 'arcade',
    arcade: { fps: DISPLAY.fps, fixedStep: true, gravity: { x: 0, y: 0 } },
  },
  scene: SCENES,
});

window.addEventListener('resize', () => {
  game.scale.setZoom(computeZoom(window.innerWidth, window.innerHeight));
});

if (import.meta.env.DEV) {
  // Доступ к игре из консоли браузера для отладки; в продакшен-сборку не попадает.
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
