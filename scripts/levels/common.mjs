// Общие помощники расстановки для карт уровней.
export function placers(m) {
  const box = (col, row, contains) =>
    m.point('item', col, row, contains ? { kind: 'box', contains } : { kind: 'box' });
  return {
    box,
    /** Стопка из двух ящиков у края платформы. */
    stack(col, row, topContains) {
      box(col, row);
      box(col, row - 1, topContains);
    },
    /** Горизонтальная пара. */
    pair(col, row, a, b) {
      box(col, row, a);
      box(col + 1, row, b);
    },
    enemy: (kind, col, row) => m.point('enemy', col, row, { kind }),
    tc: (col, row) => m.point('pickup', col, row, { kind: 'timecode' }),
  };
}
