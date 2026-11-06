// cues.js — the episode's timeline. Everything (picture and score) is written against these numbers.
// ~62 s at 24 fps. Beat grid 120 BPM → one beat = 0.5 s = 12 frames.
export const FPS = 24;
export const DUR = 62.0;
export const BPM = 120;
export const BEAT = 60 / BPM;

// scenes: [start, end] in seconds
export const S = {
  cold:    [0.0, 8.2],    // title + the city on the water
  stage:   [8.2, 15.6],   // the stage: how a gate works
  raise:   [15.6, 31.0],  // gates rotate up, the lagoon closes
  wait:    [31.0, 37.6],  // lagoon sealed, the city kept dry
  result:  [37.6, 47.2],  // 110 cm, 78 gates, 30 min: numbers
  doubts:  [47.2, 55.8],  // cost, still water, open questions
  close:   [55.8, 62.0],  // mark + line
};

// voice clips and where they land. Text is the subtitle (short, reflowed by hand for the screen).
export const VO = [
  { id: 'vo-01', at: 1.4, file: 'assets/voice/vo-01.wav', dur: 6.84, dur: 6.84,
    sub: ['Venezia è costruita sull’acqua.', 'Ma l’acqua, ogni tanto, si prende la città.'] },
  { id: 'vo-04', at: 15.9, file: 'assets/voice/vo-04.wav', dur: 9.88, dur: 9.88,
    sub: ['Ogni paratoia: 20 metri di larghezza, 300 tonnellate di acciaio.', 'E di solito è invisibile, appoggiata sul fondale.'] },
  { id: 'vo-05', at: 26.9, file: 'assets/voice/vo-05.wav', dur: 14.40, dur: 14.40,
    sub: ['Oltre il metro e dieci scatta il via.', 'Entra aria compressa, l’acciaio ruota, la laguna si chiude.', 'In trenta minuti.'] },
  { id: 'vo-06', at: 43.3, file: 'assets/voice/vo-06.wav', dur: 9.00, dur: 9.00,
    sub: ['Regge maree fino a 3 metri.', 'Poi si riempie d’acqua, e in un quarto d’ora torna giù.'] },
  { id: 'vo-09', at: 56.6, file: 'assets/voice/vo-09.wav', dur: 4.00, dur: 4.00,
    sub: ['Il MOSE non ferma l’acqua.', 'Compra tempo.'] },
];

// Facts on screen are the source of truth; anything illustrative is labelled SCHEMA.
export const FACTS = {
  gates: 78, barriers: 4, inlets: 3, weightT: 300, widthM: 20, maxLenM: 29,
  thresholdCm: 110, protectMaxM: 3, raiseMin: 30, lowerMin: 15,
  firstClose: '03.10.2020', activations: 150, costM: 6.5, costPerRaise: 200000,
  depthM: 14,
};
