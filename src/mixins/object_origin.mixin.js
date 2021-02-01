import Point from '../point.class';
import {rotatePoint, degreesToRadians, sizeAfterTransform} from '../util/misc';

const originXOffset = {
    left: -0.5,
    center: 0,
    right: 0.5
};

const originYOffset = {
    top: -0.5,
    center: 0,
    bottom: 0.5
};

export default {

    /**
     * 返回对象中心坐标
     * @return {Point}
     */
    getCenterPoint() {
        const leftTop = new Point(this.left, this.top);
        return this.translateToCenterPoint(leftTop, this.originX, this.originY);
    },

    /**
     * 将坐标系中心转到
     * @param {*} point
     * @param {*} originX
     * @param {*} originY
     */
    translateToCenterPoint(point, originX, originY) {
        const p = this.translateToGivenOrigin(point, originX, originY, 'center', 'center');
        if (this.angle) {
            return rotatePoint(p, point, degreesToRadians(this.angle));
        }
        return p;
    },

    /**
     * 原点更换后 计算转移后的坐标 主要是originX 和 originY对元素的影响
     * @param {Point} point 基于原始原点的点坐标
     * @param {*} fromOriginX 原始 水平原点距离
     * @param {*} fromOriginY 原始 垂直原点距离
     * @param {*} toOriginX 转移后 水平原点距离
     * @param {*} toOriginY 转义后 垂直原点距离
     */
    translateToGivenOrigin(point, fromOriginX, fromOriginY, toOriginX, toOriginY) {
        let {x} = point;
        let {y} = point;
        let dim;

        if (typeof fromOriginX === 'string') {
            fromOriginX = originXOffset[fromOriginX];
        }
        else {
            fromOriginX -= 0.5;
        }

        if (typeof toOriginX === 'string') {
            toOriginX = originXOffset[toOriginX];
        }
        else {
            toOriginX -= 0.5;
        }

        const offsetX = toOriginX - fromOriginX;

        if (typeof fromOriginY === 'string') {
            fromOriginY = originYOffset[fromOriginY];
        }
        else {
            fromOriginY -= 0.5;
        }

        if (typeof toOriginY === 'string') {
            toOriginY = originYOffset[toOriginY];
        }
        else {
            toOriginY -= 0.5;
        }

        const offsetY = toOriginY - fromOriginY;

        if (offsetX || offsetY) {
            dim = this._getTransformedDimensions();
            x = point.x + offsetX * dim.x;
            y = point.y + offsetY * dim.y;
        }

        return new Point(x, y);
    },

    /**
     * 根据对象的缩放 拉拽计算元素包裹box的大小
     * @param {Number} skewX - skewX
     * @param {*} skewY - skewY
     */
    _getTransformedDimensions(skewX, skewY) {
        if (typeof skewX === 'undefined') {
            ({skewX} = this);
        }
        if (typeof skewY === 'undefined') {
            ({skewY} = this);
        }
        const dimensions = this._getNonTransformedDimensions();
        let dimX; let dimY;
        const noSkew = skewX === 0 && skewY === 0;

        if (this.strokeUniform) {
            dimX = this.width;
            dimY = this.height;
        }
        else {
            dimX = dimensions.x;
            dimY = dimensions.y;
        }
        if (noSkew) {
            return this._finalizeDimensions(dimX * this.scaleX, dimY * this.scaleY);
        }
        const bbox = sizeAfterTransform(dimX, dimY, {
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            skewX,
            skewY,
        });
        return this._finalizeDimensions(bbox.x, bbox.y);
    },

    /**
     * 根据strokeUniform 判断是否增加固定的边框宽度
     * @param {Number} width - width
     * @param {Number} height - height
     */
    _finalizeDimensions(width, height) {
        return this.strokeUniform
            ? {x: width + this.strokeWidth, y: height + this.strokeWidth}
            : {x: width, y: height};
    }
};
