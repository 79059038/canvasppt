import {removeListener} from '../util/dom_event.js'

// 事件监听passive为true表示监听内部不会调用preventDefault。浏览器默认touch相关
// 为true，防止因为进入监听事件导致滚动轴滚动不可用
const addEventOptions = {passive: false}

export default {
    /**
     * 给canvas添加鼠标事件
     */
    _initEventListeners() {
        this.removeListeners();
        this._bindEvents();
        this.addOrRemove(addListener, 'add');
    },

    /**
     * 删除所有的事件监听
     */
    removeListeners() {
        // 删除事件监听
        this.addOrRemove(removeListener, 'remove');
        // if you dispose on a mouseDown, before mouse up, you need to clean document to...
        var eventTypePrefix = this._getEventPrefix();
        removeListener(document, eventTypePrefix + 'up', this._onMouseUp);
        removeListener(document, 'touchend', this._onTouchEnd, addEventOptions);
        removeListener(document, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        removeListener(document, 'touchmove', this._onMouseMove, addEventOptions);
    },

    /**
     * fabric 支持pointer和mouse  这里只支持mouse吧
     */
    _getEventPrefix() {
        return 'mouse'
    },

    /**
     * 给dom添加或者删除事件监听调用的公共方法
     * @param {Function} functor 
     */
    addOrRemove: function(functor) {
        // 
        const canvasElement = this.upperCanvasEl,
            eventTypePrefix = this._getEventPrefix();
        functor(window, 'resize', this._onResize);
        functor(canvasElement, eventTypePrefix + 'down', this._onMouseDown);
        functor(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        functor(canvasElement, eventTypePrefix + 'out', this._onMouseOut);
        functor(canvasElement, eventTypePrefix + 'enter', this._onMouseEnter);
        functor(canvasElement, 'wheel', this._onMouseWheel);
        functor(canvasElement, 'contextmenu', this._onContextMenu);
        functor(canvasElement, 'dblclick', this._onDoubleClick);
        functor(canvasElement, 'dragover', this._onDragOver);
        functor(canvasElement, 'dragenter', this._onDragEnter);
        functor(canvasElement, 'dragleave', this._onDragLeave);
        functor(canvasElement, 'drop', this._onDrop);
    },

    _bindEvents: function() {
        if (this.eventsBound) {
          // 防止事件监听绑定两次
          return;
        }
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onGesture = this._onGesture.bind(this);
        this._onDrag = this._onDrag.bind(this);
        this._onShake = this._onShake.bind(this);
        this._onLongPress = this._onLongPress.bind(this);
        this._onOrientationChange = this._onOrientationChange.bind(this);
        this._onMouseWheel = this._onMouseWheel.bind(this);
        this._onMouseOut = this._onMouseOut.bind(this);
        this._onMouseEnter = this._onMouseEnter.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onDoubleClick = this._onDoubleClick.bind(this);
        this._onDragOver = this._onDragOver.bind(this);
        this._onDragEnter = this._simpleEventHandler.bind(this, 'dragenter');
        this._onDragLeave = this._simpleEventHandler.bind(this, 'dragleave');
        this._onDrop = this._simpleEventHandler.bind(this, 'drop');
        this.eventsBound = true;
    },

    /**
     * mousedown 事件监听回调方法
     * @param {Event} e 
     */
    _onMouseDown: function (e) {
        this.__onMouseDown(e);
        this._resetTransformEventData();
        var canvasElement = this.upperCanvasEl,
            eventTypePrefix = this._getEventPrefix();
        removeListener(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        addListener(fabric.document, eventTypePrefix + 'up', this._onMouseUp);
        addListener(fabric.document, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
    },

    /**
     * 方法定义了在鼠标点击canvas后的行为
     * 这方法初始化了currentTransform，渲染所有canvas然后当前图像放置在顶部canvas
     * @param {Event} e 
     */
    __onMouseDown: function (e) {
        this._cacheTransformEventData(e);
        this._handleEvent(e, 'down:before');
        var target = this._target;
        // if right click just fire events
        if (checkClick(e, RIGHT_CLICK)) {
          if (this.fireRightClick) {
            this._handleEvent(e, 'down', RIGHT_CLICK);
          }
          return;
        }
  
        if (checkClick(e, MIDDLE_CLICK)) {
          if (this.fireMiddleClick) {
            this._handleEvent(e, 'down', MIDDLE_CLICK);
          }
          return;
        }
  
        if (this.isDrawingMode) {
          this._onMouseDownInDrawingMode(e);
          return;
        }
  
        if (!this._isMainEvent(e)) {
          return;
        }
  
        // ignore if some object is being transformed at this moment
        if (this._currentTransform) {
          return;
        }
  
        var pointer = this._pointer;
        // save pointer for check in __onMouseUp event
        this._previousPointer = pointer;
        var shouldRender = this._shouldRender(target),
            shouldGroup = this._shouldGroup(e, target);
        if (this._shouldClearSelection(e, target)) {
          this.discardActiveObject(e);
        }
        else if (shouldGroup) {
          this._handleGrouping(e, target);
          target = this._activeObject;
        }
  
        if (this.selection && (!target ||
          (!target.selectable && !target.isEditing && target !== this._activeObject))) {
          this._groupSelector = {
            ex: pointer.x,
            ey: pointer.y,
            top: 0,
            left: 0
          };
        }
  
        if (target) {
          var alreadySelected = target === this._activeObject;
          if (target.selectable) {
            this.setActiveObject(target, e);
          }
          var corner = target._findTargetCorner(
            this.getPointer(e, true),
            fabric.util.isTouchEvent(e)
          );
          target.__corner = corner;
          if (target === this._activeObject && (corner || !shouldGroup)) {
            var control = target.controls[corner],
                mouseDownHandler = control && control.getMouseDownHandler(e, target, control);
            if (mouseDownHandler) {
              mouseDownHandler(e, target, control);
            }
            this._setupCurrentTransform(e, target, alreadySelected);
          }
        }
        this._handleEvent(e, 'down');
        // we must renderAll so that we update the visuals
        (shouldRender || shouldGroup) && this.requestRenderAll();
    },

    /**
     * 在事件期间缓存一般信息
     * @param {Event} e 
     */
    _cacheTransformEventData: function(e) {
        // 首先重置，防止缓存旧数据
        this._resetTransformEventData();
        // 计算位置。主要是优化包括是否当前有缩放devicePixelRatio   鼠标位置减去canvas位置确定canvas实际坐标
        this._pointer = this.getPointer(e, true);
        // 计算没有视图影响下的位置（应该是计算旋转什么鬼位置）
        this._absolutePointer = this.restorePointerVpt(this._pointer);
        // 返回一个fabric对象 点击的是哪个fabric
        this._target = this._currentTransform ? this._currentTransform.target : this.findTarget(e) || null;
    },

    /**
     * 事件期间重置缓存信息
     */
    _resetTransformEventData: function() {
        this._target = null;
        this._pointer = null;
        this._absolutePointer = null;
    },
}