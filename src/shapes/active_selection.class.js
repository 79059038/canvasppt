import {createClass} from '../util/lang_class';
import Group from './group.class.js';

const ActiveSelection = createClass(Group, {}, {
    type: 'activeSelection',

    initialize(options, objects) {
        options = options || {};
        this._objects = objects || [];
        for (var i = this._objects.length; i--; ) {
            this._objects[i].group = this;
        }

        if (options.originX) {
            this.originX = options.originX;
        }
        if (options.originY) {
            this.originY = options.originY;
        }
        // 计算边框
        this._calcBounds();
        // 跟新group中元素的Coords
        this._updateObjectsCoords();
        // 设置自己的边框
        this.setCoords();
    },
});

export default ActiveSelection;
