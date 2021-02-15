import {toFixed, degreesToRadians, qrDecompose, multiplyTransformMatrices} from '../util/misc';
import {NUM_FRACTION_DIGITS} from '../public';
import {createClass} from '../util/lang_class';
import Common from '../mixins/common.class.mixin';
import origin from '../mixins/object_origin.mixin';
import geometry from '../mixins/object_geometry.mixin';
import stateful from '../mixins/stateful.mixin';
import {devicePixelRatio, browserShadowBlurConstant, iMatrix, PPTCanvas} from '../HEADER';
import {clone} from '../util/lang_class'
import {enlivenPatterns} from '../util/misc'

const statePropertiesStr = `top left width height scaleX scaleY flipX flipY originX originY transformMatrix
    stroke strokeWidth strokeDashArray strokeLineCap strokeDashOffset strokeLineJoin strokeMiterLimit
    angle opacity fill globalCompositeOperation shadow visible backgroundColor
    skewX skewY fillRule paintFirst clipPath strokeUniform`;
const stateProperties = statePropertiesStr.split('');

const cacheProperties = `fill stroke strokeWidth strokeDashArray width height paintFirst 
strokeUniform  strokeLineCap strokeDashOffset strokeLineJoin strokeMiterLimit backgroundColor clipPath`.split(' ');


