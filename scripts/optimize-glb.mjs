// scripts/optimize-glb.mjs
import { execSync } from 'node:child_process';
import { existsSync, statSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODELS = [
    'KeepSakeFemale-v2-animated.glb',
    'KeepSakeMale-v2-animated.glb',
];

for (const modelName of MODELS) {
    const inputPath = resolve(`public/${modelName}`);
    const baseName = modelName.replace(/\.glb$/i, '');
    const backupPath = resolve(`public/${baseName}.backup.glb`);
    const tempOutPath = resolve(`public/${baseName}.optimized.glb`);

    if (!existsSync(inputPath)) {
        console.warn(
            `[Keepsake GLB Optimizer] Skipping ${modelName}: file not found at public/${modelName}.`
        );
        continue;
    }

    const originalBytes = statSync(inputPath).size;
    console.log(
        `\n[Keepsake GLB Optimizer] Processing ${modelName} — Original size: ${(originalBytes / (1024 * 1024)).toFixed(2)} MB`
    );

    if (!existsSync(backupPath)) {
        copyFileSync(inputPath, backupPath);
        console.log(`[Keepsake GLB Optimizer] Saved backup to ${backupPath}`);
    }

    try {
        // Applies gltf-transform meshopt compression + WebP texture optimization while
        // strictly preserving all skeleton joints, skin weights, and animation clips.
        execSync(
            `npx --yes @gltf-transform/cli optimize "${backupPath}" "${tempOutPath}" --compress meshopt --texture-compress webp --simplify false --join false`,
            { stdio: 'inherit' }
        );

        copyFileSync(tempOutPath, inputPath);
        const newBytes = statSync(inputPath).size;
        console.log(
            `[Keepsake GLB Optimizer] Finished ${modelName} — Optimized size: ${(newBytes / (1024 * 1024)).toFixed(2)} MB (${Math.round((1 - newBytes / originalBytes) * 100)}% reduction)`
        );
    } catch (err) {
        console.error(
            `[Keepsake GLB Optimizer] Optimization command failed for ${modelName}:`,
            err
        );
    }
}