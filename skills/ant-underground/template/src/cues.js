// cues.js — the timeline.
//
// One source of truth for the picture and the score: the shot list, the cut
// points, and the beats. render.mjs and score.mjs both read this file, so a
// hit always lands on its frame.
//
// S     : the shots, in order: { t: start time in seconds, name: scene key }
// dur   : total length in seconds
// hits : the beats that matter (times in seconds) — the score locks to these
// bpm  : the tempo the score is written at

window.CUES = {
  dur: 23.0,
  bpm: 96,

  S: [
    { t: 0.0,  name: 'title'    },
    { t: 4.0,  name: 'ambition' },
    { t: 9.0,  name: 'pursuit'  },
    { t: 14.0, name: 'dig'      },
    { t: 19.0, name: 'outro'    },
  ],

  // the accents of the score: a low drone, and hits on the shot changes
  hits: [
    0.0, 4.0, 9.0, 14.0, 19.0,
  ],
};
