import fs from 'node:fs';
import path from 'node:path';

/**
 * Piccolo archivio su file JSON. Zero dipendenze, adatto a un uso personale
 * (un account, una macchina). Se in futuro servono più account o più istanze,
 * questa è l'unica classe da sostituire con un database.
 */
export class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = null;
  }

  load(factory) {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
    } catch {
      this.state = factory();
      this.save();
    }
    return this.state;
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  reset(factory) {
    this.state = factory();
    this.save();
    return this.state;
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
