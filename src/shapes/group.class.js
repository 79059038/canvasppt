import {createClass} from '../util/lang_class';
import ObjectClass from './object.class'
import Point from '../publicClass/point.class';
import {qrDecompose, resetObjectTransform} from '../util/misc';
import {min, max} from '../util/lang_array.js'

const Group = createClass(ObjectClass, {}, {

    initialize(options, objects, isAlreadyGrouped) {
        options = options || {};
        this._objects = [];
        // 如果元素已经被group包裹，那么我们就不能再变更object的属性
        isAlreadyGrouped && this.callSuper('initialize', options);

        this._objects = objects || [];
        // 设置各个元素的group属性
        for (let i = this._objects.length; i--; ) {
            this._objects[i].group = this;
        }
        if (!isAlreadyGrouped) {
            const center = options && options.centerPoint;
            // we want to set origins before calculating the bounding box.
            // so that the topleft can be set with that in mind.
            // if specific top and left are passed, are overwritten later
            // with the callSuper('initialize', options)
            if (options.originX !== undefined) {
              this.originX = options.originX;
            }
            if (options.originY !== undefined) {
              this.originY = options.originY;
            }
            // if coming from svg i do not want to calc bounds.
            // i assume width and height are passed along options
            center || this._calcBounds();
            this._updateObjectsCoords(center);
            delete options.centerPoint;
            this.callSuper('initialize', options);
        }
        else {
            this._updateObjectsACoords();
        }
    
        this.setCoords();
    },

    /**
     * 将某个元素从group中剔除，并重新计算group的尺寸和位置
     * @param {Object} object 
     */
    removeWithUpdate(object) {
        this._restoreObjectsState();
        resetObjectTransform(this);
        // _objects删除该元素
        this.remove(object);
        // 重新计算边框
        this._calcBounds();
        // 更新group所属对象的Coords
        this._updateObjectsCoords();
        // 设置自己的Coords
        this.setCoords();
        this.dirty = true;
        return this;
    },

    /**
     * 增加一个元素到group中，并重新计算group的尺寸与位置
     */
    addWithUpdate(object) {
        this._restoreObjectsState();
        resetObjectTransform(this);

        if (object) {
            this._objects.push(object);
            object.group = this;
            // object._set('canvas', this.canvas);
            object.canvas = this.canvas;
        }
        this._calcBounds();
        this._updateObjectsCoords();
        this.setCoords();
        this.dirty = true;
        return this;
    },

    _updateObjectsCoords(center) {
        const centerTemp = center || this.getCenterPoint();
        for (var i = this._objects.length; i--; ){
          this._updateObjectCoords(this._objects[i], centerTemp);
        }
    },

    /**
     * 设置group中各个元素的top 和left 以及重新计算aCoords oCoords lineCoords
     * @param {Object} object 
     * @param {Object} center 
     */
    _updateObjectCoords(object, center) {
        const objectLeft = object.left;
        const objectTop = object.top;
        const skipControls = true;

        object.left = objectLeft - center.x;
        object.top = objectTop - center.y;
        // object.set({
        //     left: objectLeft - center.x,
        //     top: objectTop - center.y
        // });
        object.group = this;
        object.setCoords(skipControls);
    },

    /**
     * 计算group的边框
     * @param {Boolean} onlyWidthHeight 
     */
    _calcBounds(onlyWidthHeight) {
        const aX = [];
        const aY = [];
        let o;
        let prop;
        const props = ['tr', 'br', 'bl', 'tl'];
        let i = 0;
        const iLen = this._objects.length;
        let j;
        const jLen = props.length;
        
        // 循环遍历group中每个对象计算 ACoords 将获得的tr br bl tl逐个推入数组中
        for ( ; i < iLen; ++i) {
            o = this._objects[i];
            o.aCoords = o.calcACoords();
            for (j = 0; j < jLen; j++) {
                prop = props[j];
                aX.push(o.aCoords[prop].x);
                aY.push(o.aCoords[prop].y);
            }
        }
    
        this._getBounds(aX, aY, onlyWidthHeight);
    },

    /**
     * 根据各个元素的aCoords的x y 计算获取top left  width height
     * @param {Array} aX 
     * @param {Array} aY 
     * @param {} onlyWidthHeight 是否只计算宽高
     */
    _getBounds(aX, aY, onlyWidthHeight) {
        const minXY = new Point(min(aX), min(aY));
        const maxXY = new Point(max(aX), max(aY));
        const top = minXY.y || 0;
        const left = minXY.x || 0;
        const width = (maxXY.x - minXY.x) || 0;
        const height = (maxXY.y - minXY.y) || 0;
        this.width = width;
        this.height = height;
        if (!onlyWidthHeight) {
            // the bounding box always finds the t opleft most corner.
            // whatever is the group origin, we set up here the left/top position.
            this.setPositionByOrigin({ x: left, y: top }, 'left', 'top');
        }
    },

    /**
     * 还原group中每个对象的初始状态，初始状态早于group创建
     */
    _restoreObjectsState() {
        this._objects.forEach(this._restoreObjectState, this);
    },

    /**
     * 还原单个对象的状态
     * @param {Object} object 
     */
    _restoreObjectState(object) {
        this.realizeTransform(object);
        object.setCoords();
        delete object.group;
        return this;
    },

    realizeTransform: function(object) {
        const matrix = object.calcTransformMatrix();
        const options = qrDecompose(matrix);
        const center = new Point(options.translateX, options.translateY);
        object.flipX = false;
        object.flipY = false;
        object.set('scaleX', options.scaleX);
        object.set('scaleY', options.scaleY);
        object.skewX = options.skewX;
        object.skewY = options.skewY;
        object.angle = options.angle;
        object.setPositionByOrigin(center, 'center', 'center');
        return object;
    },

    _onObjectRemoved(object) {
        this.dirty = true;
        delete object.group;
    }
})

export default Group;