// src/styles/theme.ts

export const THEME = {
    // Environment Muted Artistic Low-Poly Palette
    colors: {
        skyTop: '#8e7b9b',          // Muted lavender dusk sky
        skyHorizon: '#e8b49a',      // Soft peach sunset horizon
        fog: '#d8a994',             // Atmospheric warm rosy-peach haze

        // Terrain & Foliage
        grassPrimary: '#7d8c65',    // Dusty sage green
        grassSecondary: '#687852',  // Muted olive
        grassHighlight: '#96a171',  // Warm sunlit sage

        // Trees & Blossoms
        trunkBrown: '#6e5243',      // Desaturated warm brown
        trunkDark: '#523b30',       // Deep bark shadow
        blossomPink: '#d9918b',     // Dusty rose sakura canopy
        blossomLight: '#ebb4ab',    // Soft peach-pink petals
        pineGreen: '#5c704e',       // Muted pine green

        // Stone & Architecture
        stoneBase: '#8c827a',       // Warm grey stone
        stoneLight: '#a69b91',      // Sunlit warm stone
        stoneDark: '#6b625b',       // Shadowed stone

        // Memory Highlight Palette (Vibrant Golden Tones)
        memoryGold: '#ffcf6b',      // Warm golden glow
        memoryEmissive: '#ffaa33',  // Rich amber emissive core
        memoryCore: '#fff3d1',      // Bright warm cream center

        // UI Parchment Palette
        parchmentBg: '#efe4d2',     // Warm parchment surface
        parchmentBorder: '#c9b79c', // Soft aged border
        parchmentText: '#3d312a',   // Deep warm umber ink
    },

    lighting: {
        sunPosition: [-35, 18, -45] as [number, number, number],
        sunColor: '#ffdfb8',
        ambientColor: '#b89eb8',
        hemisphereSky: '#e8b49a',
        hemisphereGround: '#596348',
    },
} as const;