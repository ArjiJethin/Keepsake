// scripts/optimize-glb.mjs
import { execSync } from 'node:child_process';
import { existsSync, statSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve('public/KeepSakeFemale-v2-animated.glb');
const backupPath = resolve('public/KeepSakeFemale-v2-animated.backup.glb');
const tempOutPath = resolve('public/KeepSakeFemale-v2-animated.optimized.glb');

if (!existsSync(inputPath)) {
    console.error(
        'Error: public/KeepSakeFemale-v2-animated.glb not found. Place the GLB in public/ first.'
    );
    process.exit(1);
}

const originalBytes = statSync(inputPath).size;
console.log(
    `[Keepsake GLB Optimizer] Original size: ${(originalBytes / (1024 * 1024)).toFixed(2)} MB`
);

if (!existsSync(backupPath)) {
    copyFileSync(inputPath, backupPath);
    console.log(`[Keepsake GLB Optimizer] Saved backup to ${backupPath}`);
}

try {
    // Uses gltf-transform meshopt compression + WebP texture optimization while
    // strictly preserving all skeleton joints, skin weights, and animation clips.
    execSync(
        `npx --yes @gltf-transform/cli optimize "${backupPath}" "${tempOutPath}" --compress meshopt --texture-compress webp --simplify false --join false`,
        { stdio: 'inherit' }
    );

    copyFileSync(tempOutPath, inputPath);
    const newBytes = statSync(inputPath).size;
    console.log(
        `[Keepsake GLB Optimizer] Optimized size: ${(newBytes / (1024 * 1024)).toFixed(2)} MB (${Math.round((1 - newBytes / originalBytes) * 100)}% reduction)`
    );
} catch (err) {
    console.error('[Keepsake GLB Optimizer] Optimization command failed:', err);
    process.exit(1);
}