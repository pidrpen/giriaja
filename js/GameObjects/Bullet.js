import { GameObject } from "./GameObject.js";

export class Bullet extends GameObject {
    constructor(x, y, sizeX = 10, sizeY = 10, speed = 5) {
        super(x, y, sizeX, sizeY );
        this.speed = speed;
        // this.color = this.randomRgbColor();
        this.color = "#990202dd";
    }
    
    move() {
        this.y -= this.speed; // Летит вверх
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.sizeX, this.sizeY);
    }
    
    randomRgbColor() {
        const red = Math.floor(Math.random() * 256); // Случайное число от 0 до 255
        // const green = Math.floor(Math.random() * 256);
        // const blue = Math.floor(Math.random() * 256);
        const green = 0;
        const blue = 0;
        return `rgb(${red}, ${green}, ${blue})`;
    }
}