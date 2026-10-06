/**
 * Copyright (C) 2026 Raul Sousa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('./src/_locales/', import.meta.url);
const strict = process.argv.includes('--strict');

const readKeys = (lang) =>
  Object.keys(JSON.parse(readFileSync(new URL(`${lang}/messages.json`, dir), 'utf8')));

const langs = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'en')
  .map((entry) => entry.name);

const base = new Set(readKeys('en'));
let issues = 0;

for (const lang of langs) {
  const keys = new Set(readKeys(lang));
  const missing = [...base].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !base.has(key));

  if (missing.length) {
    console.warn(`[i18n] ${lang}: ${missing.length} missing (falls back to en): ${missing.join(', ')}`);
  }

  if (extra.length) {
    console.warn(`[i18n] ${lang}: ${extra.length} unused (not in en): ${extra.join(', ')}`);
  }

  issues += missing.length + extra.length;
}

if (!issues) {
  console.log(`[i18n] ${langs.length} locale(s) in sync with en`);
}

if (strict && issues) {
  process.exit(1);
}
