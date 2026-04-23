export const MAP_CONFIG = {
    // 'SIMPLE' なら簡易版、 'PRODUCTION' なら本番用を表示
    USE_MAP: 'PRODUCTION', 

    MAPS: {
        SIMPLE: {
            key: 'map_simple',
            path: '/assets/maps/cebu_map_簡易版.tmj',
            tilesetKey: 'tiles',
            tilesetName: 'Slates.png',
            layerName: 'タイルレイヤー1',
            districtLayer: "districtName",
        },
        PRODUCTION: {
            key: 'map_production',
            path: '/assets/maps/cebu_map_本番用.tmj',
            tilesets: [
                { name: 'main', key: 'main', path: '/assets/tilesets/[Base]BaseChip_pipo.png' },
                { name: 'main2', key: 'main2', path: '/assets/tilesets/Slates.png' },
                { name: '水(明るい青)', key: 'water_light', path: '/assets/tilesets/[A]Water2_pipo.png' },
                { name: '特殊地形小さい', key: 'special_small', path: '/assets/tilesets/pipo-map001.png' },
                { name: '花', key: 'flower', path: '/assets/tilesets/[A]Flower_pipo.png' },
                { name: '草', key: 'grass', path: '/assets/tilesets/[A]Grass4_pipo.png' },
                { name: '草長い', key: 'long_grass', path: '/assets/tilesets/[A]LongGrass_pipo.png' },
                { name: '道A', key: 'dirt_road', path: '/assets/tilesets/[A]Dirt1_pipo.png' },
                { name: '水(暗い青)', key: 'water_dark', path: '/assets/tilesets/[A]Water1_pipo.png' }
            ],
            districtLayer: "spotName",
        }
    }
};