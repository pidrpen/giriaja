export class GameObject {
    constructor(x, y, sizeX, sizeY) {
        this.x = x;
        this.y = y;
        this.sizeX = sizeX;
        this.sizeY = sizeY; 
    }
    
    // Общий метод для проверки выхода за экран
    isOffScreen(canvasWidth, canvasHeight) {
        return (
            this.x + this.sizeX < 0 ||    // Ушел за левый край
            this.x > canvasWidth ||        // Ушел за правый край
            this.y + this.sizeY < 0 ||    // Ушел за верхний край
            this.y > canvasHeight          // Ушел за нижний край
        );
    }
}