import { Enemy } from "../GameObjects/Creatures.js";
import { gameConfig } from "../config.js";

export class EnemyFactory {
    constructor(spriteSheets) {
        this.spriteSheets = spriteSheets;
    }

    createByType(typeName) {
        const enemyType = gameConfig.enemyTypes.find(t => t.name === typeName);
        
        if (!enemyType) {
            console.warn(`Тип врага "${typeName}" не найден!`);
            return null;
        }
        
        const spriteSheet = this.spriteSheets[typeName];
        if (!spriteSheet) {
            console.warn(`Спрайт-лист для "${typeName}" не загружен!`);
            return null;
        }
        const spriteID = Math.floor(Math.random() * enemyType.sprites.length);

        
        return new Enemy(
            gameConfig.canvas.width,
            gameConfig.canvas.height,
            enemyType,
            spriteID,
            spriteSheet
        );
    }
    
    createRandom() {
        const types = gameConfig.enemyTypes;
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.createByType(randomType.name);
    }

    // createBoss(canvasWidth, canvasHeight){
    //     const types = gameConfig.enemyTypes;
    //     let randomTypeNum = types.length-1;
    //     const bossType = types[randomTypeNum];
    //     // const bossSprite = bossType.sprites[
    //     //     Math.floor(Math.random() * randomType.sprites.length)
    //     // ];
    //     const spriteID = Math.floor(Math.random() * bossType.sprites.length);
        
 
    //     // Проверяем, что спрайт-лист загружен
    //     const spriteSheet = this.spriteSheets[bossType.name];
    //     if (!spriteSheet) {
    //         console.warn(`Спрайт-лист для ${randomType.name} ещё не загружен!`);
    //         // Возвращаем null или создаем врага с дефолтным спрайтом
    //         return null;
    //     }

    //     return new Enemy(
    //         canvasWidth,
    //         canvasHeight,
    //         randomTypeNum,
    //         spriteID,
    //         spriteSheet
    //     );
    // }
}