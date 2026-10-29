import { Doorway } from './Doorway.js';
import { Kitchen } from './Kitchen.js';
import { MapChapter } from './Map.js';
import { Mountain } from './Mountain.js';
import { Street } from './Street.js';
import { Table } from './Table.js';

/**
 * Chapters in journey order. Each one builds its part of the single continuous world and
 * implements update(p, time, dt, atmosphere), plus setDensity(f) if it owns particles.
 */
export const CHAPTER_BUILDERS = [Mountain, Street, Doorway, Table, Kitchen, MapChapter];
