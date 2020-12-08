import {createClass} from '../util/lang_class';
import {min, max} from '../util/lang_array';
import ObjectClass from './object.class';

const Polyline = createClass(ObjectClass, {}, {
    type: 'polyline',

    /**
     * point 数组
     */
    points: null,

    cacheProperties: ObjectClass.prototype.cacheProperties.concat('points'),

    initialize(points, options) {
        options = options || {};
        this.points = points || [];
        this.callSuper('initialize', options);
        this._setPositionDimensions(options);
    },

    _setPositionDimensions(options) {
        const calcDim = this._calcDimensions(options);
        let correctLeftTop;
        this.width = calcDim.width;
        this.height = calcDim.height;
        if (!options.fromSVG) {
            correctLeftTop = this.translateToGivenOrigin(
                {x: calcDim.left - this.strokeWidth / 2, y: calcDim.top - this.strokeWidth / 2},
                'left',
                'top',
                this.originX,
                this.originY
            );
        }
        if (typeof options.left === 'undefined') {
            this.left = options.fromSVG ? calcDim.left : correctLeftTop.x;
        }
        if (typeof options.top === 'undefined') {
            this.top = options.fromSVG ? calcDim.top : correctLeftTop.y;
        }
        this.pathOffset = {
            x: calcDim.left + this.width / 2,
            y: calcDim.top + this.height / 2
        };
    },

    /**
     * 根据多边形最小和最大点，计算出width height left top 作为多边形的尺寸
     */
    _calcDimensions() {

        const {points} = this;
        const minX = min(points, 'x') || 0;
        const minY = min(points, 'y') || 0;
        const maxX = max(points, 'x') || 0;
        const maxY = max(points, 'y') || 0;
        const width = (maxX - minX);
        const height = (maxY - minY);

        return {
            left: minX,
            top: minY,
            width,
            height
        };
    },
}, 'Polyline');

export default Polyline;