function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    type: 'point',
    constructor: Point,

    /**
     * 和另一个点相加，并返回新的点对象
     * @param {Point} that
     */
    add(that) {
        return new Point(this.x + that.x, this.y + that.y);
    },

    /**
     * 当前点和另一个点相加，返回当前对象
     * @param {Point} that
     */
    addEquals(that) {
        this.x += that.x;
        this.y += that.y;
        return this;
    },

    /**
     * 该点x与y平移相同距离,并返回新对象
     * @param {Number} scalar
     */
    scalarAdd(scalar) {
        return new Point(this.x + scalar, this.y + scalar);
    },

    /**
     * 判断当前点和传入点坐标是否相同
     * @param {Point} that
     */
    eq(that) {
        return (this.x === that.x && this.y === that.y);
    },

    /**
     * 减去另一个坐标点
     * @param {*} that
     */
    subtractEquals(that) {
        this.x -= that.x;
        this.y -= that.y;
        return this;
    },

    /**
     * 设置当前坐标x与y
     * @param {*} x
     * @param {*} y
     */
    setXY(x, y) {
        this.x = x;
        this.y = y;
        return this;
    },

    /**
     * 设置当前对象x坐标
     * @param {Number} x
     */
    setX(x) {
        this.x = x;
        return this;
    },

    /**
     * 设置当前对象y坐标
     * @param {Nunber} y
     */
    setY(y) {
        this.y = y;
        return this;
    },

    /**
     * 使用传入点坐标覆盖当前点
     * @param {*} that
     */
    setFromPoint(that) {
        this.x = that.x;
        this.y = that.y;
        return this;
    },

    /**
     * 两个点对象互相调换
     * @param {Point} that
     */
    swap(that) {
        const {x} = this;
        const {y} = this;
        this.x = that.x;
        this.y = that.y;
        that.x = x;
        that.y = y;
    },

    /**
     * 克隆并返回一个新的坐标点
     */
    clone() {
        return new Point(this.x, this.y);
    },
    toString() {
        return `${this.x},${this.y}`;
    },
};

export default Point;
