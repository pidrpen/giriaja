
export class UIManager {
    constructor() {
        this.scoreDisplay = document.getElementById('score-display');
        this.killsDisplay = document.getElementById('kills-display');
        this.multiplierDisplay = document.getElementById('multiplier-display');
        this.killsForNextDisplay = document.getElementById('killsForNext-display');

        // Панели меню
        this.mainMenu = document.getElementById('main-menu');
        this.gameOverScreen = document.getElementById('game-over');
        this.pauseScreen = document.getElementById('game-pause');

        // Элементы уведомлений
        this.notifMultiplier = document.getElementById('notification-multiplier');
        this.notifWave = document.getElementById('notification-wave');
        this.notifBonus = document.getElementById('notification-bonus');
        // Внутренние span для текста
        this.notifMultValue = document.getElementById('notif-mult-value');
        this.notifWaveName = document.getElementById('notif-wave-name');
        this.notifBonusName = document.getElementById('notif-bonus-name');

        this.waveDisplay = document.getElementById('wave-display');
        this.waveProgressDisplay = document.getElementById('wave-progress-display');

        // Таймеры для автоматического скрытия
        this.hideTimers = {};
    }
    
    showNotification(element, duration = 2000) {
        // Если уже показывается — сбрасываем таймер
        if (this.hideTimers[element.id]) {
            clearTimeout(this.hideTimers[element.id]);
        }
        
        // Перезапускаем анимацию
        element.classList.remove('show', 'hidden');
        // Форсируем reflow для перезапуска CSS-анимации
        void element.offsetWidth;
        element.classList.add('show');
        
        // Автоматически скрываем через duration
        this.hideTimers[element.id] = setTimeout(() => {
            element.classList.remove('show');
            element.classList.add('hidden');
            delete this.hideTimers[element.id];
        }, duration);
    }

    showMultiplierNotification(multiplier) {
        if (this.notifMultValue) {
            this.notifMultValue.textContent = multiplier.toFixed(2);
        }
        this.showNotification(this.notifMultiplier, 2000);
    }
    
    showWaveNotification(waveName) {
        if (this.notifWaveName) {
            this.notifWaveName.textContent = waveName;
        }
        this.showNotification(this.notifWave, 2500);
    }
    
    showBonusNotification(bonusName) {
        if (this.notifBonusName) {
            this.notifBonusName.textContent = bonusName;
        }
        this.showNotification(this.notifBonus, 1500);
    }

    updateScore(score) {
        if (this.scoreDisplay) this.scoreDisplay.textContent = score;
    }
    
    updateKills(kills) {
        if (this.killsDisplay) this.killsDisplay.textContent = kills;
    }
    
    updateMultiplier(multiplier, killsForNext) {
        if (this.multiplierDisplay) {
            this.multiplierDisplay.textContent = `x${multiplier.toFixed(2)}`;
        }
        if (this.killsForNextDisplay) {
            this.killsForNextDisplay.textContent = `x${killsForNext.toFixed(0)}`;
        }
    }

    updateWaveInfo(waveInfo) {
        if (this.waveDisplay) {
            this.waveDisplay.textContent = `Волна ${waveInfo.number}: ${waveInfo.name}`;
        }
        
        if (this.waveProgressDisplay) {
            this.waveProgressDisplay.textContent = `${waveInfo.killsInWave}/${waveInfo.killsNeeded}`;
        }
    }
    
    updateAll(scoreManager) {
        this.updateScore(scoreManager.score);
        this.updateKills(scoreManager.kills);
        this.updateMultiplier(scoreManager.multiplier, scoreManager.killsForNextMultiplier);
    }
    
    showMainMenu() {
        this.mainMenu.classList.remove('hidden');
    }
    
    hideMainMenu() {
        this.mainMenu.classList.add('hidden');
    }
    
    showGameOver() {
        this.gameOverScreen.classList.remove('hidden');
    }
    
    hideGameOver() {
        this.gameOverScreen.classList.add('hidden');
    }

    showAndHidePause(hide) {
        hide == true? this.pauseScreen.classList.remove('hidden') : this.pauseScreen.classList.add('hidden');
    }

}