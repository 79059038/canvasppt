import {createClass} from '../util/lang_class';
import {degreesToRadians, transformPoint} from '../util/misc';
import Common from '../mixins/common.class.mixin';

/**
 * 
 * @param {RenderingContext2D} ctx 
 * @param {Number} left 圆心所在位置x
 * @param {Number} top 圆心所在位置y
 * @param {Object} styleOverride 覆盖样式
 * @param {Object} fabricObject 元素自带样式
 */
export function renderCircleControl(ctx, left, top, styleOverride = {}, fabricObject) {
    const size = styleOverride.cornerSize || fabricObject.cornerSize
    const transparentCorners = typeof styleOverride.transparentCorners !== 'undefined' ?
          styleOverride.transparentCorners : this.transparentCorners
    const methodName = transparentCorners ? 'stroke' : 'fill';
    const stroke = !transparentCorners && (styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor);
    ctx.save();
    ctx.fillStyle = styleOverride.cornerColor || fabricObject.cornerColor;
    ctx.strokeStyle = styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor;
    // this is still wrong
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(left, top, size / 2, 0, 2 * Math.PI, false);
    ctx[methodName]();
    if (stroke) {
      ctx.stroke();
    }
    ctx.restore();
}

/**
 * 绘制方形的控制边框
 * @param {RenderingContext2D} ctx 
 * @param {Number} left x位移距离
 * @param {Number} top y位移距离
 * @param {Object} styleOverride 覆盖样式
 * @param {Object} fabricObject 元素自带样式
 */
export function renderSquareControl(ctx, left, top, styleOverride, fabricObject) {
    styleOverride = styleOverride || {};
    const size = styleOverride.cornerSize || fabricObject.cornerSize;
    const transparentCorners = typeof styleOverride.transparentCorners !== 'undefined' ?
          styleOverride.transparentCorners : fabricObject.transparentCorners;
    const methodName = transparentCorners ? 'stroke' : 'fill';
    const stroke = !transparentCorners && (
          styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor
    );
    const sizeBy2 = size / 2;
    ctx.save();
    ctx.fillStyle = styleOverride.cornerColor || fabricObject.cornerColor;
    ctx.strokeStyle = styleOverride.strokeCornerColor || fabricObject.strokeCornerColor;
    // this is still wrong
    ctx.lineWidth = 1;
    ctx.translate(left, top);
    ctx.rotate(degreesToRadians(fabricObject.angle));
    // this does not work, and fixed with ( && ) does not make sense.
    // to have real transparent corners we need the controls on upperCanvas
    // transparentCorners || ctx.clearRect(-sizeBy2, -sizeBy2, size, size);
    ctx[methodName + 'Rect'](-sizeBy2, -sizeBy2, size, size);
    if (stroke) {
      ctx.strokeRect(-sizeBy2, -sizeBy2, size, size);
    }
    ctx.restore();
}


const ControlClass = createClass(Common, {
    // 是否可见
    visible: true,
    // 角度
    angle: 0,

    actionName: 'scale',

    x: 0,

    y: 0,

    offsetX: 0,

    offsetY: 0,

    // 光标悬浮时的样式, 如果提供了cursorStyleHandler方法 这个属性会被忽略
    cursorStyle: 'crosshair',

    // 如果存在offsetXY,则绘制一条线连接控制模块与元素盒子
    withConnection: false,
}, {

    _private_type: 'ControlClass',

    name: '',

    mouseDownHandler: null,
    /**
     * 
     * @param {*} dim 
     * @param {*} finalMatrix 
     */
    positionHandler(dim, finalMatrix) {
        const point = transformPoint({
            x: this.x * dim.x + this.offsetX,
            y: this.y * dim.y + this.offsetY }, finalMatrix);
        return point;
    },

    /**
     * 
     * @param {RenderingContext2D} ctx 绘制canvas的上下文
     * @param {Number} left 
     * @param {Number} top 
     * @param {Object} styleOverride 需要覆盖的样式
     * @param {Object} fabricObject 元素对象 主要使用cornerStyle 即元素自带的样式
     */
    render(ctx, left, top, styleOverride, fabricObject) {
        styleOverride = styleOverride || {};
        switch (styleOverride.cornerStyle || fabricObject.cornerStyle) {
            // 圆形
            case 'circle':
            renderCircleControl.call(this, ctx, left, top, styleOverride, fabricObject);
                break;
            default:
            // 默认为方形
            renderSquareControl.call(this, ctx, left, top, styleOverride, fabricObject);
        }
    },

    /**
     * 返回 mouseDown 的handler
     */
    getMouseDownHandler: function(/* eventData, fabricObject, control */) {
      return this.mouseDownHandler;
    },

    /**
     * 返回 control 的actionHandler
     */
    getActionHandler: function(/* eventData, transformData, fabricObject */) {
      return this.actionHandler;
    },

    getActionName(eventData, control /* fabricObject */) {
      return control.actionName;
    },

    getMouseUpHandler() {
      return this.mouseUpHandler;
    },

    cursorStyleHandler(eventData, control /* fabricObject */) {
        return control.cursorStyle;
    }
});

export default ControlClass;
