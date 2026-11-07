// The Exodus reel uses the same press as podqa-01-comic — same paper, same halftone, same ink — but a
// different pair of spot plates: desert ochre and Nile blue, so the two films read as two printings of
// one workshop rather than the same page recoloured.
import { C } from '../../podqa-01-comic/engine/comic.mjs';

Object.assign(C, {
  paper: '#F3E8CE',
  panel: '#FCF5E2',
  ink: '#191410',
  spot: '#B3402A',        // ochre-red: blood, fire, the staff
  spot2: '#2E5A66',       // Nile blue: water, night, distance
});

export * from '../../podqa-01-comic/engine/comic.mjs';
export { C };
