// ===== CosmoShuter Enhanced - Companion.js (ИСПРАВЛЕННЫЙ) =====
export class Companion {
    constructor(player, game) {
        this.player = player;
        this.game = game;
        
        this.x = player.x;
        this.y = player.y;
        this.radius = 14;
        this.angle = 0;
        this.orbitRadius = 55;
        this.orbitSpeed = 0.045;
        
        this.health = 25;
        this.maxHealth = 25;
        this.alive = true;
        
        this.shootCooldown = 0;
        this.shootInterval = 320; // стреляет чаще
        this.bulletSpeed = 8;
        this.damage = 1;
    }

    update(enemies) {
        if (!this.alive) return;

        // Летает вокруг игрока
        this.angle += this.orbitSpeed;
        this.x = this.player.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.player.y + Math.sin(this.angle) * this.orbitRadius * 0.65;

        // Стрельба
        this.shootCooldown -= 16;

        if (this.shootCooldown <= 0 && enemies.length > 0) {
            let closest = null;
            let minDist = Infinity;

            for (let enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist && dist < 700) {
                    minDist = dist;
                    closest = enemy;
                }
            }

            if (closest) {
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

        // Пуля с методами (теперь работает)
        const bullet = {
            x: this.x,
            y: this.y,
            vx: (dx / dist) * this.bulletSpeed,
            vy: (dy / dist) * this.bulletSpeed,
            damage: this.damage,
            radius: 5,
            alive: true,
            fromCompanion: true,

            move() {
                this.x += this.vx;
                this.y += this.vy;
            },

            draw(ctx) {
                ctx.save();
                ctx.fillStyle = '#00ffcc';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            },

            isOffScreen(w, h) {
                return this.x < -10 || this.x > w + 10 || this.y < -10 || this.y > h + 10;
            }
        };

        this.game.bullets.push(bullet);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) this.alive = false;
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00aa88';
        ctx.lineWidth = 2;
        ctx.stroke();

        // "Глаз"
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
