// Aether Forge: Clockwork Defender — the entry program for make.fun's
// best-game-01 bounty.
//
// It runs under Node 22 with no install and no build step. It copies the
// static game (game/) and the screenshots (screenshots/) beside this file
// into the output directory, then writes the dossier the judge reads,
// using the vendored make.fun library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this program lives, and where the finished entry goes.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the entry first: the dossier is built from the staged files, so the
// copy has to happen before buildDossier reads them. Clear any previous
// staging first, so a re-run into the same output directory cannot carry
// stale files (e.g. a screenshot since deleted) into the dossier.
mkdirSync(outputDir, { recursive: true });
rmSync(join(outputDir, 'game'), { recursive: true, force: true });
rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps, from the kit's reference/gate.json. The text cap
// shapes how much source the dossier carries; the other caps refuse an entry
// the scorer would refuse (more than 4 screenshots, one over 256 KiB, more
// than 993 game files or 48 MiB of game files, a game path over 1000 bytes).
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossierText);
console.log('Aether Forge entry written to ' + outputDir);
