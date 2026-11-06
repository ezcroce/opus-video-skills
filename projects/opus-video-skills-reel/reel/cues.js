// reel/cues.js: THE timeline. reel.js (picture) and music/score.mjs (sound) both read it,
// so every hit lands on its frame. 120 BPM: a beat is 0.5 s, a bar is 2 s. Cuts on beats,
// chapter changes on bars. Scene starts S are all on bars; CH drives the segmented progress bar.
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);                 // B(n) = time of beat n
  const S = { open: 0, index: 2, painted: 4, frames: 6, type: 8, timeline: 10, trans: 12, method: 14, end: 16 };
  return {
    bpm: 120, fps: 30, dur: 18, B, S,
    CH: [['OPEN', 0, 2], ['01 PAINTED', 2, 8], ['02 KINETIC', 8, 14], ['03 METHOD', 14, 16], ['END', 16, 18]],
    hits: {
      dot: 1, mark: 1.5,                                // the opening dot becomes the mark
      head: 2.05, rows: [2.45, 2.8],                   // index card: headline, then the two chapters
      paint: 4.1, paintChips: [4.8, 5.05, 5.3, 5.55], // liquid-filled letters, then the stack chips
      boil: [6.25, 6.75, 7.25, 7.75],                  // one scan column per beat in the ink-boil grid
      slam: 8, slamChips: [8.6, 8.85, 9.1, 9.35],      // blue chapter slam + the four type families
      play: 10.1, counter: 10.6, bars: [10.3, 10.55, 10.8],
      cards: [12.15, 12.35, 12.55, 12.75, 12.95, 13.15], hops: [12.6, 13, 13.4, 13.8],
      words: [14.2, 14.6, 15],                          // the one "voice" line, word by word
      name: 16, glitch: 17.25, endDot: 17.65,
    },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
