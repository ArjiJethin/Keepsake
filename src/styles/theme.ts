// src/styles/theme.ts

export const THEME = {
    colors: {
        // Sunset Sky & Atmosphere (LoadingScreen.png & Home Screen.jpg)
        skyZenith: '#7d6d8a',       // Muted dusty mauve-violet zenith
        skyMid: '#b88c94',          // Dusty rose-mauve mid sky
        skyHorizon: '#eab89b',      // Warm peach-apricot sunset horizon
        skyGlow: '#fce0b6',         // Soft cream-gold sun glow
        fogColor: '#cfa098',        // Warm dusty rose-peach atmospheric haze

        // Mountains & Distant Scenery
        mountainFar: '#9e8191',     // Misty mauve distant peaks
        mountainMid: '#8a7282',     // Muted plum-grey ridges
        ruinDistant: '#8f7982',     // Distant archway silhouette

        // Terrain & Meadow Grass
        meadowBase: '#68744e',      // Muted olive-sage meadow
        meadowSunlit: '#8b9462',    // Warm sunlit golden-sage slope
        meadowShadow: '#4a573b',    // Deep olive foreground shadow
        grassTuft: '#5d6b46',       // Stylized grass blades
        grassTuftLight: '#7e8a59',  // Sun-kissed grass blades

        // Giant Sakura Tree & Foliage
        barkBase: '#66493a',        // Warm earthy umber trunk
        barkHighlight: '#855f4b',   // Sunlit left bark edge
        barkShadow: '#473227',      // Deep bark crevice
        sakuraDeep: '#c47b78',      // Shaded dusty rose blossom cluster
        sakuraMid: '#de958f',       // Primary dusty pink blossom cluster
        sakuraLight: '#f0b3a9',     // Sunlit peach-pink blossom cluster
        sakuraRim: '#f7cfc4',       // Warm sunset rim-lit blossoms
        bannerFabric: '#d9b589',    // Warm ochre-parchment hanging banners
        bannerEmblem: '#a86454',    // Terracotta floral motif on banners

        // Top-Left Framing Canopy & Pine Trees
        canopyOlive: '#6f784a',     // Warm olive overhanging leaves
        canopyLight: '#91965c',     // Sunlit olive leaf tips
        canopyDark: '#4c5737',      // Shaded foliage

        // Stone Archway, Pathway & Boulders
        stoneBase: '#877974',       // Warm taupe-grey stone
        stoneSunlit: '#ad998e',     // Peach-lit stone face
        stoneShadow: '#615653',     // Cool mauve-brown stone shadow
        ivyGreen: '#637048',        // Archway hanging moss & ivy
        ivyLight: '#818c5b',        // Sunlit ivy

        // Wildflowers
        flowerPetal: '#f5ded2',     // Soft cream-blush petals
        flowerPetalPink: '#e6a59e', // Dusty rose petals
        flowerCenter: '#e09f5a',    // Warm amber flower center

        // Memory Objects (Restrained Warm Golden Glow)
        memoryGold: '#ffcf70',
        memoryEmissive: '#f5a638',
        memoryCore: '#fff6de',

        // UI Cream & Parchment
        creamText: '#f7ecda',
        parchmentLight: '#efe2cf',
        parchmentMid: '#dcc7ae',
        parchmentDark: '#b39b82',
        inkDark: '#3b2e28',
    },
} as const;