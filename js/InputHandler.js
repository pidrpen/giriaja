export class InputHandler {
    constructor() {
        this.keys = new Map();
        this.pauseKey = false;
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', e => {
            if(e.key == 'Escape'){
                this.pauseKey = !this.pauseKey;
            }
            else if (!this.keys.get(e.key)) {
                this.keys.set(e.key, e.key);
            }
            
        });
        
        document.addEventListener('keyup', e => {
            if (this.keys.get(e.key)) {
                this.keys.delete(e.key);
            }
        });
    }
    
    isPressed(key) {
        return this.keys.has(key);
    }
    
    getDirection() {
        const hasUp = this.isPressed('ArrowUp');
        const hasDown = this.isPressed('ArrowDown');
        const hasLeft = this.isPressed('ArrowLeft');
        const hasRight = this.isPressed('ArrowRight');
        
        if (hasUp && hasLeft) return 'left_up';
        if (hasUp && hasRight) return 'right_up';
        if (hasDown && hasLeft) return 'left_down';
        if (hasDown && hasRight) return 'right_down';
        if (hasUp) return 'up';
        if (hasDown) return 'down';
        if (hasLeft) return 'left';
        if (hasRight) return 'right';
        return 'idle';
    }
    
    isAnyDirectionPressed() {
        return this.isPressed('ArrowUp') || 
               this.isPressed('ArrowDown') || 
               this.isPressed('ArrowLeft') || 
               this.isPressed('ArrowRight');
    }
    
    isShootPressed() {
        return this.isPressed(' ');
    }
}