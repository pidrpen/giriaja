// ===== CosmoShuter Enhanced - config.js =====
// Жёстко усиленная версия с тучей врагов + бафы/дебафы

export const gameConfig = {
    canvas: {
        width: 1000,
        height: 900
    },
    
    enemySpawn: {
        interval: 1200  // базовый интервал (было 5000)
    },
    
    score: {
        initialMultiplier: 1,
        killsForNextMultiplier: 8,
        multiplierGrowth: 1.6
    },

    durationInvulnerability: 800,
    
    // === НОВЫЕ БАФЫ / ДЕБАФЫ ===
    buffs: {
        berserk: { 
            duration: 12000, 
            fireRateMult: 2.5, 
            speedMult: 1.4,
            name: "БЕРСЕРК"
        },
        multiShot: { 
            duration: 15000, 
            extraBullets: 2,
            name: "МУЛЬТИШОТ"
        },
        speedBoost: { 
            duration: 10000, 
            speedMult: 1.8,
            name: "УСКОРЕНИЕ"
        },
        shield: {
            duration: 8000,
            extraArmor: 3,
            name: "ЩИТ"
        }
    },

    // Дебафы, которые могут наложить враги
    debuffs: {
        slow: {
            duration: 5000,
            speedMult: 0.5,
            name: "ЗАМЕДЛЕНИЕ"
        }
    },
    
    enemyTypes: [
        {
            name: 'smalShip',
            spriteSheet: 'images/SpritesEnemy2.png',
            sprites: [
                { sx: 51, sy: 0, swidth: 32, sheight: 58 },
                { sx: 200, sy: 0, swidth: 42, sheight: 48 },
                { sx: 242, sy: 0, swidth: 28, sheight: 56 }
            ],
            speed: 2.2,
            dy: 1.2,
            points: 5,
            health: 1,
            damage: 1,
            armor: 0,
            canDebuff: false
        },
        {
            name: 'mediumShip',
            spriteSheet: 'images/SpritesEnemy2.png',
            sprites: [
                { sx: 0, sy: 0, swidth: 50, sheight: 59 },
                { sx: 82, sy: 0, swidth: 58, sheight: 60 },
                { sx: 140, sy: 0, swidth: 60, sheight: 56 }
            ],
            speed: 1.6,
            dy: 1.1,
            points: 12,
            health: 3,
            damage: 1,
            armor: 0,
            canDebuff: true   // теперь может накладывать дебаф
        },
        {
            name: 'largeShip',
            spriteSheet: 'images/SpritesEnemy2.png',
            sprites: [
                { sx: 270, sy: 0, swidth: 56, sheight: 60 },
                { sx: 326, sy: 0, swidth: 52, sheight: 60 } 
            ],
            speed: 1.1,
            dy: 0.9,
            points: 25,
            health: 6,
            damage: 2,
            armor: 1,
            canDebuff: true
        },
        {
            name: 'Boss',
            spriteSheet: 'images/Boss.png',
            sprites: [
                { sx: 0, sy: 0, swidth: 197, sheight: 185 }
            ],
            speed: 0.7,
            dy: 0.8,
            points: 60,
            health: 18,
            damage: 3,
            armor: 2,
            canDebuff: true
        },
        {
            name: 'strongBoss',
            spriteSheet: 'images/strongBoss.png',
            sprites: [
                { sx: 0, sy: 0, swidth: 635, sheight: 167 }
            ],
            speed: 0.35,
            dy: 0.6,
            points: 150,
            health: 70,
            damage: 4,
            armor: 4,
            canDebuff: true
        }
    ],
    
    playerSprites: {
        down: 'images/player_down.png',
        left: 'images/player_left.png',
        right: 'images/player_right.png',
        up: 'images/player_up.png',
        left_down: 'images/player_left_down.png',
        left_up: 'images/player_left_up.png',
        right_down: 'images/player_right_down.png',
        right_up: 'images/player_right_up.png',
        idle: 'images/player.png'
    },

    // === ЖЁСТКО УСИЛЕННЫЕ ВОЛНЫ (туча врагов) ===
    waves: [
        {
            name: 'Разведка',
            killsNeeded: 12,
            spawnInterval: 900,
            maxEnemies: 8,
            enemyTypes: [
                { name: 'smalShip', weight: 100 },
            ]
        },
        {
            name: 'Первый контакт',
            killsNeeded: 25,
            spawnInterval: 650,
            maxEnemies: 14,
            enemyTypes: [
                { name: 'smalShip', weight: 65 },
                { name: 'mediumShip', weight: 35 },
            ]
        },
        {
            name: 'Усиление',
            killsNeeded: 45,
            spawnInterval: 480,
            maxEnemies: 22,
            enemyTypes: [
                { name: 'smalShip', weight: 45 },
                { name: 'mediumShip', weight: 35 },
                { name: 'largeShip', weight: 20 }
            ]
        },
        {
            name: 'Босс приближается',
            killsNeeded: 80,
            spawnInterval: 380,
            maxEnemies: 38,
            enemyTypes: [
                { name: 'smalShip', weight: 30 },
                { name: 'mediumShip', weight: 35 },
                { name: 'largeShip', weight: 25 },
                { name: 'Boss', weight: 10 }
            ]
        },
        {
            name: 'Боссы атакуют',
            killsNeeded: 140,
            spawnInterval: 280,
            maxEnemies: 55,
            enemyTypes: [
                { name: 'smalShip', weight: 20 },
                { name: 'mediumShip', weight: 30 },
                { name: 'largeShip', weight: 28 },
                { name: 'Boss', weight: 18 },
                { name: 'strongBoss', weight: 4 }
            ]
        },
        {
            name: 'Хаос',
            killsNeeded: 280,
            spawnInterval: 220,
            maxEnemies: 85,
            enemyTypes: [
                { name: 'smalShip', weight: 15 },
                { name: 'mediumShip', weight: 25 },
                { name: 'largeShip', weight: 30 },
                { name: 'Boss', weight: 22 },
                { name: 'strongBoss', weight: 8 }
            ]
        },
        {
            name: 'ПОЛНЫЙ ПИЗДЕЦ',
            killsNeeded: 450,
            spawnInterval: 160,
            maxEnemies: 130,
            enemyTypes: [
                { name: 'mediumShip', weight: 15 },
                { name: 'largeShip', weight: 30 },
                { name: 'Boss', weight: 35 },
                { name: 'strongBoss', weight: 20 }
            ]
        }
    ],

    bonusRates: {
        smalShip: 0.18,
        mediumShip: 0.30,
        largeShip: 0.45,
        Boss: 0.65,
        strongBoss: 0.95
    },
    
    bonusTypes: [
        { type: 'health', weight: 18 },
        { type: 'shield', weight: 15 },
        { type: 'speed', weight: 12 },
        { type: 'fireRate', weight: 12 },
        { type: 'multiShot', weight: 10 },
        { type: 'fullHealth', weight: 8 },
        { type: 'strongShield', weight: 6 },
        // === НОВЫЕ БАФЫ ===
        { type: 'berserk', weight: 10 },
        { type: 'multiShotBuff', weight: 9 },   // улучшенный мультишот
    ]
};