import { gameConfig } from "../config.js";

export class WaveManager {
    constructor() {
        this.currentWaveIndex = 0;
        this.killsInWave = 0;
        this.idleTime = 0; // Время без убийств (в секундах)
        this.idleThreshold = 20; // Принудительный переход через 60 секунд

    }
    
    reset() {
        this.currentWaveIndex = 0;
        this.killsInWave = 0;
        this.idleTime = 0;
    }
    
    update(deltaTime) {

        this.idleTime += deltaTime / 1000;
        
        // Проверяем принудительный переход
        if (this.idleTime >= this.idleThreshold) {
            this.forceNextWave();
        }
    }
    
    onEnemyKilled() {
        this.killsInWave++;
        this.idleTime = 0; // Сбрасываем таймер бездействия
        
        const currentWave = this.getCurrentWave();
        
        // Проверяем, достигли ли цели волны
        if (this.killsInWave >= currentWave.killsNeeded) {
            this.nextWave();
            return true;
        }
        return false;
    }
    
    nextWave() {
        if (this.currentWaveIndex < gameConfig.waves.length - 1) {
            this.currentWaveIndex++;
            this.killsInWave = 0;
            this.idleTime = 0;
            console.log(`🌊 Волна ${this.currentWaveIndex + 1}: ${this.getCurrentWave().name}`);
            return true; // Волна сменилась
        }
        return false; // Последняя волна
    }
    
    forceNextWave() {
        console.log(`⏰ Принудительный переход: игрок бездействовал ${this.idleTime.toFixed(0)}с`);
        this.nextWave();
        
        // Спавним группу врагов сразу
        return this.getCurrentWave().maxEnemies; // Количество врагов для спавна
    }
    
    getCurrentWave() {
        return gameConfig.waves[this.currentWaveIndex];
    }
    
    shouldSpawn(currentEnemyCount) {
        const currentWave = this.getCurrentWave();
        
        // Проверяем лимит врагов на экране
        if (currentEnemyCount >= currentWave.maxEnemies) {
            return false;
        }
        
        return true;
    }
    
    getRandomEnemyType() {
        const currentWave = this.getCurrentWave();
        const types = currentWave.enemyTypes;

        // Собираем только типы с весом > 0
        const availableTypes = types.filter(t => t.weight > 0);
        
        if (availableTypes.length === 0) {
            return 'smalShip'; // Запасной вариант
        }

        // Считаем общий вес
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.weight, 0);

        // Генерируем случайное число от 0 до totalWeight
        let random = Math.random() * totalWeight;
        // Выбираем тип на основе веса
        for (const type of availableTypes) {
            random -= type.weight;
            if (random <= 0) {
                return type.name;
            }
        }
        
        return availableTypes[0].name; // На всякий случай
    }
    
    getSpawnInterval() {
        return this.getCurrentWave().spawnInterval;
    }
    
    getWaveInfo() {
        const currentWave = this.getCurrentWave();
        return {
            name: currentWave.name,
            number: this.currentWaveIndex + 1,
            killsInWave: this.killsInWave,
            killsNeeded: currentWave.killsNeeded,
            idleTime: this.idleTime,
            idleThreshold: this.idleThreshold
        };
    }
}