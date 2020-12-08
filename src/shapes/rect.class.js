import {createClass} from '../util/lang_class';
import ObjectClass from './object.class';


const RectClass = createClass(ObjectClass, {}, {
    type: 'rect',

    /**
     * 边框弧度 水平半径
     */
    rx:   0,
    /**
     * 边框弧度 垂直半径
     */
    ry:   0,

    cacheProperties: ObjectClass.prototype.cacheProperties.concat('rx', 'ry'),

    /**
     * 矩形初始化函数
     * @param {Object} options 
     */
    initialize() {
        this._initRxRy();
    },

    /**
     * 根据rx ry 数据进行初始化兼容处理
     */
    _initRxRy: function() {
        if (this.rx && !this.ry) {
          this.ry = this.rx;
        }
        else if (this.ry && !this.rx) {
          this.rx = this.ry;
        }
    },

    /**
     * 矩形渲染方案
     * @param {CanvasRenderingContext2D} ctx 
     * @see {@link  https://blog.csdn.net/monkey646812329/article/details/52841105}
     */
    _render(ctx) {
        const rx = this.rx ? Math.min(this.rx, this.width / 2) : 0;
        const ry = this.ry ? Math.min(this.ry, this.height / 2) : 0;
        const w = this.width;
        const h = this.height;
        const x = -this.width / 2;
        const y = -this.height / 2;
        const isRounded = rx !== 0 || ry !== 0;
        // 用贝塞尔曲线绘制圆，因为对称原因,控制点与开始点距离为这个诡异数字与半径的乘积
        const k = 1 - 0.5522847498;
        ctx.beginPath();

        ctx.moveTo(x + rx, y);

        ctx.lineTo(x + w - rx, y);
        isRounded && ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);

        ctx.lineTo(x + w, y + h - ry);
        isRounded && ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);

        ctx.lineTo(x + rx, y + h);
        isRounded && ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);

        ctx.lineTo(x, y + ry);
        isRounded && ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);

        ctx.closePath();
    },

    /**
     * 绘制虚线边框
     */
    _renderDashedStroke() {

    },

    /**
     * 输出关键属性对象
     * @param {Array} propertiesToInclude 所有你想额外输出的属性
     */
    toObject: function(propertiesToInclude) {
        return this.callSuper('toObject', ['rx', 'ry'].concat(propertiesToInclude));
    },

}, 'RectClass');

RectClass.fromObject = function(object) {
    return ObjectClass._fromObject('Rect', object);
}

export default RectClass;