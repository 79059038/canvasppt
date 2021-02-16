import Common from './mixins/common.class.mixin';
import ImageClass from './shapes/image.class';
import Point from './publicClass/point.class';
import {createClass} from './util/lang_class';
import {allCanvasList} from './public';
import {getById, addClass, loadImage, getElementOffset} from './util/dom_mics';
import {invertTransform, transformPoint} from './util/misc';
import {iMatrix, devicePixelRatio} from './HEADER';

const StaticCanvas = createClass(Common, {
    width: 120,
    height: 90,

    /**
     * 指示是否将控制边框绘制在图像之上
     */
    controlsAboveOverlay: false
},
{

    _objects: [],
    // 当前 聚焦的viewport 的transformation
    viewportTransform: iMatrix.concat(),
    // 暂时没看懂啥意思
    clipPath: null,
    // 检测当前canvas是否正在渲染
    isRendering: 0,

    // 当它为true时 将根据devicePixelRatio缩放呈现更好的视觉效果
    enableRetinaScaling: true,

    // 类初始化方法
    initialize(options, el) {
        // 供外部调用整体渲染的方法绑定this
        this.renderAllBound = this.renderAll.bind(this);
        this._initStatic(options, el);

    },
    // 方便子类调用
    _initStatic(options, el) {
        this.createLowerCanvas(el);
        // 初始化options 增加监控
        this.setCanvasStyle(options);
        // 设置背景
        if (this.backgroundImage) {
            this.setBackgroundImage(options.backgroundImage);
        }
        // 初始化当前canvas是否需要重新渲染
        this.needRenderAndReset = false;
        // 在公共canvas中添加当前canvas对象
        allCanvasList.push(this);
    },
    // 创建底部的canvas
    createLowerCanvas(canvasEl) {
        if (canvasEl && canvasEl.getContext) {
            this.lowerCanvasEl = canvasEl;
        }
        else {
            this.lowerCanvasEl = getById(canvasEl) || this._createCanvasElement();
        }

        addClass(this.lowerCanvasEl, 'lower-canvas');

        if (this.interactive) {
            this._applyCanvasStyle(this.lowerCanvasEl);
        }

        this.contextContainer = this.lowerCanvasEl.getContext('2d');
    },
    add(...objects) {
        this._objects = this._objects.concat(objects);
        objects.forEach(item => {
            item.canvas = this;
        });
        this.renderCanvas(this.contextContainer, this._objects);
    },
    // 初始化options
    setCanvasStyle() {
        // 设置底部canvas宽高
        const {lowerCanvasEl} = this;
        lowerCanvasEl.height = this.height;
        lowerCanvasEl.width = this.width;
        lowerCanvasEl.style.height = `${this.height}px`;
        lowerCanvasEl.style.width = `${this.width}px`;
    },
    // 获取与加载图片
    async setBgOverlayImage(property, image, callback, options) {
        if (typeof image === 'string') {
            const img = await loadImage(image, options && options.crossOrigin);
            const instance = new ImageClass(img, options);
            this[property] = instance;
            instance.canvas = this;
            callback && callback(img);
        }
        else {
            options && image.setOptions(options);
            this[property] = image;
            image && (image.canvas = this);
            callback && callback(image, false);
        }

        return this;
    },
    setBackgroundImage(image, callback, options) {
        return this.setBgOverlayImage('backgroundImage', image, callback, options);
    },
    // 计算canvas相对于document offset多少
    calcOffset() {
        this._offset = getElementOffset(this.lowerCanvasEl);
        return this;
    },
    // 渲染整个canvas元素 供外部调用
    renderAll() {
        // lowerCanvas的context
        const canvasToDrawOn = this.contextContainer;
        this.renderCanvas(canvasToDrawOn, this._objects);
        return this;
    },
    // 渲染background, objects, overlay and controls
    renderCanvas(ctx, objects) {
        // 开启正在渲染标志
        this.isRendering = 1;
        const v = this.viewportTransform;
        this.calcViewportBoundaries();
        // 先进行canvas整体区域清空
        this.clearContext(ctx);
        // 触发钩子函数
        this.fire('before:render', {ctx});
        // 先画背景板
        this._renderBackground(ctx);
        ctx.save();
        // 根据当前canvas的transform 进行位移转换
        ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
        this._renderObjects(ctx, objects);
        ctx.restore();
        // interactive属性出自CanvasClass 用以区分当前canvas是否可交互
        if (!this.controlsAboveOverlay && this.interactive) {
            this.drawControls(ctx);
        }
        // 钩子函数
        this.fire('after:render', {ctx});
    },
    // 计算画布四个角绝对坐标 主要影响来自旋转和位移
    calcViewportBoundaries() {
        const points = {};
        const {width} = this;
        const {height} = this;
        const iVpt = invertTransform(this.viewportTransform);
        points.tl = transformPoint({x: 0, y: 0}, iVpt);
        points.br = transformPoint({x: width, y: height}, iVpt);
        points.tr = new Point(points.br.x, points.tl.y);
        points.bl = new Point(points.tl.x, points.br.y);
        this.vptCoords = points;
        return points;
    },
    // 清除整个canvas区域内容
    clearContext(ctx) {
        ctx.clearRect(0, 0, this.width, this.height);
        return this;
    },
    _renderBackground(ctx) {
        this._renderBackgroundOrOverlay(ctx, 'background');
    },
    _renderOverlay(ctx) {
        this._renderBackgroundOrOverlay(ctx, 'overlay');
    },
    // 渲染'background' or 'overlay'
    _renderBackgroundOrOverlay(ctx, property) {
        // 颜色
        const fill = this[`${property}Color`];
        // 图片对象 ImageClass实例
        const object = this[`${property}Image`];
        const v = this.viewportTransform;
        // 旋转角度位移的数组
        const needsVpt = this[`${property}Vpt`];
        if (!fill && !object) {
            return;
        }
        if (fill) {
            // 先保存当前
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.width, 0);
            ctx.lineTo(this.width, this.height);
            ctx.lineTo(0, this.height);
            ctx.closePath();
            // toLive是存在渐变的时候返回CanvasGradient实例方法
            ctx.fillStyle = fill.toLive
                ? fill.toLive(ctx, this)
                : fill;
            // 如果存在先转变当前canvas坐标系
            if (needsVpt) {
                ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
            }
            // fill对象可能自带位移偏量
            ctx.transform(1, 0, 0, 1, fill.offsetX || 0, fill.offsetY || 0);
            const m = fill.gradientTransform || fill.patternTransform;
            m && ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            ctx.fill();
            // 恢复原有上下文
            ctx.restore();
        }
        if (object) {
            ctx.save();
            if (needsVpt) {
                ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
            }
            // 渲染ImageClass实例的render方法
            object.render(ctx);
            ctx.restore();
        }
    },

    /**
     * 开始渲染当前canvas中所属所有元素
     * @param {*} ctx - canvas的上下文
     * @param {ObjectClass} objects - canvas所有元素对象 父类为ObjectClass
     */
    _renderObjects(ctx, objects) {
        let i; let len;
        for (i = 0, len = objects.length; i < len; ++i) {
            // 调用该对象所属的render方法
            objects[i] && objects[i].render(ctx);
        }
    },

    getRetinaScaling() {
        return devicePixelRatio;
    },

    _isRetinaScaling() {
        return (devicePixelRatio !== 1 && this.enableRetinaScaling);
    },

    _initRetinaScaling: function() {
        if (!this._isRetinaScaling()) {
          return;
        }

        this.__initRetinaScaling(devicePixelRatio, this.lowerCanvasEl, this.contextContainer);
        if (this.upperCanvasEl) {
          this.__initRetinaScaling(devicePixelRatio, this.upperCanvasEl, this.contextTop);
        }
    },

    // 放大再缩小
    __initRetinaScaling(scaleRatio, canvas, context) {
        canvas.setAttribute('width', this.width * scaleRatio);
        canvas.setAttribute('height', this.height * scaleRatio);
        context.scale(scaleRatio, scaleRatio);
    },
});

export default StaticCanvas;
