import { InputHandler } from "./InputHandler.js";
import { AssetLoader } from "./AssetLoader.js";
import { EnemyFactory } from "./Factorys/EnemyFactory.js";
import { ScoreManager } from "./Managers/ScoreManager.js";
import { UIManager } from "./Managers/UIManager.js";
import { Player } from "./GameObjects/Creatures.js";
import { WaveManager } from "./Managers/WaveManager.js";
import { BonusManager } from "./Managers/BonusManager.js";
import { gameConfig } from "./config.js";
import { Companion } from "./Companion.js";

import { Bonus } from "./GameObjects/Bonus.js";

class Game{
    constructor(){
        //Холст игры
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Менеджеры
        this.input = new InputHandler();
        this.scoreManager = new ScoreManager();
        this.ui = new UIManager();
        this.waveManager = new WaveManager();
        this.bonusManager = new BonusManager();
        
        // Игровые сущности
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        
		this.companion=null;
		
        // Состояние
        this.isGameOver = false;
        this.gamePause = false;
        this.enemySpawnInterval = null;
        this.lastFrameTime = Date.now();


        // Загрузка ресурсов
        this.assetLoader = new AssetLoader();
        this.assetLoader.loadAll(() => {
            this.enemyFactory = new EnemyFactory(this.assetLoader.spriteSheets);
            this.initUI();
        });

    }

    initUI() {
        const startBtn = document.getElementById('start-game-btn');
        const restartBtn = document.getElementById('restart-btn');
        const resumeBtn = document.getElementById('resume-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () =>
                {
                    this.startGame();
                    this.ui.hideMainMenu();
                });
                    
        }
        if (restartBtn) {
            restartBtn.addEventListener('click', () =>
                {
                    this.startGame();
                    this.ui.hideGameOver();
                });
        }

