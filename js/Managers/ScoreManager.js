import { gameConfig } from "../config.js";

export class ScoreManager {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.score = 0;
        this.kills = 0;
        this.killsStrike = 0;
        this.multiplier = gameConfig.score.initialMultiplier;
        this.killsForNextMultiplier = gameConfig.score.killsForNextMultiplier;
    }
    
    onEnemyKilled(basePoints) {
        this.kills++;
        this.killsStrike++;
        
        const points = Math.floor(basePoints * this.multiplier);
        this.score += points;
        
        if (this.killsStrike >= this.killsForNextMultiplier) {
            this.increaseMultiplier();
        }
        
        return points;
    }
    
    increaseMultiplier() {
        this.multiplier *= gameConfig.score.multiplierGrowth;
        this.killsForNextMultiplier += 10 * (this.killsForNextMultiplier / 5);
    }
    
    clearMultiplier() {
        this.multiplier = 1;
        this.killsForNextMultiplier = 10;
        this.killsStrike = 0;
    }
}