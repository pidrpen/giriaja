// ===== CosmoShuter Enhanced - Companion.js =====
// Простой мини-помощник (дрон) для игрока

export class Companion {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        
        this.x = player.x + 40;
        this.y = player.y - 30;
        this.radius = 14;
        this.angle = 0;           // для орбитального движения
        this.orbitRadius = 55;
        this.orbitSpeed = 0.04;
        
        this.health = 25;
        this.maxHealth = 25;
        this.alive = true;
        
        this.shootCooldown = 0;
        this.shootInterval = 380; // стреляет каждые ~380ms
        this.bulletSpeed = 7;
        this.damage = 1;
    }

    update(enemies) {
        if (!this.alive) return;

        // === Орбитальное движение вокруг игрока ===
        this.angle += this.orbitSpeed;
        this.x = this.player.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.player.y + Math.sin(this.angle) * this.orbitRadius * 0.7;

        // === Авто-стрельба по ближайшему врагу ===
        this.shootCooldown -= 16; // примерно 60fps

        if (this.shootCooldown <= 0 && enemies.length > 0) {
            // Находим ближайшего врага
            let closest = null;
            let minDist = Infinity;

            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                }
            }

            if (closest && minDist < 650) {
                this.shoot(closest);
                this.shootCooldown = this.shootInterval;
            }
        }
    }

    shoot(target) {
        if (!target || !target.alive) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const bullet = {
            x: this.x,
            y: this.y,
            vx: (dx / dist) * this.bulletSpeed,
            vy: (dy / dist) * this.bulletSpeed,
            damage: this.damage,
            radius: 4,
            alive: true,
            fromCompanion: true
        };

        this.game.bullets.push(bullet); // добавляем в массив пуль игры
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.alive = false;
            // Можно добавить эффект взрыва дрона
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        
        // Тело дрона (простой круг + детальки)
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Обводка
        ctx.strokeStyle = '#00aa88';
        ctx.lineWidth = 2;
        ctx.stroke();

        // "Глаз" / пушка
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Небольшой "хвост"
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.radius, this.y);
        ctx.lineTo(this.x - this.radius - 12, this.y + Math.sin(this.angle * 3) * 6);
        ctx.stroke();

        ctx.restore();
    }

    // Можно добавить метод респавна дрона
    respawn() {
        this.health = this.maxHealth;
        this.alive = true;
        this.angle = 0;
    }
}