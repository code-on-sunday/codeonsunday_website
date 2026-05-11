export const PALETTES = [
  { from: '#ffd6a5', mid: '#ffadad', to: '#bdb2ff' }, // peach / pink / lavender — matches trung
  { from: '#caffbf', mid: '#9bf6ff', to: '#a0c4ff' }, // mint / cyan / blue
  { from: '#fdffb6', mid: '#ffadad', to: '#ffc6ff' }, // butter / coral / orchid
  { from: '#bdb2ff', mid: '#a0c4ff', to: '#caffbf' }, // lavender / sky / mint
  { from: '#ffc6ff', mid: '#ffd6a5', to: '#caffbf' }, // orchid / peach / mint
  { from: '#a0c4ff', mid: '#bdb2ff', to: '#ffc6ff' }, // sky / lavender / orchid
];

export function paletteFor(index) {
  return PALETTES[index % PALETTES.length];
}