const CObject = createClass(Common, {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    // 元素X轴值按元素的什么位置定位
    originX: 'left',
    // 元素Y轴值按元素的什么位置定位
    originY: 'top',
    // 透明度
    opacity: 1,
    // 填充色
    fill: 'rgb(0,0,0)',
    // 边框
    stroke: null,
    // 边框宽度
    strokeWidth: 1,
    // 阴影
    shadow: null,
    // 是否需要渲染
    visible: true,

    /**
    * 外部边框相关
    */
    // 旋转角度
    angle: 0,
    // 控制边框矩形大小
    cornerSize: 5,
    // 控制边框颜色
    borderColor: 'rgb(142,219,223)',
    // 特殊组合方式
    globalCompositeOperation: '',

    /**
     * 元素可控制边框的粗细
     */
    borderScaleFactor: 1,

    /**
     * 当为false时，边框随元素缩放
     * 否则为true是，边框总是为相应准确值
     */
    strokeUniform: false,

    /**
     * 元素控制边框线dash
     */
    cornerDashArray: null,

    /**
     * 若置为false 元素不会渲染控制边框
     */
    hasBorders: true,
    // 设置为false时，当前对象不能成为事件的目标对象。即事件中的小透明
    evented: true,

    // 绘制的时候先绘制fill还是stroke 二选一
    paintFirst: 'fill',

    // 当设置为false时 该元素不能被选中后修改属性 
    selectable: true
}, {
    type: 'object',

    /**
     * 检验元素对象变化的属性列表
     */
    stateProperties,

    /**
     * 检测元素对象需要刷新时需要判断的属性列表
     */
    cacheProperties,

    // 设置为false时 元素不展示控制边框 且不能被鼠标操作
    hasControls: true,

    // 设置鼠标悬浮在这个元素时的光标样式
    hoverCursor: null,

    initialize() {
        // fabric 只是做了下setOption 我在createObject先做了 这里留空吧
    },

    /**
         * 在某个canvas中渲染当前对象
         * @param {*} ctx
         */
    render(ctx) {
        if (this.isNotVisible()) {
            return;
        }
        // TODO 后续加上判断当前元素是否在该canvas可视区域内
        // 保存当前ctx相关舒心
        ctx.save();
        this._setupCompositeOperation(ctx);
        // 如当前元素被选中，则绘画其边框内部的背景色
        this.drawSelectionBackground(ctx);
        // 旋转坐标
        this.transform(ctx);
        // 设置透明度
        this._setOpacity(ctx);
        // 设置阴影区
        this._setShadow(ctx, this);
        this.drawObject(ctx);
    },

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawObject(ctx) {
        // 设置透明度
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.fill;
        // 基本子类覆盖
        this._render(ctx);
    },

    /**
     * 设置当前ctx的globalCompositeOperation属性。该属性主要用来合并绘制图形
     * 比如可设置: 绘制图形一后，绘制的图形二只在与图形一重叠的部分绘制
     * 类似于css3 mask样式
     * @param {*} ctx
     */
    _setupCompositeOperation(ctx) {
        if (this.globalCompositeOperation) {
            ctx.globalCompositeOperation = this.globalCompositeOperation;
        }
    },


    // 判断如果当前对象长宽是0 或者透明度是0 则直接不渲染
    // @memberOf fabric.Object.prototype
    // @return {Boolean}
    isNotVisible() {
        return this.opacity === 0
            || (!this.width && !this.height && this.strokeWidth === 0)
            || !this.visible;
    },

    // 在边框内填充对象背景。
    // 依赖于公共option: padding, selectionBackgroundColor
    // staticCanvas 时这个方法应该被跳过
    drawSelectionBackground(ctx) {
        // 先判断有没有selectionBackgroundColor 并且是interactive 的canvas 并且当前对象是活跃对象
        if (!this.selectionBackgroundColor
            || (this.canvas && !this.canvas.interactive)
            || (this.canvas && this.canvas._activeObject !== this)
        ) {
            return this;
        }
        ctx.save();
        // 先求对象的中心点
        const center = this.getCenterPoint();
        const wh = this._calculateCurrentDimensions();
        const vpt = this.canvas.viewportTransform;
        ctx.translate(center.x, center.y);
        ctx.scale(1 / vpt[0], 1 / vpt[3]);
        ctx.rotate(degreesToRadians(this.angle));
        ctx.fillStyle = this.selectionBackgroundColor;
        ctx.fillRect(-wh.x / 2, -wh.y / 2, wh.x, wh.y);
        ctx.restore();
        return this;
    },

    /**
     * 调整当前canvas中心位置到该元素中心位置
     * @param {*} ctx
     */
    transform(ctx) {
        const needFullTransform = (this.group && !this.group._transformDone)
           || (this.group && this.canvas && ctx === this.canvas.contextTop);
        // 这个鬼方法先
        const m = this.calcTransformMatrix(!needFullTransform);
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    },

    /**
     * 设置ctx的透明度
     * @param {*} ctx
     */
    _setOpacity(ctx) {
        if (this.group && !this.group._transformDone) {
            ctx.globalAlpha = this.getObjectOpacity();
        }
        else {
            ctx.globalAlpha *= this.opacity;
        }
    },

    getObjectOpacity() {
        let {opacity} = this;
        if (this.group) {
            opacity *= this.group.getObjectOpacity();
        }
        return opacity;
    },

    _setShadow(ctx) {
        if (!this.shadow) {
            return;
        }

        const {shadow} = this;
        const {canvas} = this;
        let scaling;
        let multX = (canvas && canvas.viewportTransform[0]) || 1;
        let multY = (canvas && canvas.viewportTransform[3]) || 1;
        if (shadow.nonScaling) {
            scaling = {scaleX: 1, scaleY: 1};
        }
        else {
            scaling = this.getObjectScaling();
        }
        if (canvas && canvas._isRetinaScaling()) {
            multX *= devicePixelRatio;
            multY *= devicePixelRatio;
        }
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur * browserShadowBlurConstant
          * (multX + multY) * (scaling.scaleX + scaling.scaleY) / 4;
        ctx.shadowOffsetX = shadow.offsetX * multX * scaling.scaleX;
        ctx.shadowOffsetY = shadow.offsetY * multY * scaling.scaleY;
    },

    /**
     * 计算元素缩放因素数据
     */
    getObjectScaling() {
        const options = qrDecompose(this.calcTransformMatrix());
        return {scaleX: Math.abs(options.scaleX), scaleY: Math.abs(options.scaleY)};
    },

    /**
     * 渲染元素控制边框
     * @param {*} ctx
     * @param {*} styleOverride - 覆盖样式 此次渲染可针对该元素做特殊样式覆盖原本样式。
     */
    _renderControls(ctx, styleOverride) {
        const vpt = this.getViewportTransform();
        // 根据元素对象属性计算transform matrix.
        let matrix = this.calcTransformMatrix();
        styleOverride = styleOverride || { };
        const drawBorders = typeof styleOverride.hasBorders !== 'undefined' ? styleOverride.hasBorders : this.hasBorders;
        const drawControls = typeof styleOverride.hasControls !== 'undefined' ? styleOverride.hasControls : this.hasControls;
        matrix = multiplyTransformMatrices(vpt, matrix);
        // 根据transform matrix拆分样式
        const options = qrDecompose(matrix);
        ctx.save();
        ctx.translate(options.translateX, options.translateY);
        ctx.lineWidth = 1 * this.borderScaleFactor;
        if (!this.group) {
            ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
        }
        if (styleOverride.forActiveSelection) {
            ctx.rotate(degreesToRadians(options.angle));
            drawBorders && this.drawBordersInGroup(ctx, options, styleOverride);
        }
        else {
            ctx.rotate(degreesToRadians(this.angle));
            drawBorders && this.drawBorders(ctx, styleOverride);
        }
        drawControls && this.drawControls(ctx, styleOverride);
        ctx.restore();
    },

    /**
     * 获取当前元素所属canvas或者系统默认matrix
     */
    getViewportTransform() {
        if (this.canvas && this.canvas.viewportTransform) {
            return this.canvas.viewportTransform;
        }
        return iMatrix.concat();
    },

    /**
     * 设置连接线
     * @param {*} ctx - canvas上下文
     * @param {*} dashArray - 连接线数组
     * @param {*} alternative - 如果浏览器不支持lineDash
     */
    _setLineDash(ctx, dashArray, alternative) {
        if (!dashArray || dashArray.length === 0) {
            return;
        }
        // 数组长度为基数时进行复制
        if (1 & dashArray.length) {
            // dashArray.push.apply(dashArray, dashArray);
            dashArray = dashArray.concat(dashArray);
        }
        if (typeof ctx.setLineDash !== 'undefined') {
            ctx.setLineDash(dashArray);
        }
        else {
            alternative && alternative(ctx);
        }
    },

    _renderPaintInOrder(ctx) {
        if (this.paintFirst === 'stroke') {
            this._renderStroke(ctx);
            this._renderFill(ctx);
        }
        else {
            this._renderFill(ctx);
            this._renderStroke(ctx);
        }
    },

    /**
     * 绘制填充色
     * @param {CanvasRenderingContext2D} ctx - 上下文
     */
    _renderFill(ctx) {
        if (!this.fill) {
            return;
        }

        ctx.save();
        this._applyPatternGradientTransform(ctx, this.fill);
        if (this.fillRule === 'evenodd') {
            ctx.fill('evenodd');
        }
        else {
            ctx.fill();
        }
        ctx.restore();
    },

    /**
     * 进行元素描边 描边大师
     * @param {CanvasRenderingContext2D} ctx - 上下文
     */
    _renderStroke(ctx) {
        if (!this.stroke || this.strokeWidth === 0) {
            return;
        }

        ctx.save();
        if (this.strokeUniform && this.group) {
            const scaling = this.getObjectScaling();
            ctx.scale(1 / scaling.scaleX, 1 / scaling.scaleY);
        }
        else if (this.strokeUniform) {
            ctx.scale(1 / this.scaleX, 1 / this.scaleY);
        }
        this._setLineDash(ctx, this.strokeDashArray, this._renderDashedStroke);
        if (this.stroke.toLive && this.stroke.gradientUnits === 'percentage') {
            // TODO 使用gradient计算。这计算量比较大所以比较缓慢。要用缓存 记录
            this._applyPatternForTransformedGradient(ctx, this.stroke);
        }
        else {
            this._applyPatternGradientTransform(ctx, this.stroke);
        }
        ctx.stroke();
        ctx.restore();
    },

    // 渐变fill 根据不同filter变更当前ctx位置 返回位移偏量
    _applyPatternGradientTransform(ctx, filler) {
        if (!filler || !filler.toLive) {
            return {offsetX: 0, offsetY: 0};
        }
        const t = filler.gradientTransform || filler.patternTransform;
        const offsetX = -this.width / 2 + filler.offsetX || 0;
        const offsetY = -this.height / 2 + filler.offsetY || 0;

        if (filler.gradientUnits === 'percentage') {
            ctx.transform(this.width, 0, 0, this.height, offsetX, offsetY);
        }
        else {
            ctx.transform(1, 0, 0, 1, offsetX, offsetY);
        }
        if (t) {
            ctx.transform(t[0], t[1], t[2], t[3], t[4], t[5]);
        }
        return {offsetX, offsetY};
    },

    /**
     * 决定一个元素是否需要缓存
     * objectCaching是一个全局的标志，且优先级最高
     * 当元素进行绘制的时候需要调用needsItsOwnCache方法
     * 一般情况而言不需要缓存group中的数据
     */
    shouldCache() {
        this.ownCaching = this.needsItsOwnCache() || (
          this.objectCaching &&
          (!this.group || !this.group.isOnACache())
        );
        return this.ownCaching;
    },

    /**
     * 返回当前是否有stroke样式 且不为透明和边框宽度不为0
     */
    hasStroke() {
        return this.stroke && this.stroke !== 'transparent' && this.strokeWidth !== 0;
    },

    /**
     * 返回是否当前元素存在fill样式 且不为透明transparent
     */
    hasFill() {
        return this.fill && this.fill !== 'transparent';
    },

    needsItsOwnCache() {
        if (this.paintFirst === 'stroke' &&
          this.hasFill() && this.hasStroke() && typeof this.shadow === 'object') {
          return true;
        }
        if (this.clipPath) {
          return true;
        }
        return false;
    },

    /**
     * 需子类自我实现的渲染方案
     */
    _render(/* ctx */) {
        throw Error('当前元素类型尚未实现渲染方案');
    },

    /**
     * 将当前对象导出
     */
    toObject() {
        const object = {
            type: this.type,
            originX: this.originX,
            originY: this.originY,
            left: toFixed(this.left, NUM_FRACTION_DIGITS),
            top: toFixed(this.top, NUM_FRACTION_DIGITS),
            width: toFixed(this.width, NUM_FRACTION_DIGITS),
            height: toFixed(this.height, NUM_FRACTION_DIGITS),
            fill: (this.fill && this.fill.toObject) ? this.fill.toObject() : this.fill,
            stroke: (this.stroke && this.stroke.toObject) ? this.stroke.toObject() : this.stroke,
            strokeWidth: toFixed(this.strokeWidth, NUM_FRACTION_DIGITS),
            angle: toFixed(this.angle, NUM_FRACTION_DIGITS),
            opacity: toFixed(this.opacity, NUM_FRACTION_DIGITS),
            shadow: (this.shadow && this.shadow.toObject) ? this.shadow.toObject() : this.shadow,
            visible: this.visible,
            backgroundColor: this.backgroundColor,
        };
        return object;
    },
    // 结构object_origin中的公共方法
    ...origin,
    ...geometry,
    ...stateful
});


CObject.__uid = 0;
CObject._fromObject = function(className, object, callback, extraParam) {
    var klass = PPTCanvas[className];
    object = clone(object, true);
    enlivenPatterns([object.fill, object.stroke], function(patterns) {
      if (typeof patterns[0] !== 'undefined') {
        object.fill = patterns[0];
      }
      if (typeof patterns[1] !== 'undefined') {
        object.stroke = patterns[1];
      }
    //   fabric.util.enlivenObjects([object.clipPath], function(enlivedProps) {
    //     object.clipPath = enlivedProps[0];
    //     var instance = extraParam ? new klass(object[extraParam], object) : new klass(object);
    //     callback && callback(instance);
    //   });
    });
}

export default CObject;
