import { GameObject } from "./GameObject.js";

export class Bonus extends GameObject {
    constructor(x, y, type) {
        super(x, y, 20, 20); // Размер бонуса 30x30
        
        this.type = type; // 'health', 'fullHealth', 'fireRate', 'multiShot', 'shield', 'strongShield'
        this.speed = 2; // Скорость падения
        this.lifetime = 10000; // Бонус исчезает через 10 секунд
        this.lifetimeElapsed = 0;

        // Настройка внешнего вида в зависимости от типа
        this.setupAppearance();
    }
    
    setupAppearance() {
        switch(this.type) {
            case 'health':
                this.color = '#00ff00';
                this.symbol = '❤️';
                this.name = 'Здоровье';
                break;
            case 'fullHealth':
                this.color = '#ff00ff';
                this.symbol = '💟';
                this.name = 'Полное здоровье';
                break;
            case 'fireRate':
                this.color = '#ffff00';
                this.symbol = '⚡';
                this.name = 'Скорострельность';
                break;
            case 'multiShot':
                this.color = '#ff8800';
                this.symbol = '🔗';
                this.name = 'Мульти-выстрел';
                break;
            case 'shield':
                this.color = '#00ffff';
                this.symbol = '🛡️';
                this.name = 'Щит';
                break;
            case 'strongShield':
                this.color = '#8800ff';
                this.symbol = '🔰';
                this.name = 'Крепкий щит';
                break;
            case 'speed':
                this.color = '#ecff95ff';
                this.symbol = '🚀';
                this.name = 'Ускорение';
                break;
        }
    }
    
    move(deltaTime) {
        // Движение тоже лучше привязать к deltaTime для плавности при лагах/паузах
        const speedMultiplier = deltaTime / 16; // Нормализация под ~60 FPS
        this.y += this.speed * speedMultiplier;
        
        // ⏱️ Увеличиваем счетчик времени жизни только при активном движении
        this.lifetimeElapsed += deltaTime;
    }
    
    isExpired() {
        return this.lifetimeElapsed >= this.lifetime;
    }
    
    draw(ctx) {
        // Рисуем фон
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.sizeX, this.sizeY);
        
        // Рисуем символ
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x + this.sizeX / 2, this.y + this.sizeY / 2);
    }
}