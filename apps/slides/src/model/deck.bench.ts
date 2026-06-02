import { bench, describe } from 'vitest';
import { buildHundredSlideDeck } from './benchDoc';
import { parseFwsl, serializeFwsl } from './fwsl';

describe('Slides deck open', () => {
  const json = serializeFwsl(buildHundredSlideDeck());

  bench('parse 100-slide .fwsl', () => {
    parseFwsl(json);
  });
});
