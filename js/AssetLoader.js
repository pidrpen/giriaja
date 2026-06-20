import { gameConfig } from "./config.js";

export class AssetLoader {
    constructor() {
        this.playerSprites = {};   // Загруженные спрайты игрока
        this.spriteSheets = {};    // Загруженные спрайт-листы врагов
    }
    
    loadAll(callback) {
        let totalAssets = 0;
        let loadedAssets = 0;
        
        const checkComplete = () => {
            loadedAssets++;
            if (loadedAssets === totalAssets) {
                console.log('Все ресурсы загружены!');
                callback();
            }
        };
        
        // 1. Загружаем спрайты игрока
        for (const [direction, src] of Object.entries(gameConfig.playerSprites)) {
            totalAssets++;
            const img = new Image();
            img.src = src;
            img.onload = checkComplete;
            this.playerSprites[direction] = img;
        }
        
        // 2. Загружаем спрайт-листы врагов
        const loadedPaths = new Map(); // ← Изменили Set на Map
        
        // Сначала собираем все уникальные пути
        for (const type of gameConfig.enemyTypes) {
            if (!loadedPaths.has(type.spriteSheet)) {
                totalAssets++;
                const img = new Image();
                img.src = type.spriteSheet;
                img.onload = checkComplete;
                loadedPaths.set(type.spriteSheet, img); // ← Сохраняем в Map
            }
        }
        
        // Теперь присваиваем каждый спрайт-лист всем типам, которые его используют
        for (const type of gameConfig.enemyTypes) {
            this.spriteSheets[type.name] = loadedPaths.get(type.spriteSheet);
        }
        
        // Защита от ситуации, когда ресурсов нет
        if (totalAssets === 0) {
            callback();
        }
    }
}