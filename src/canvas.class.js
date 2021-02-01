import canvasEvent from './mixins/canvas_events.mixin';
import canvasGrouping from './mixins/object_geometry.mixin';
import {createClass} from './util/lang_class';
import StaticCanvas from './static_canvas.class';
import {wrapElement, setStyle, makeElementUnselectable, addClass} from '@util/dom_mics.js';
import {getPointer, isTouchEvent} from '@util/dom_event.js';
import {transformPoint, invertTransform} from '@/util/misc.js';

/**
 * contextTop - _createUpperCanvas 顶部canvas的context
 */
const CanvasClass = createClass(StaticCanvas, {

    /**
     * 声明当前canvas为可交互
     */
    interactive: true,

    // 当元素被选中时是否保持当前层级
    // 当属性为false时，该元素会被渲染到顶层，且成为被选中元素
    preserveObjectStacking: false
}, {

    _currentTransform: null,

    // 已选择对象
    _activeObject: null,

    altSelectionKey: null,

    // 是否有右击事件
    fireRightClick: false,

    // 是否有middle鼠标事件
    fireMiddleClick: false,

    // 设置为true是 鼠标点击后会开始绘制线段，直到鼠标松开
    isDrawingMode: false,

    // 当前鼠标点击位置
    _pointer: null,

    // 记录上一次点击位置
    _previousPointer: null,

    // 当前canvas中选中的对象
    _target: null,

    // 决定哪个按键是可以多选点击，即按住后点击开始进行多选
    selectionKey: 'shiftKey',

    // 是否允许选中整个组
    selection: true,

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
        // 获得鼠标点击位置距离lowerCanvasEl的content的top和left 减去后就是计算在canvas的坐标
        pointer.x = pointer.x - this._offset.left;
        pointer.y = pointer.y - this._offset.top;

        if (!ignoreZoom) {
            // 恢复在整个canvas变换前的坐标
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

    // 将点的位置恢复至 整个图形变换前的坐标 即乘以图形transform的逆矩阵
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

    // 将点的坐标先乘以canvas的逆矩阵、再乘以对象的逆矩阵 获得原始的位置坐标
    _normalizePointer (object, pointer) {
        // 这个是计算对象的 transform
        const m = object.calcTransformMatrix(),
            // 将对象的transform求了一波逆矩阵
            invertedM = invertTransform(m),
            // 将恢复整个因整个canvas 的transform导致的point左边变换 即乘整个canvas的的逆矩阵
            vptPointer = this.restorePointerVpt(pointer);
        return transformPoint(vptPointer, invertedM);
    },

    /**
     * 判断某个点是否在元素中
     * @param {Object} pointer 想要检查的点的 x 和 y的坐标
     * @param {*} obj 要检查的元素对象
     * @param {*} globalPointer 
     */
    _checkTarget: function(pointer, obj, globalPointer) {
        if (obj &&
            obj.visible &&
            obj.evented &&
            this.containsPoint(null, obj, pointer)) {
          if ((this.perPixelTargetFind || obj.perPixelTargetFind) && !obj.isEditing) {
            var isTransparent = this.isTargetTransparent(obj, globalPointer.x, globalPointer.y);
            if (!isTransparent) {
              return true;
            }
          }
          else {
            return true;
          }
        }
    },

    /**
     * 检查一个point是否被一个元素区域内包含
     * @param {Event} e 事件对象
     * @param {Object} target 即被测试的元素对象
     * @param {Object} point 要检查的点的坐标
     */
    containsPoint: function (e, target, point) {
        const ignoreZoom = true;
        // 如果传入的是事件  则先获取事件中点的x y坐标
        const pointer = point || this.getPointer(e, ignoreZoom);
        let xy;
        const isTouch = e ? isTouchEvent(e) : false;
  
        // 如果当前是要检查的目标区域是当前已选中的活跃对象组， 乘以对象和canvas的逆矩阵获取原始坐标
        if (target.group && target.group === this._activeObject && target.group.type === 'activeSelection') {
          xy = this._normalizePointer(target.group, pointer);
        }
        else {
          xy = { x: pointer.x, y: pointer.y };
        }
        // 都™打不开。。。
        // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
        // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html
        return (target.containsPoint(xy) || !!target._findTargetCorner(pointer, isTouch));
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
                // 不是已选目标对象的数组group
                this._normalizePointer(objToCheck.group, pointer) : pointer;
            //TODO 明日复明日
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

    /**
     * 判断哪个元素是被选中的
     * @param {Event} e 
     * @param {Boolean} skipGroup 当其为true时，活跃组activeGroup 将被跳过，只有
     */
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

        // 检查是否点中的是已选中的元素区域
        if (aObjects.length > 1 && !skipGroup && activeObject === this._searchPossibleTargets([activeObject], pointer)) {
            return activeObject;
        }
        // 已选只有一个 检查是否点中的是已选中的控制框
        if (aObjects.length === 1 && activeObject._findTargetCorner(pointer, isTouch)) {
            return activeObject;
        }

        // 已选只有一个 点击是在活跃元素区域
        if (aObjects.length === 1 &&
            activeObject === this._searchPossibleTargets([activeObject], pointer)) {
            if (!this.preserveObjectStacking) {
              return activeObject;
            }
            else {
              activeTarget = activeObject;
              activeTargetSubs = this.targets;
              this.targets = [];
            }
        }

        let target = this._searchPossibleTargets(this._objects, pointer);
        if (e[this.altSelectionKey] && target && activeTarget && target !== activeTarget) {
            target = activeTarget;
            this.targets = activeTargetSubs;
        }
        return target;
    },

    /**
     * 检查是否是透明的元素
     * @param {Object} target 目标对象
     * @param {*} x left坐标
     * @param {*} y top坐标
     */
    isTargetTransparent(target, x, y) {
        if (target.shouldCache() && target._cacheCanvas && target !== this._activeObject) {
            var normalizedPointer = this._normalizePointer(target, {x: x, y: y}),
                targetRelativeX = Math.max(target.cacheTranslationX + (normalizedPointer.x * target.zoomX), 0),
                targetRelativeY = Math.max(target.cacheTranslationY + (normalizedPointer.y * target.zoomY), 0);
    
            var isTransparent = fabric.util.isTransparent(
              target._cacheContext, Math.round(targetRelativeX), Math.round(targetRelativeY), this.targetFindTolerance);
    
            return isTransparent;
        }
    
        var ctx = this.contextCache,
            originalColor = target.selectionBackgroundColor, v = this.viewportTransform;

        target.selectionBackgroundColor = '';

        this.clearContext(ctx);
    
        ctx.save();
        ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
        target.render(ctx);
        ctx.restore();

        target === this._activeObject && target._renderControls(ctx, {
        hasBorders: false,
        transparentCorners: false
        }, {
        hasBorders: false,
        });

        target.selectionBackgroundColor = originalColor;

        var isTransparent = fabric.util.isTransparent(
        ctx, x, y, this.targetFindTolerance);

        return isTransparent;
    },

    _normalizePointer (object, pointer) {
        var m = object.calcTransformMatrix(),
            invertedM = fabric.util.invertTransform(m),
            vptPointer = this.restorePointerVpt(pointer);
        return transformPoint(vptPointer, invertedM);
    },

    /**
     * 检测当前事件触发时 有没有按多选按键 一般是shift键
     * @param {Event} e 
     */
    _isSelectionKeyPressed(e) {
        const selectionKeyPressed = false;

        if (Array.isArray(this.selectionKey)) {
            selectionKeyPressed = !!this.selectionKey.find(key => e[key] === true);
        }
        else {
            selectionKeyPressed = e[this.selectionKey];
        }

        return selectionKeyPressed;
    },

    /**
     * 是否需要清空当前所选元素
     * @param {Event} e 
     * @param {Object} target 
     */
    _shouldClearSelection(e, target) {
        const activeObjects = this.getActiveObjects(),
        activeObject = this._activeObject;

        return (
        !target
        ||
        (target &&
            activeObject &&
            activeObjects.length > 1 &&
            activeObjects.indexOf(target) === -1 &&
            activeObject !== target &&
            !this._isSelectionKeyPressed(e))
        ||
        (target && !target.evented)
        ||
        (target &&
            !target.selectable &&
            activeObject &&
            activeObject !== target)
        );
    },

    /**
     * 返回当前活跃元素
     */
    getActiveObject: function () {
        return this._activeObject;
    },

    /**
     * 清空当前所选元素 并触发相关钩子函数
     * 如果事件是由鼠标事件触发 则将鼠标事件e作为参数传递给自定义fire函数。
     * 若直接作为方法调用，e没啥乱用
     * @param {Event} e 
     */
    discardActiveObject(e) {
        const currentActives = this.getActiveObjects()
        const activeObject = this.getActiveObject();
        if (currentActives.length) {
            this.fire('before:selection:cleared', { target: activeObject, e: e });
        }
        // TODO 明日复明日
        this._discardActiveObject(e);
        this._fireSelectionEvents(currentActives, e);
        return this;
    },

    ...canvasEvent,
    ...canvasGrouping
});

export default CanvasClass;