import canvasEvent from './mixins/canvas_events.mixin';
import canvasGrouping from './mixins/object_geometry.mixin';
import {createClass} from './util/lang_class';
import StaticCanvas from './static_canvas.class';
import CObject from './shapes/object.class';
import {wrapElement, setStyle, makeElementUnselectable, addClass} from '@util/dom_mics.js';
import {getPointer, isTouchEvent} from '@util/dom_event.js';
import {transformPoint, invertTransform, degreesToRadians, saveObjectTransform, drawDashedLine} from '@/util/misc.js';

const STROKE_OFFSET = 0.5

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

    // 
    centeredKey: 'altKey',

    // 设置为true的时候，会使用中心点作为缩放变换的起点
    centeredScaling: false,

    // 设置为true的时候，会使用中心点作为旋转变换的起点
    centeredRotation: false,

    // 是否允许选中整个组
    selection: true,

    // 默认的鼠标样式
    defaultCursor: 'default',

    // 设置鼠标悬浮时的样式
    hoverCursor: 'move',

    // selection的颜色
    selectionColor: 'rgba(100, 100, 255, 0.3)',

    // selection元素边框线的宽度
    selectionLineWidth: 1,

    // selection元素边框的颜色
    selectionBorderColor: 'rgba(255, 255, 255, 0.3)',

    // selection元素边框的dash
    selectionDashArray: [],

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
        let upperCanvasEl = this.upperCanvasEl;
  
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
    _applyCanvasStyle(element) {
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
        let activeTargetSubs;
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
        // 清空所选
        this._discardActiveObject(e);
        this._fireSelectionEvents(currentActives, e);
        return this;
    },
    
    /**
     * 根据老旧不同的选中数组 调用不同的canvas钩子事件
     * @param {Array} oldObjects 
     * @param {Event} e 
     */
    _fireSelectionEvents(oldObjects, e) {
        let somethingChanged = false;
        const objects = this.getActiveObjects();

        const added = [];
        const removed = [];
        const opt = { e: e };
        // 逐个调用元素的deselected事件 并添加至removed数组中
        oldObjects.forEach(function(oldObject) {
            if (objects.indexOf(oldObject) === -1) {
                somethingChanged = true;
                oldObject.fire('deselected', opt);
                removed.push(oldObject);
            }
        });
        // 遍历新的选中的 如果其同时存在于老的选中元素数组中 则调用元素的selected 并添加至add数组
        // 一般而言 应该是空的
        objects.forEach(function(object) {
            if (oldObjects.indexOf(object) === -1) {
                somethingChanged = true;
                object.fire('selected', opt);
                added.push(object);
            }
        });
        // 如果新旧所选都不为空 则触发canvas的updated事件
        if (oldObjects.length > 0 && objects.length > 0) {
            opt.selected = added;
            opt.deselected = removed;
            // added for backward compatibility
            opt.updated = added[0] || removed[0];
            opt.target = this._activeObject;
            somethingChanged && this.fire('selection:updated', opt);
        }
        // 如果旧为空 新的不为空  则触发canvas的created事件
        else if (objects.length > 0) {
            opt.selected = added;
            // added for backward compatibility
            opt.target = this._activeObject;
            this.fire('selection:created', opt);
        }
        // 如果新的为空 则触发canvas的clear事件
        else if (oldObjects.length > 0) {
            opt.deselected = removed;
            this.fire('selection:cleared', opt);
        }
      },

    /**
     * 丢弃之前的_activeObject
     * @param {Event} e 
     * @param {Object} object 
     */
    _discardActiveObject(e, object) {
        var obj = this._activeObject;
        if (obj) {
          // onDeselect return TRUE to cancel selection;
          if (obj.onDeselect({ e: e, object: object })) {
            return false;
          }
          this._activeObject = null;
        }
        return true;
    },

    /**
     * 设置当前object为当前canvas中唯一active object
     * @param {Object} object 
     * @param {Event} e 
     */
    setActiveObject(object, e) {
        const currentActives = this.getActiveObjects();
        this._setActiveObject(object, e);
        this._fireSelectionEvents(currentActives, e);
        return this;
    },

    /**
     * 设置当前的_activeObject 选中元素
     * @param {Object} object 
     * @param {Event} e 
     */
    _setActiveObject(object, e) {
        if (this._activeObject === object) {
          return false;
        }
        if (!this._discardActiveObject(e, object)) {
          return false;
        }
        if (object.onSelect({ e: e })) {
          return false;
        }
        this._activeObject = object;
        return true;
    },

    /**
     * 根据命中不同的控制边框的点 设置origin
     * @param {Object} target 
     * @param {String} corner 
     */
    _getOriginFromCorner(target, corner) {
        const origin = {
            x: target.originX,
            y: target.originY
        };
        // 选择的是左侧的点 会变更右边
        if (corner === 'ml' || corner === 'tl' || corner === 'bl') {
            origin.x = 'right';
        }
        else if (corner === 'mr' || corner === 'tr' || corner === 'br') {
            origin.x = 'left';
        }
    
        if (corner === 'tl' || corner === 'mt' || corner === 'tr') {
            origin.y = 'bottom';
        }
        else if (corner === 'bl' || corner === 'mb' || corner === 'br') {
            origin.y = 'top';
        }
        else if (corner === 'mtr') {
            origin.x = 'center';
            origin.y = 'center';
        }
        return origin;
    },

    /**
     * 获取控制边框的actionName 一般为scale
     * @param {Object} alreadySelected 
     * @param {ControlClass} corner 
     * @param {Event} e 
     * @param {*} target 
     */
    _getActionFromCorner(alreadySelected, corner, e, target) {
        if (!corner || !alreadySelected) {
          return 'drag';
        }
        const control = target.controls[corner];
        return control.getActionName(e, control, target);
    },

    // 重新设置当前的transform
    _setupCurrentTransform(e, target, alreadySelected) {
        if (!target) {
            return;
        }

        const pointer = this.getPointer(e);
        const corner = target.__corner;
        const actionHandler = !!corner && target.controls[corner].getActionHandler();
        const action = this._getActionFromCorner(alreadySelected, corner, e, target);
        const origin = this._getOriginFromCorner(target, corner);
        const altKey = e[this.centeredKey];
        const transform = {
            target,
            action,
            actionHandler,
            corner,
            scaleX: target.scaleX,
            scaleY: target.scaleY,
            skewX: target.skewX,
            skewY: target.skewY,
            // used by transation
            offsetX: pointer.x - target.left,
            offsetY: pointer.y - target.top,
            originX: origin.x,
            originY: origin.y,
            ex: pointer.x,
            ey: pointer.y,
            lastX: pointer.x,
            lastY: pointer.y,
            // unsure they are useful anymore.
            // left: target.left,
            // top: target.top,
            theta: degreesToRadians(target.angle),
            // end of unsure
            width: target.width * target.scaleX,
            shiftKey: e.shiftKey,
            altKey: altKey,
            original: saveObjectTransform(target),
        }
        // TODO 明日复明日

        if (this._shouldCenterTransform(target, action, altKey)) {
            transform.originX = 'center';
            transform.originY = 'center';
        }
        transform.original.originX = origin.x;
        transform.original.originY = origin.y;
        this._currentTransform = transform;
        this._beforeTransform(e);
    },

    /**
     * 元素的centeredScaling不能覆盖canvas的centeredScaling
     * 该方法主要判断是否是从中心点开始变换
     * @param {Object} target 
     * @param {*} action 
     * @param {*} altKey 
     */
    _shouldCenterTransform: function (target, action, altKey) {
        if (!target) {
          return;
        }
  
        let centerTransform;
  
        if (action === 'scale' || action === 'scaleX' || action === 'scaleY') {
          centerTransform = this.centeredScaling || target.centeredScaling;
        }
        else if (action === 'rotate') {
          centerTransform = this.centeredRotation || target.centeredRotation;
        }
  
        return centerTransform ? !altKey : altKey;
    },

    /**
     * 设置canvas的鼠标样式
     * @param {String} value 
     */
    setCursor(value) {
        this.upperCanvasEl.style.cursor = value;
    },

    /**
     * 只渲染top的canvas
     * 也用来渲染选中group的边框
     */
    renderTop() {
        const ctx = this.contextTop;
        this.clearContext(ctx);
        this.renderTopLayer(ctx);
        this.fire('after:render');
        return this;
    },

    renderTopLayer(ctx) {
        ctx.save();
        // 类似画板功能 后续再做
        if (this.isDrawingMode && this._isCurrentlyDrawing) {
            this.freeDrawingBrush && this.freeDrawingBrush._render();
            this.contextTopDirty = true;
        }
        // we render the top context - last object
        if (this.selection && this._groupSelector) {
            this._drawSelection(ctx);
            this.contextTopDirty = true;
        }
        ctx.restore();
    },

    // 绘制选择的元素边框
    _drawSelection: function (ctx) {
        const groupSelector = this._groupSelector;
        const left = groupSelector.left;
        const top = groupSelector.top;
        const aleft = Math.abs(left);
        const atop = Math.abs(top);
  
        if (this.selectionColor) {
            ctx.fillStyle = this.selectionColor;
  
            ctx.fillRect(
                groupSelector.ex - ((left > 0) ? 0 : -left),
                groupSelector.ey - ((top > 0) ? 0 : -top),
                aleft,
                atop
            );
        }
  
        if (!this.selectionLineWidth || !this.selectionBorderColor) {
          return;
        }
        ctx.lineWidth = this.selectionLineWidth;
        ctx.strokeStyle = this.selectionBorderColor;
  
        // selection border
        if (this.selectionDashArray.length > 1 && !supportLineDash) {
  
            const px = groupSelector.ex + STROKE_OFFSET - ((left > 0) ? 0 : aleft);
            const py = groupSelector.ey + STROKE_OFFSET - ((top > 0) ? 0 : atop);
  
            ctx.beginPath();
  
            drawDashedLine(ctx, px, py, px + aleft, py, this.selectionDashArray);
            drawDashedLine(ctx, px, py + atop - 1, px + aleft, py + atop - 1, this.selectionDashArray);
            drawDashedLine(ctx, px, py, px, py + atop, this.selectionDashArray);
            drawDashedLine(ctx, px + aleft - 1, py, px + aleft - 1, py + atop, this.selectionDashArray);
  
            ctx.closePath();
            ctx.stroke();
        }
        else {
            CObject.prototype._setLineDash.call(this, ctx, this.selectionDashArray);
            ctx.strokeRect(
                groupSelector.ex + STROKE_OFFSET - ((left > 0) ? 0 : aleft),
                groupSelector.ey + STROKE_OFFSET - ((top > 0) ? 0 : atop),
                aleft,
                atop
            );
        }
    },

    /**
     * translate 元素
     * @param {Number} x 
     * @param {Number} y 
     */
    _translateObject: function (x, y) {
        const transform = this._currentTransform;
        const target = transform.target;
        const newLeft = x - transform.offsetX;
        const newTop = y - transform.offsetY;
        // 部分元素可能是被锁定不可移动
        const moveX = !target.get('lockMovementX') && target.left !== newLeft;
        const moveY = !target.get('lockMovementY') && target.top !== newTop;
  
        moveX && (target.left = newLeft);
        moveY && (target.top = newTop);
        return moveX || moveY;
    },

    ...canvasEvent,
    ...canvasGrouping
});

export default CanvasClass;