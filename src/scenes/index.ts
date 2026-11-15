import { Boot } from './Boot';
import { Bonus } from './Bonus';
import { Cutscene } from './Cutscene';
import { Ending } from './Ending';
import { GameOver } from './GameOver';
import { Level } from './Level';
import { ParkHub } from './ParkHub';
import { PlayerSelect } from './PlayerSelect';
import { Title } from './Title';
import { WireChoice } from './WireChoice';

/** Первая сцена в списке стартует автоматически. */
export const SCENES = [
  Boot,
  Title,
  PlayerSelect,
  Cutscene,
  Level,
  ParkHub,
  Bonus,
  WireChoice,
  GameOver,
  Ending,
];
