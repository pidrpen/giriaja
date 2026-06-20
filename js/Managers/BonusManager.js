import { Bonus } from "../GameObjects/Bonus.js";
import { gameConfig } from "../config.js";

export class BonusManager {
    constructor() {
        this.activeBonuses = [];
    }
    
    reset() {
        this.activeBonuses = [];
    }
    
    tryDropBonuse(x, y, enemyTypeName) {
        const dropRate = gameConfig.bonusRates[enemyTypeName] || 0;
        const randomNum = Math.random();
        
        console.log(`🎲 Выпало ${randomNum} из ${dropRate}`);

        // Проверяем, выпадет ли бонус
        if (randomNum < dropRate) {
            const bonuseType = this.getRandomBonuseType();
            const bonuse = new Bonus(x, y, bonuseType);
            this.activeBonuses.push(bonuse);
        }
    }
    
    getRandomBonuseType() {
        const types = gameConfig.bonusTypes;
        const totalWeight = types.reduce((sum, type) => sum + type.weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (const type of types) {
            random -= type.weight;
            if (random <= 0) {
                return type.type;
            }
        }
        
        return types[0].type;
    }
    
    update(deltaTime) {
        // Двигаем бонусы
        for (const bonuse of this.activeBonuses) {
            bonuse.move(deltaTime);
        }
        
        // Удаляем улетевшие и истёкшие
        this.activeBonuses = this.activeBonuses.filter(p => 
            !p.isOffScreen(gameConfig.canvas.height,gameConfig.canvas.width) && !p.isExpired()
        );
    }
    
    draw(ctx) {
        for (const bonuse of this.activeBonuses) {
            bonuse.draw(ctx);
        }
    }
    
    checkCollision(player) {
        for (let i = this.activeBonuses.length - 1; i >= 0; i--) {
            const bonuse = this.activeBonuses[i];
            
            if (this.isColliding(player, bonuse)) {
                const applied = this.applyBonuse(player, bonuse.type);
                
                if (applied) {
                    this.activeBonuses.splice(i, 1);
                    return bonuse.name; // Возвращаем название для уведомления
                }
            }
        }
        
        return null;
    }
    
    isColliding(rect1, rect2) {
        return !(
            rect1.x + rect1.sizeX < rect2.x ||
            rect1.x > rect2.x + rect2.sizeX ||
            rect1.y + rect1.sizeY < rect2.y ||
            rect1.y > rect2.y + rect2.sizeY
        );
    }
    
    applyBonuse(player, type) {
        switch(type) {
            case 'health':
                if (player.playerHealth < 3) {
                    player.playerHealth++;
                    return true;
                }
                return false; // Здоровье полное
                break;
                
            case 'fullHealth':
                player.playerHealth = 3;
                return true;
                break;
                
            case 'fireRate':
                if (player.weaponSpeedLevel < 8) {
                    player.upgradeSpeedWeapon();
                    return true;
                }
                return false; // Максимальный уровень
                break;
                
            case 'multiShot':
                if (player.weaponBulletCount < 4) {
                    player.upgradeBulletCount();
                    return true;
                }
                return false;
                break;
                
            case 'shield':
                player.activateShield(15000, false); // 15 секунд, обычный щит
                return true;
                break;
                
            case 'strongShield':
                player.activateShield(15000, true); // 15 секунд, крепкий щит
                return true;
                break;   

            case 'speed':
                if(player.speed < 2.4){
                    player.upgradeSpeed(); // 15 секунд, крепкий щит
                    return true;
                }
                return false;
                break;
                                
            // case 'strongShield':
            //     player.activateShield(15000, true); // 15 секунд, крепкий щит
            //     return true;
            //     break;
        }
        
        return false;
    }
}