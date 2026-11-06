// reel/cues.js: THE timeline — picture (reel.js) and score (music/score.mjs) both read it.
// 120 BPM: a beat is 0.5 s, a bar is 2 s. Chapter changes on bars, cuts on beats. 24 fps = 12 frames per beat.
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);                 // B(n) = time of beat n
  const S = {
    open: 0, title: 2, river: 4, bush: 8, voice: 13, staff: 15, demand: 18,
    plagues: 20, sea: 25, cross: 30, pillar: 34, sinai: 36, tablets: 40,
    calf: 44, wilderness: 48, end: 54,
  };
  const seq = (t0, dt, n) => Array.from({ length: n }, (_, i) => +(t0 + i * dt).toFixed(4));
  return {
    bpm: 120, fps: 24, dur: 60, B, S,
    // chapters drive the segmented progress bar; the reel is itself a "trace" of the book
    CH: [['OPEN', 0, 4], ['01 THE CALL', 4, 20], ['02 THE SEA', 20, 36],
         ['03 SINAI', 36, 48], ['04 WILDERNESS', 48, 54], ['END', 54, 60]],
    hits: {
      dot: .8, mark: 1.4,
      head: 2.05, titleChips: [2.9, 3.15, 3.4],
      reeds: [4.3, 4.7, 5.1], basket: [5.5, 6, 6.5, 7], riverChips: [6.4, 6.7, 7.0],
      flame: seq(8.2, .6, 6), bush: 9.0, bushChips: [11.4, 11.7, 12.0],
      words: [13.2, 13.65, 14.1],
      nodes: [15.2, 15.6, 16.0], hops: [16.2, 16.7, 17.2], staffChips: [17.3, 17.6],
      slam: 18, demandChips: [19.0, 19.3],
      tiles: seq(20.5, .25, 10), passover: 23.4, doorChips: [24.0, 24.3],
      split: 25.4, path: 26.2, seaChips: [27.0, 27.35, 27.7], waves: [28, 28.5, 29],
      dots: seq(30.2, .25, 12), walls: 32.6, crossChips: [33.0, 33.3],
      cols: [34.3, 34.8], pillarChips: [35.2, 35.5],
      mount: 36.3, thunder: seq(38, .25, 4), sinaiChips: [38.8, 39.1],
      marks: seq(40.4, .3, 10), tabletChips: [43.2, 43.5],
      flag: 44.3, crack: [45.0, 45.4], newTablets: [46.0, 46.4], calfChips: [46.8, 47.1],
      manna: seq(48.4, .26, 8), rock: 50.6, water: 51.2, counter: 51.6, wildChips: [52.6, 52.9],
      name: 54, endMark: 54.8, glitch: 58.4, endDot: 59.0,
    },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
