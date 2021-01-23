import canvasEvent from './mixins/canvas_events.mixin';
import {createClass} from './util/lang_class';
import StaticCanvas from './static_canvas.class';
import {wrapElement, setStyle, makeElementUnselectable, addClass} from '@util/dom_mics.js';
import {getPointer} from '@util/dom_event.js';
import {transformPoint, invertTransform} from '@/util/misc.js';

/**
 * contextTop - _createUpperCanvas 顶部canvas的context
 */
const CanvasClass = createClass(StaticCanvas, {

    /**
     * 声明当前canvas为可交互
     */
    interactive: true
}, {

    _currentTransform: null,

    // 已选择对象
    _activeObject: null,

    initialize(options, el) {
        // 在static父类里
        this._initStatic(options, el)
        // 初始化一堆 事件 PencilBrush 外部div 顶部canvas
        this._initInteractive();
    },

    _initInteractive: function() {
        this._currentTransform = null;
        this._groupSelector = null;
        // 包裹一层div 设置不可选中状态
        this._initWrapperElement();
        // 在上面一层div内部创建新的canvas 并拷贝样式 class 设置宽高
        this._createUpperCanvas();
        // 定义在后续的canvas_events.mixin.js  创建并绑定相关事件
        this._initEventListeners();
        // 高清屏时的问题。devicePixelRatio不为1
        this._initRetinaScaling();
        // 创建PencilBrush对象
        this.freeDrawingBrush = fabric.PencilBrush && new fabric.PencilBrush(this);
        // 计算canvas 相较于canvas偏移量是多少
        this.calcOffset();
    },

    _initWrapperElement: function () {
        // 外层包裹div
        this.wrapperEl = wrapElement(this.lowerCanvasEl, 'div', {
          'class': this.containerClass
        });
        setStyle(this.wrapperEl, {
          width: this.width + 'px',
          height: this.height + 'px',
          position: 'relative'
        });
        makeElementUnselectable(this.wrapperEl);
    },

    _createUpperCanvas: function () {
        const lowerCanvasClass = this.lowerCanvasEl.className.replace(/\s*lower-canvas\s*/, '')
        const lowerCanvasEl = this.lowerCanvasEl
        const upperCanvasEl = this.upperCanvasEl;
  
        // there is no need to create a new upperCanvas element if we have already one.
        if (upperCanvasEl) {
          upperCanvasEl.className = '';
        }
        else {
          upperCanvasEl = this._createCanvasElement();
          this.upperCanvasEl = upperCanvasEl;
        }
        addClass(upperCanvasEl, 'upper-canvas ' + lowerCanvasClass);
  
        this.wrapperEl.appendChild(upperCanvasEl);
  
        this._copyCanvasStyle(lowerCanvasEl, upperCanvasEl);
        // 设置upperCanvas长宽
        this._applyCanvasStyle(upperCanvasEl);
        this.contextTop = upperCanvasEl.getContext('2d');
    },

    /**
     * 将from对象内联样式完整拷贝到to对象
     * @param {Element} fromEl 
     * @param {Element} toEl 
     */
    _copyCanvasStyle: function(fromEl, toEl) {
        toEl.style.cssText = fromEl.style.cssText;
    },

    /**
     * 设置canvas的样式
     * @param {Element} element 
     */
    _applyCanvasStyle: function (element) {
        let width = this.width || element.width,
            height = this.height || element.height;
  
        setStyle(element, {
          position: 'absolute',
          width: width + 'px',
          height: height + 'px',
          left: 0,
          top: 0,
          'touch-action': this.allowTouchScrolling ? 'manipulation' : 'none',
          '-ms-touch-action': this.allowTouchScrolling ? 'manipulation' : 'none'
        });
        element.width = width;
        element.height = height;
        makeElementUnselectable(element);
    },

    /**
     * 绘制当前活动元素的控制线
     * @param {*} ctx - canvas上下文
     */
    drawControls(ctx) {
        const activeObject = this._activeObject;

        if (activeObject) {
            activeObject._renderControls(ctx);
        }
    },

    /**
     * 返回点在canvas中的真实坐标
     * 可返回是否在viewportTransform作用下的坐标
     * ignoreZoom是false时返回鼠标在canvas点击的位置，空间坐标，图形坐标也是相同的
     * ignoreZoom是true时返回的是返回的是鼠标点击实际位于canvas的物理像素 x y
     * 要与图形左侧或顶部交互时经常使用ignoreZoom=true,
     * ignoreZoom=false是提供与object.oCoords兼容的坐标
     * @param {Event} e 
     * @param {Boolean} ignoreZoom 
     */
    getPointer: function (e, ignoreZoom) {
        // 如果在事件链进程中，返回缓存中的数据
        if (this._absolutePointer && !ignoreZoom) {
          return this._absolutePointer;
        }
        if (this._pointer && ignoreZoom) {
          return this._pointer;
        }
  
        const upperCanvasEl = this.upperCanvasEl,
            // getBoundingClientRect返回的该元素是与相对视口的位置距离 即不是加上滚动轴的 
            // 宽高啥的都是会被css影响的 计算scale后的
            bounds = upperCanvasEl.getBoundingClientRect()
        let boundsWidth = bounds.width || 0,
            boundsHeight = bounds.height || 0
        // 这个方法是返回鼠标点击的绝对位置 即加上滚动轴
        let pointer = getPointer(e),
            cssScale;
  
        // 只要宽高任何为0 即使用top-bottom 和 right-left 重新计算
        if (!boundsWidth || !boundsHeight ) {
            if ('top' in bounds && 'bottom' in bounds) {
                boundsHeight = Math.abs( bounds.top - bounds.bottom );
            }
            if ('right' in bounds && 'left' in bounds) {
                boundsWidth = Math.abs( bounds.right - bounds.left );
            }
        }
        // 计算lowerCanvasEl距离浏览器左侧和顶部距离到_offset属性中
        this.calcOffset();
        // 获得鼠标点击位置距离lowerCanvasEl的content的top和left
        pointer.x = pointer.x - this._offset.left;
        pointer.y = pointer.y - this._offset.top;

        if (!ignoreZoom) {
            pointer = this.restorePointerVpt(pointer);
        }
        //  获取屏幕物理分辨率和css分辨率的比率
        const retinaScaling = this.getRetinaScaling();
        if (retinaScaling !== 1) {
            pointer.x /= retinaScaling;
            pointer.y /= retinaScaling;
        }
  
        // 检测是否存在css缩放
        if (boundsWidth === 0 || boundsHeight === 0) {
            // If bounds are not available (i.e. not visible), do not apply scale.
            cssScale = { width: 1, height: 1 };
        }
        else {
            cssScale = {
                width: upperCanvasEl.width / boundsWidth,
                height: upperCanvasEl.height / boundsHeight
            };
        }
        // 一通操作  返回的是鼠标点击实际位于canvas的物理像素 x y
        return {
            x: pointer.x * cssScale.width,
            y: pointer.y * cssScale.height
        };
    },

    restorePointerVpt: function(pointer) {
        return transformPoint(
          pointer,
          invertTransform(this.viewportTransform)
        );
    },

    /**
     * 返回已选择的对象数组
     */
    getActiveObjects() {
        const active = this._activeObject;
        if (active) {
            if (active.type === 'activeSelection' && active._objects) {
                return active._objects.slice(0);
            }
            else {
                return [active];
            }
        }
        return [];
    },

    /**
     * 在一堆对象中或者正在绘制的canvas中 检查一个点坐标在对象内部
     * @param {Array} objects 
     * @param {Object} pointer 想要检查的点坐标
     */
    _searchPossibleTargets: function(objects, pointer) {
        // Cache all targets where their bounding box contains point.
        // 缓存所有边框包含点的对象
        let target
        let i = objects.length;
        let subTarget;
        // Do not check for currently grouped objects, since we check the parent group itself.
        // 检查完parent group以后就不检查当前group。（一般而言parent group覆盖范围更大）
        // until we call this function specifically to search inside the activeGroup
        // 除非调用这个方法检查点是否在当前选中目标中
        while (i--) {
            const objToCheck = objects[i];
            const pointerToUse = objToCheck.group && objToCheck.group.type !== 'activeSelection' ?
                // TODO 明日复明日 不是已选目标对象的数组group
                this._normalizePointer(objToCheck.group, pointer) : pointer;
            if (this._checkTarget(pointerToUse, objToCheck, pointer)) {
                target = objects[i];
                if (target.subTargetCheck && target instanceof fabric.Group) {
                    subTarget = this._searchPossibleTargets(target._objects, pointer);
                    subTarget && this.targets.push(subTarget);
                }
                break;
            }
        }
        return target;
    },

    findTarget(e, skipGroup) {
        const ignoreZoom = true;
        // 获取点的实际canvas内坐标
        const pointer = this.getPointer(e, ignoreZoom);
        const activeObject = this._activeObject;
        // 返回已选择的对象数组
        const aObjects = this.getActiveObjects();
        let activeTarget;
        let activeTargetSubs,
        const isTouch = isTouchEvent(e);

        // 首先检查 当前group。active group不像是一般的group一样检查子元素
        this.targets = [];

        if (aObjects.length > 1 && !skipGroup && activeObject === this._searchPossibleTargets([activeObject], pointer)) {
            return activeObject;
        }
    },

    ...canvasEvent
});

export default CanvasClass;