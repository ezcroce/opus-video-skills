// wav.mjs: read and write RIFF/WAVE, no dependencies.
//   readWav(file) → { rate, channels, bits }  channels is Float32Array[] in -1..1 (interleaved input de-interleaved here)
//   writeWav(file, L, R, rate)               16-bit PCM, stereo
// Handles PCM 8/16/24/32-bit and IEEE float 32/64-bit, which covers what TTS tools hand out (generate_speech → WAV).
import { readFileSync, writeFileSync } from 'node:fs';

export function readWav(file) {
  const b = readFileSync(file);
  if (b.length < 12 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error(`${file}: not a WAV file (RIFF/WAVE header missing)`);
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    const start = pos + 8;
    if (id === 'fmt ' && size >= 16) {
      fmt = {
        format: b.readUInt16LE(start),
        channels: b.readUInt16LE(start + 2),
        rate: b.readUInt32LE(start + 4),
        bits: b.readUInt16LE(start + 14),
      };
      // WAVE_FORMAT_EXTENSIBLE: the real format sits in the sub-format GUID
      if (fmt.format === 0xfffe && size >= 40) fmt.format = b.readUInt16LE(start + 24);
    } else if (id === 'data') {
      data = b.subarray(start, Math.min(start + size, b.length));
    }
    pos = start + size + (size % 2); // chunks are word-aligned
  }
  if (!fmt) throw new Error(`${file}: no fmt chunk`);
  if (!data) throw new Error(`${file}: no data chunk`);

  const { channels: nch, bits, format, rate } = fmt;
  const bytes = bits / 8;
  const frames = Math.floor(data.length / (bytes * nch));
  const channels = Array.from({ length: nch }, () => new Float32Array(frames));

  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      const o = (i * nch + c) * bytes;
      let v;
      if (format === 3) {
        v = bits === 64 ? data.readDoubleLE(o) : data.readFloatLE(o);
      } else if (bits === 8) {
        v = (data[o] - 128) / 128;
      } else if (bits === 16) {
        v = data.readInt16LE(o) / 32768;
      } else if (bits === 24) {
        const s = data[o] | (data[o + 1] << 8) | (data[o + 2] << 16);
        v = ((s << 8) >> 8) / 8388608;
      } else {
        v = data.readInt32LE(o) / 2147483648;
      }
      channels[c][i] = v;
    }
  }
  return { rate, channels, bits, format, frames };
}

// Average the channels to mono. Speech clips are effectively mono; this keeps the mix free of phase surprises.
export function mono({ channels }) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const c of channels) s += c[i];
    out[i] = s / channels.length;
  }
  return out;
}

// Linear resample to the master rate. Good enough for speech; the mix rate is 44.1 kHz and clips are usually that.
export function resample(x, from, to) {
  if (from === to) return x;
  const n = Math.round(x.length * to / from), out = new Float32Array(n), step = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * step, j = Math.floor(p), f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f;
  }
  return out;
}

export function writeWav(file, L, R, rate = 44100) {
  const n = L.length, nch = R ? 2 : 1, dataBytes = n * nch * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);            // PCM
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * nch * 2, 28);
  buf.writeUInt16LE(nch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of R ? [L, R] : [L]) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      buf.writeInt16LE(Math.round(v * 32767), o); o += 2;
    }
  }
  writeFileSync(file, buf);
  return buf.length;
}