        if (resumeBtn) {
            resumeBtn.addEventListener('click', () =>
                {
                    this.input.pauseKey = !this.input.pauseKey;
                });
        }
        
    }

    startGame() {
        this.isGameOver = false;
        this.enemies = [];
        this.bullets = [];
        this.waveManager.reset();
        this.bonusManager.reset();
        this.lastFrameTime = Date.now();

        this.scoreManager.reset();
        this.ui.hideMainMenu();
        this.ui.hideGameOver();
        this.ui.updateAll(this.scoreManager);


        this.player = new Player(
            this.canvas.width, 
            this.canvas.height, 
            45, 45, 
            this.assetLoader.playerSprites
        );
this.companion=new Companion(this.player, this);

        // this.spawnEnemy();

        // this.enemySpawnInterval = setInterval(() =>
        //     {
        //         this.spawnEnemy();
        //         // Обновляем интервал динамически
        //         clearInterval(this.enemySpawnInterval);
        //         this.enemySpawnInterval = setInterval(() => {
        //             this.spawnEnemy();
        //         }, this.getSpawnInterval());
        //     },
        //         this.getSpawnInterval()
        //     );

        this.gameLoop();
    }    
    
    gameLoop() {
        if (this.isGameOver) return; // Выходим из цикла

        if(!this.gamePause){
            this.update();
            this.draw();
        }
        else{
            this.updatePause();
        }


        requestAnimationFrame(() => this.gameLoop());
    }
    
    gameOver() {
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        this.isGameOver = true;
           
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
        }
    }

    shouldSpawnEnemy() {
        // Проверяем, пора ли спавнить врага
        if (!this.waveManager.shouldSpawn(this.enemies.length)) {
            return false;
        }
        
        // Проверяем интервал спавна
        const now = Date.now();
        if (!this.lastSpawnTime) this.lastSpawnTime = 0;
        
        if (now - this.lastSpawnTime >= this.waveManager.getSpawnInterval()) {
            this.lastSpawnTime = now;
            return true;
        }
        
        return false;
    }
    
    spawnEnemy() {
        const enemyTypeName = this.waveManager.getRandomEnemyType();
        const enemy = this.enemyFactory.createByType(
            enemyTypeName
        );
        
        if (enemy) {
            this.enemies.push(enemy);
        }
    }

    update() {
        
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime > 100) deltaTime = 16; 
        
        this.lastFrameTime = currentTime;

        // Обновляем менеджер волн
        this.waveManager.update(deltaTime);
        this.bonusManager.update(deltaTime);

        const collectedBonus = this.bonusManager.checkCollision(this.player);
        if (collectedBonus) {
            this.ui.showBonusNotification(collectedBonus);
        }

        // Спавним врагов по таймеру волны
        if (this.shouldSpawnEnemy()) {
            this.spawnEnemy();
        }

        this.updatePause();

        this.updatePlayer();
		if (this.companion && this.companion.alive) {
			this.companion.update(this.enemies);
		}
		
        this.updateEnemies();
        this.updateBullets();
        this.cleanup();
        this.checkCollisions();
    }

    updatePause(){
        this.gamePause = this.input.pauseKey;
        this.ui.showAndHidePause(this.gamePause);
        this.lastFrameTime = Date.now();
    }

    updatePlayer() {
        this.player.currentDirection = this.input.getDirection();
        
        // Движение
        if (this.input.isPressed('ArrowRight')) this.player.moveRight(this.canvas.width);
        if (this.input.isPressed('ArrowLeft')) this.player.moveLeft();
        if (this.input.isPressed('ArrowUp')) this.player.moveUp();
        if (this.input.isPressed('ArrowDown')) this.player.moveDown(this.canvas.height);
        
        if (this.input.isShootPressed() && this.player.canShoot()) {
            for (let i = 0; i < this.player.weaponBulletCount; i++) {
                this.bullets.push(this.player.createBullet(i));
            }
        }
    }

    updateEnemies() {
        for (const enemy of this.enemies) enemy.move();
    }
    
    updateBullets() {
        for (const bullet of this.bullets) bullet.move();
    }
    
    cleanup() {
        this.bullets = this.bullets.filter(b => !b.isOffScreen(this.canvas.width, this.canvas.height));
        this.enemies = this.enemies.filter(e => !e.isOffScreen(this.canvas.width, this.canvas.height));
    }

    getSpawnInterval() {
        // Базовый интервал 1000 мс
        const baseInterval = 1000;
        
        // Каждые 30 секунд уменьшаем интервал на 10%
        // Минимальный интервал 200 мс
        const difficultyFactor = Math.floor(this.gameTime / 30);
        const multiplier = Math.max(0.2, 1 - (difficultyFactor * 0.1));
        
        return baseInterval * multiplier;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const enemy of this.enemies) {
            if (enemy.isLoaded){
                enemy.draw(this.ctx);
            }
        }

        this.player.draw(this.ctx);
			if (this.companion && this.companion.alive) {
			this.companion.drow(this.ctx);
		}

        // Рисуем пули
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        this.bonusManager.draw(this.ctx);
        this.ui.updateWaveInfo(this.waveManager.getWaveInfo());
    }

    checkCollisions() {
        const player = this.player;

        for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
                    
            // Столкновение пуль с врагами
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];

                if (this.isColliding(bullet, enemy)) {
                    this.bullets.splice(i, 1);

                    // Уменьшаем здоровье врага
                    const isDead = enemy.takeDamage();
                    
                    if (isDead) {

                        // Пытаемся оставить бонус
                        this.bonusManager.tryDropBonuse(
                            enemy.x + enemy.sizeX / 2,
                            enemy.y + enemy.sizeY / 2,
                            enemy.typeName
                        );

                        this.enemies.splice(j, 1);
                        this.onEnemyKilled(enemy);
                    }
                    break;
                }
            }

            if (!this.enemies[j]) continue;
            if (player.isInvulnerable()) continue;
            
            if (this.isColliding(player, enemy)) {
                let enemyDies = false;

                // Проверяем щит
                if (player.hasShield()) {   
                    enemyDies = player.handleShieldCollision(enemy);
                } else {
                    // Обычный урон с учетом типа врага
                    const isDead = player.takeDamage(enemy.damage || 1);
                    if (isDead) this.gameOver();
                    
                    // При столкновении враг тоже обычно уничтожается (таран)
                    enemyDies = true; 
                }

                if (enemyDies) {
                    this.enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    isColliding(rect1, rect2) {
        return !(
            rect1.x + rect1.sizeX < rect2.x ||
            rect1.x > rect2.x + rect2.sizeX ||
            rect1.y + rect1.sizeY < rect2.y ||
            rect1.y > rect2.y + rect2.sizeY
        );
    }
     
    // Метод обработки убийства
    onEnemyKilled(enemy) {
        const points = this.scoreManager.onEnemyKilled(enemy.costPoint);
        this.ui.updateAll(this.scoreManager);
        
        const isNextWave = this.waveManager.onEnemyKilled();
        if(isNextWave){
            this.ui.showWaveNotification(this.waveManager.getCurrentWave().name);
        }

        this.ui.updateWaveInfo(this.waveManager.getWaveInfo());
    }
}

let game = null;

document.addEventListener('DOMContentLoaded', () =>{
    game = new Game();

    // 2. Делаем игру доступной в консоли
    window.game = game;
    
    // 3. Добавляем функцию отладки, которая работает с ЭТИМ экземпляром
    window.debugSpawnBonus = (type = 'strongShield') => {
        if (!game || !game.bonusManager) {
            console.error('Игра или менеджер бонусов еще не инициализированы!');
            return;
        }
        
        // Создаем бонус в центре экрана
        const bonus = new Bonus(500, 400, type);
        // ВАЖНО: Добавляем его в активные бонусы игры!
        game.bonusManager.activeBonuses.push(bonus);
    };

        // 3. Добавляем функцию отладки, которая работает с ЭТИМ экземпляром
    window.debugSpawnEnemy = (type = 'Boss') => {
        if (!game || !game.enemyFactory) {
            console.error('Игра или менеджер бонусов еще не инициализированы!');
            return;
        }
        const enemy = game.enemyFactory.createByType(type);

        if (enemy) {
            game.enemies.push(enemy);
        }
    };
});
    

