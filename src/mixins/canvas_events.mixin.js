import {removeListener} from '../util/dom_event.js'
import {isTouchEvent} from '../util/dom_event'

// 事件监听passive为true表示监听内部不会调用preventDefault。浏览器默认touch相关
// 为true，防止因为进入监听事件导致滚动轴滚动不可用
const addEventOptions = {passive: false}


const RIGHT_CLICK = 3
const MIDDLE_CLICK = 2
const LEFT_CLICK = 1
const addEventOptions = { passive: false };

function checkClick(e, value) {
  return e.button && (e.button === value - 1);
}

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
        // functor(window, 'resize', this._onResize);
        functor(canvasElement, eventTypePrefix + 'down', this._onMouseDown);
        functor(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        // functor(canvasElement, eventTypePrefix + 'out', this._onMouseOut);
        // functor(canvasElement, eventTypePrefix + 'enter', this._onMouseEnter);
        // functor(canvasElement, 'wheel', this._onMouseWheel);
        // functor(canvasElement, 'contextmenu', this._onContextMenu);
        // functor(canvasElement, 'dblclick', this._onDoubleClick);
        // functor(canvasElement, 'dragover', this._onDragOver);
        // functor(canvasElement, 'dragenter', this._onDragEnter);
        // functor(canvasElement, 'dragleave', this._onDragLeave);
        // functor(canvasElement, 'drop', this._onDrop);
    },

    _bindEvents: function() {
        if (this.eventsBound) {
          // 防止事件监听绑定两次
          return;
        }
        this._onMouseDown = this._onMouseDown.bind(this);
        // this._onTouchStart = this._onTouchStart.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        // this._onTouchEnd = this._onTouchEnd.bind(this);
        // this._onResize = this._onResize.bind(this);
        // this._onGesture = this._onGesture.bind(this);
        // this._onDrag = this._onDrag.bind(this);
        // this._onShake = this._onShake.bind(this);
        // this._onLongPress = this._onLongPress.bind(this);
        // this._onOrientationChange = this._onOrientationChange.bind(this);
        // this._onMouseWheel = this._onMouseWheel.bind(this);
        // this._onMouseOut = this._onMouseOut.bind(this);
        // this._onMouseEnter = this._onMouseEnter.bind(this);
        // this._onContextMenu = this._onContextMenu.bind(this);
        // this._onDoubleClick = this._onDoubleClick.bind(this);
        // this._onDragOver = this._onDragOver.bind(this);
        // this._onDragEnter = this._simpleEventHandler.bind(this, 'dragenter');
        // this._onDragLeave = this._simpleEventHandler.bind(this, 'dragleave');
        // this._onDrop = this._simpleEventHandler.bind(this, 'drop');
        this.eventsBound = true;
    },

    /**
     * mousedown 事件监听回调方法
     * @param {Event} e 
     */
    _onMouseDown: function (e) {
        this.__onMouseDown(e);
        // 重置缓存信息
        this._resetTransformEventData();
        const canvasElement = this.upperCanvasEl,
            eventTypePrefix = this._getEventPrefix();
        removeListener(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        addListener(document, eventTypePrefix + 'up', this._onMouseUp);
        addListener(document, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
    },

    /**
     * mouseup 事件监听回调方法
     * @param {Event} e 
     */
    _onMouseUp(e) {
        this.__onMouseUp(e);
        this._resetTransformEventData();
        const canvasElement = this.upperCanvasEl;
        const eventTypePrefix = this._getEventPrefix();
        if (this._isMainEvent(e)) {
            removeListener(document, eventTypePrefix + 'up', this._onMouseUp);
            removeListener(document, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
            addListener(canvasElement, eventTypePrefix + 'move', this._onMouseMove, addEventOptions);
        }
    },

    /**
     * mousemove 事件监听方法
     * @param {*} e 
     */
    _onMouseMove(e) {
        !this.allowTouchScrolling && e.preventDefault && e.preventDefault();
        this.__onMouseMove(e);
    },

    /**
     * mousemove 事件执行方法
     * @param {Event} e 
     */
    __onMouseMove(e) {
        this._handleEvent(e, 'move:before');
        this._cacheTransformEventData(e);
        let target;
        let pointer;
  
        if (this.isDrawingMode) {
          this._onMouseMoveInDrawingMode(e);
          return;
        }
  
        if (!this._isMainEvent(e)) {
          return;
        }
  
        const groupSelector = this._groupSelector;
  
        // We initially clicked in an empty area, so we draw a box for multiple selection
        if (groupSelector) {
          pointer = this._pointer;
  
          groupSelector.left = pointer.x - groupSelector.ex;
          groupSelector.top = pointer.y - groupSelector.ey;
  
          this.renderTop();
        }
        else if (!this._currentTransform) {
          target = this.findTarget(e) || null;
          this._setCursorFromEvent(e, target);
          this._fireOverOutEvents(target, e);
        }
        else {
          this._transformObject(e);
        }
        this._handleEvent(e, 'move');
        this._resetTransformEventData();
    },

    // 在mousemove时触发的事件
    _transformObject(e) {
        const pointer = this.getPointer(e),
        const transform = this._currentTransform;

        transform.reset = false;
        transform.target.isMoving = true;
        transform.shiftKey = e.shiftKey;
        transform.altKey = e[this.centeredKey];

        this._performTransformAction(e, transform, pointer);
        transform.actionPerformed && this.requestRenderAll();
    },

    // 执行变化动作
    _performTransformAction: function(e, transform, pointer) {
        const x = pointer.x;
        const y = pointer.y;
        const action = transform.action;
        let actionPerformed = false;
        // this object could be created from the function in the control handlers
        const options = {
            target: transform.target,
            e,
            transform,
            pointer
        };
  
        if (action === 'drag') {
            actionPerformed = this._translateObject(x, y);
            if (actionPerformed) {
                this._fire('moving', options);
                this.setCursor(options.target.moveCursor || this.moveCursor);
            }
        }
        else {
            (actionPerformed = transform.actionHandler(e, transform, x, y)) && this._fire(action, options);
        }
        transform.actionPerformed = transform.actionPerformed || actionPerformed;
    },

    /**
     * 触发target 和 _hoveredTargets的mouseout 和mouse over事件
     */
    _fireOverOutEvents(target, e) {
        const _hoveredTarget = this._hoveredTarget;
        const _hoveredTargets = this._hoveredTargets
        const targets = this.targets,
        const length = Math.max(_hoveredTargets.length, targets.length);
        this.fireSyntheticInOutEvents(target, e, {
          oldTarget: _hoveredTarget,
          evtOut: 'mouseout',
          canvasEvtOut: 'mouse:out',
          evtIn: 'mouseover',
          canvasEvtIn: 'mouse:over',
        });
        for (let i = 0; i < length; i++){
            this.fireSyntheticInOutEvents(targets[i], e, {
                oldTarget: _hoveredTargets[i],
                evtOut: 'mouseout',
                evtIn: 'mouseover',
            });
        }
        this._hoveredTarget = target;
        this._hoveredTargets = this.targets.concat();
    },

    /**
     * 管理合并(Synthetic)canvas上的元素事件
     * @param {Fabric.Object} target 
     * @param {Event} e 
     * @param {Object} config 配置项
     * @param {String} config.targetName property on the canvas where the old target is stored
     * @param {String} [config.canvasEvtOut] name of the event to fire at canvas level for out
     * @param {String} config.evtOut name of the event to fire for out
     * @param {String} [config.canvasEvtIn] name of the event to fire at canvas level for in
     * @param {String} config.evtIn name of the event to fire for in
     */
    fireSyntheticInOutEvents(target, e, config) {
        let inOpt, outOpt;
        const oldTarget = config.oldTarget;
        let outFires, inFires;
        const targetChanged = oldTarget !== target;
        const canvasEvtIn = config.canvasEvtIn;
        const canvasEvtOut = config.canvasEvtOut;
        if (targetChanged) {
            inOpt = { e, target, previousTarget: oldTarget };
            outOpt = { e, target: oldTarget, nextTarget: target };
        }
        inFires = target && targetChanged;
        outFires = oldTarget && targetChanged;
        if (outFires) {
            canvasEvtOut && this.fire(canvasEvtOut, outOpt);
            oldTarget.fire(config.evtOut, outOpt);
        }
        if (inFires) {
            canvasEvtIn && this.fire(canvasEvtIn, inOpt);
            target.fire(config.evtIn, inOpt);
        }
    },

    _handleEvent: function(e, eventType, button, isClick) {
        // target指代目前点击事件中命中的元素
        const target = this._target,
            targets = this.targets || [],
            options = {
                e: e,
                target,
                subTargets: targets,
                button: button || LEFT_CLICK,
                isClick: isClick || false,
                pointer: this._pointer,
                absolutePointer: this._absolutePointer,
                transform: this._currentTransform
            };
        this.fire('mouse:' + eventType, options);
        target && target.fire('mouse' + eventType, options);
        for (var i = 0; i < targets.length; i++) {
            targets[i].fire('mouse' + eventType, options);
        }
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
          // canvas的某个属性  是否有右击事件
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
  
        // 是否是在绘制线段
        if (this.isDrawingMode) {
          this._onMouseDownInDrawingMode(e);
          return;
        }
  
        if (!this._isMainEvent(e)) {
          return;
        }
  
        // 如果一些图形正在被转换时则忽略当前事件
        if (this._currentTransform) {
          return;
        }
  
        var pointer = this._pointer;
        // save pointer for check in __onMouseUp event
        this._previousPointer = pointer;
        const shouldRender = this._shouldRender(target);
        // 主要作用是除了鼠标点击 看看有没有按shift键 即想要多选
        const shouldGroup = this._shouldGroup(e, target);
        // 判断是否需要清空当前所选项
        if (this._shouldClearSelection(e, target)) {
          this.discardActiveObject(e);
        }
        // 是在多选操作
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
            const alreadySelected = target === this._activeObject;
            if (target.selectable) {
                this.setActiveObject(target, e);
            }
            const corner = target._findTargetCorner(
                this.getPointer(e, true),
                isTouchEvent(e)
            );
            target.__corner = corner;
            if (target === this._activeObject && (corner || !shouldGroup)) {
                const control = target.controls[corner];
                const mouseDownHandler = control && control.getMouseDownHandler(e, target, control);
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
     * 方法定义了再鼠标松开后的行为
     * 
     * @param {Event} e 
     */
    __onMouseUp: function (e) {
        let target;
        const transform = this._currentTransform;
        const groupSelector = this._groupSelector
        let shouldRender = false;
        const isClick = (!groupSelector || (groupSelector.left === 0 && groupSelector.top === 0));
        this._cacheTransformEventData(e);
        target = this._target;
        this._handleEvent(e, 'up:before');
        // if right/middle click just fire events and return
        // target undefined will make the _handleEvent search the target
        if (checkClick(e, RIGHT_CLICK)) {
          if (this.fireRightClick) {
            this._handleEvent(e, 'up', RIGHT_CLICK, isClick);
          }
          return;
        }
  
        if (checkClick(e, MIDDLE_CLICK)) {
          if (this.fireMiddleClick) {
            this._handleEvent(e, 'up', MIDDLE_CLICK, isClick);
          }
          this._resetTransformEventData();
          return;
        }
        
        // TODO 这个是可以实现类似画板功能直接绘制线段，后续实现
        if (this.isDrawingMode && this._isCurrentlyDrawing) {
          this._onMouseUpInDrawingMode(e);
          return;
        }
  
        if (!this._isMainEvent(e)) {
          return;
        }
        if (transform) {
          this._finalizeCurrentTransform(e);
          shouldRender = transform.actionPerformed;
        }
        if (!isClick) {
          this._maybeGroupObjects(e);
          shouldRender || (shouldRender = this._shouldRender(target));
        }
        if (target) {
            const corner = target._findTargetCorner(
                this.getPointer(e, true),
                isTouchEvent(e)
            );
            const control = target.controls[corner];
            const mouseUpHandler = control && control.getMouseUpHandler(e, target, control);
            if (mouseUpHandler) {
                mouseUpHandler(e, target, control);
            }
            target.isMoving = false;
        }
        this._setCursorFromEvent(e, target);
        this._handleEvent(e, 'up', LEFT_CLICK, isClick);
        this._groupSelector = null;
        this._currentTransform = null;
        // reset the target information about which corner is selected
        target && (target.__corner = 0);
        if (shouldRender) {
          this.requestRenderAll();
        }
        else if (!isClick) {
          this.renderTop();
        }
    },

    /**
     * 在canvas悬停的地方设置鼠标样式
     * @param {Event} e 
     * @param {Object} target 
     */
    _setCursorFromEvent(e, target) {
        if (!target) {
            this.setCursor(this.defaultCursor);
            return false;
        }
        let hoverCursor = target.hoverCursor || this.hoverCursor;
        const activeSelection = this._activeObject && this._activeObject.type === 'activeSelection' ?
            this._activeObject : null,
        // 存在已选中group时只展示适当的corner
        const corner = (!activeSelection || !activeSelection.contains(target))
            //针对touch设备的特殊处理。经常出现undefined。如果使用cursor 则需要更大的交互区域 手点击不精准
                    && target._findTargetCorner(this.getPointer(e, true));
        
        if (!corner) {
            if (target.subTargetCheck){
                // hoverCursor should come from top-most subTarget,
                // so we walk the array backwards
                this.targets.concat().reverse().map(function(_target){
                    hoverCursor = _target.hoverCursor || hoverCursor;
                });
            }
            this.setCursor(hoverCursor);
        }
        else {
            this.setCursor(this.getCornerCursor(corner, target, e));
        }
    },

    //获得控制边框样式
    getCornerCursor(corner, target, e) {
        const control = target.controls[corner];
        return control.cursorStyleHandler(e, control, target);
    },

    _finalizeCurrentTransform(e) {
        const transform = this._currentTransform;
        const target = transform.target;
        let eventName;
        const options = {
              e: e,
              target: target,
              transform: transform,
        };
  
        if (target._scaling) {
          target._scaling = false;
        }
  
        target.setCoords();
  
        if (transform.actionPerformed || (this.stateful && target.hasStateChanged())) {
            if (transform.actionPerformed) {
                eventName = this._addEventOptions(options, transform);
                this._fire(eventName, options);
            }
            this._fire('modified', options);
        }
    },

    /**
     * 在事件期间缓存一般信息
     * @param {Event} e 
     */
    _cacheTransformEventData(e) {
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

    /**
     * 判断事件存在id，即其是mainEvent
     * @param {Event} evt 
     */
    _isMainEvent: function(evt) {
      if (evt.isPrimary === true) {
        return true;
      }
      if (evt.isPrimary === false) {
        return false;
      }
      if (evt.type === 'touchend' && evt.touches.length === 0) {
        return true;
      }
      if (evt.changedTouches) {
        return evt.changedTouches[0].identifier === this.mainTouchId;
      }
      return true;
    },

    /**
     * 决定canvas是否需要鼠标点击或者弹起的时候进行重绘
     * @param {Object} target 
     */
    _shouldRender(target) {
        const activeObject = this._activeObject;

        if (
            !!activeObject !== !!target ||
            (activeObject && target && (activeObject !== target))
        ) {
            // this covers: switch of target, from target to no target, selection of target
            // multiSelection with key and mouse
            return true;
        }
        // 鼠标点击了正在编辑的文本框 则不需要重新绘制
        else if (activeObject && activeObject.isEditing) {
            // if we mouse up/down over a editing textbox a cursor change,
            // there is no need to re render
            return false;
        }
        return false;
    },

    _beforeTransform() {
        const t = this._currentTransform;
        this.stateful && t.target.saveState();
        this.fire('before:transform', {
            e: e,
            transform: t,
        });
    },

    // 根据action拆分出变化的细节
    _addEventOptions(options, transform) {
        // we can probably add more details at low cost
        // scale change, rotation changes, translation changes
        let eventName, by;
        switch (transform.action) {
          case 'scaleX':
            eventName = 'scaled';
            by = 'x';
            break;
          case 'scaleY':
            eventName = 'scaled';
            by = 'y';
            break;
          case 'skewX':
            eventName = 'skewed';
            by = 'x';
            break;
          case 'skewY':
            eventName = 'skewed';
            by = 'y';
            break;
          case 'scale':
            eventName = 'scaled';
            by = 'equally';
            break;
          case 'rotate':
            eventName = 'rotated';
            break;
          case 'drag':
            eventName = 'moved';
            break;
        }
        options.by = by;
        return eventName;
      }
}