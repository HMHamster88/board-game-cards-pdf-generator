class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    mul(f) {
        return new Vector2D(this.x * f, this.y * f);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalized() {
        var length = this.length();
        return new Vector2D(this.x / length, this.y / length);
    }

    inverted() {
        return new Vector2D(-this.x, -this.y);
    }

    static atAngle(angle, lenght) {
        return new Vector2D(Math.cos(angle) * lenght, Math.sin(angle) * lenght);
    }
}