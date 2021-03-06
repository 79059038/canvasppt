import Point from '../publicClass/point.class';
import Intersection from '../publicClass/intersection.class'
import {
    multiplyTransformMatrices as multiplyMatrices,
    calcRotateMatrix,
    transformPoint,
    degreesToRadians,
    sin as sinFun,
    cos as cosFun,
    composeMatrix,
    sizeAfterTransform,
    makeBoundingBoxFromPoints
} from '../util/misc';
import objectControls from './object_default_control.mixin';

function arrayFromCoords(coords) {
    return [
        new Point(coords.tl.x, coords.tl.y),
        new Point(coords.tr.x, coords.tr.y),
        new Point(coords.br.x, coords.br.y),
        new Point(coords.bl.x, coords.bl.y)
    ];
}
export default {

    /** 存储的元素对象的transform matrix */
    ownMatrixCache: null,

    /** 存储的元素对象的 full transform matrix */
    matrixCache: null,

    /**
     * costom controls 接口
     * 一般通过defalut_controls.js添加
     */
    __static_controls: objectControls,

    /**
     * 检测当前对象是否仍然存在于cavas当前展示图内
     * @param {Boolean} [calculate] use coordinates of current position instead of .aCoords
     * @return {Boolean} 图形在canvas展示图内
     */
    isOnScreen(calculate) {
        if (!this.canvas) {
            return false;
        }
        const pointTL = this.canvas.vptCoords.tl;
        const pointBR = this.canvas.vptCoords.br;
        const points = this.getCoords(true, calculate);
        // if some point is on screen, the object is on screen.
        if (points.some(point => point.x <= pointBR.x && point.x >= pointTL.x
        && point.y <= pointBR.y && point.y >= pointTL.y)) {
            return true;
        }
        // no points on screen, check intersection with absolute coordinates
        if (this.intersectsWithRect(pointTL, pointBR, true, calculate)) {
            return true;
        }
        return this.containsCenterOfCanvas(pointTL, pointBR, calculate);
    },

    /**
     * 返回交叉的坐标点。坐标点以数组的方式返回
     * @return {Array} [tl, tr, br, bl] of points
     */
    getCoords(absolute, calculate) {
        return arrayFromCoords(this._getCoords(absolute, calculate));
    },

    /**
     * 返回交叉的坐标点。坐标点以数组的方式返回
     * @param {Boolean} absolute will return aCoords if true or lineCoords
     * @return {Object} {tl, tr, br, bl} points
     */
    _getCoords(absolute, calculate) {
        if (calculate) {
            return (absolute ? this.calcACoords() : this.calcLineCoords());
        }
        if (!this.aCoords || !this.lineCoords) {
            this.setCoords(true);
        }
        return (absolute ? this.aCoords : this.lineCoords);
    },

    /**
     * 根据当前角度、宽高 计算中心坐标
     * oCoords一般用来中心位置
     * aCoords用来快速在canvas寻找对象
     * lineCoords用来在在指针事件快速寻找对象
     * @param {Boolean} skipCorners - 跳过计算oCoords
     */
    setCoords(skipCorners) {
        this.aCoords = this.calcACoords();
        this.lineCoords = this.calcLineCoords();
        if (skipCorners) {
            return this;
        }
        // set coordinates of the draggable boxes in the corners used to scale/rotate the image
        this.oCoords = this.calcOCoords();
        this._setCornerCoords && this._setCornerCoords();
        return this;
    },

    /**
     * 计算当前元素的四个顶点坐标 bl br tl tr
     */
    calcACoords() {
        const rotateMatrix = this._calcRotateMatrix();
        const translateMatrix = this._calcTranslateMatrix();
        const finalMatrix = multiplyMatrices(translateMatrix, rotateMatrix);
        const dim = this._getTransformedDimensions();
        const w = dim.x / 2; const h = dim.y / 2;
        return {
            // corners
            tl: transformPoint({x: -w, y: -h}, finalMatrix),
            tr: transformPoint({x: w, y: -h}, finalMatrix),
            bl: transformPoint({x: -w, y: h}, finalMatrix),
            br: transformPoint({x: w, y: h}, finalMatrix)
        };
    },

    // 不知道计算了个锤子
    calcLineCoords() {
        const vpt = this.getViewportTransform();
        const {padding} = this;
        const angle = degreesToRadians(this.angle);
        const cos = cosFun(angle);
        const sin = sinFun(angle);
        const cosP = cos * padding;
        const sinP = sin * padding;
        const cosPSinP = cosP + sinP;
        const cosPMinusSinP = cosP - sinP;
        const aCoords = this.calcACoords();

        const lineCoords = {
            tl: transformPoint(aCoords.tl, vpt),
            tr: transformPoint(aCoords.tr, vpt),
            bl: transformPoint(aCoords.bl, vpt),
            br: transformPoint(aCoords.br, vpt),
        };

        if (padding) {
            lineCoords.tl.x -= cosPMinusSinP;
            lineCoords.tl.y -= cosPSinP;
            lineCoords.tr.x += cosPSinP;
            lineCoords.tr.y -= cosPMinusSinP;
            lineCoords.bl.x -= cosPSinP;
            lineCoords.bl.y += cosPMinusSinP;
            lineCoords.br.x += cosPMinusSinP;
            lineCoords.br.y += cosPSinP;
        }

        return lineCoords;
    },

    calcOCoords() {
        const rotateMatrix = this._calcRotateMatrix();
        const translateMatrix = this._calcTranslateMatrix();
        const vpt = this.getViewportTransform();
        const startMatrix = multiplyMatrices(vpt, translateMatrix);
        let finalMatrix = multiplyMatrices(startMatrix, rotateMatrix);
        finalMatrix = multiplyMatrices(finalMatrix, [1 / vpt[0], 0, 0, 1 / vpt[3], 0, 0]);
        const dim = this._calculateCurrentDimensions();
        const coords = {};
        this.forEachControl((control, key, fabricObject) => {
            coords[key] = control.positionHandler(dim, finalMatrix, fabricObject);
        });
        return coords;
    },

    // 计算对象的旋转矩阵
    _calcRotateMatrix() {
        return calcRotateMatrix(this);
    },

    // 计算对象包括padding和canvas缩放情况下的外边框尺寸
    _calculateCurrentDimensions() {
        const vpt = this.getViewportTransform();
        const dim = this._getTransformedDimensions();
        const p = transformPoint(dim, vpt, true);
        return p.scalarAdd(2 * this.padding);
    },

    /**
     * 根据缩放和旋转计算元素外部边框大小
     * @param {Number} skewX - 元素skewX
     * @param {Number} skewY - 元素skewY
     * @return {Object} .x 宽度
     * @return {Object} .y 高度
     */
    _getTransformedDimensions(skewX, skewY) {
        if (typeof skewX === 'undefined') {
            ({skewX} = this);
        }
        if (typeof skewY === 'undefined') {
            ({skewY} = this);
        }
        const dimensions = this._getNonTransformedDimensions();
        let dimX;
        let dimY;
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
        // 根据宽高 位移缩放 计算最后尺寸
        const bbox = sizeAfterTransform(dimX, dimY, {
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            skewX,
            skewY,
        });
        return this._finalizeDimensions(bbox.x, bbox.y);
    },

    /**
     * 根据属性计算元素大小
     */
    _getNonTransformedDimensions() {
        const {strokeWidth} = this;
        const w = this.width + strokeWidth;
        const h = this.height + strokeWidth;
        return {x: w, y: h};
    },

    /**
     * 整理输出结果。根据strokeUniform判断是否需要加上stroke宽度
     * @param {*} width - 宽
     * @param {*} height - 高
     */
    _finalizeDimensions(width, height) {
        return this.strokeUniform
            ? {x: width + this.strokeWidth, y: height + this.strokeWidth}
            : {x: width, y: height};
    },

    /**
     * 根据元素对象属性计算transform matrix. 主要区分单个元素还是group元素，分别调用不同方法
     * @param {*} skipGroup
     * @return {Array} 返回元素的matrix数组
     */
    calcTransformMatrix(skipGroup) {
        let matrix = this.calcOwnMatrix();
        // 单个元素时即跳过后续步骤
        if (skipGroup || !this.group) {
            return matrix;
        }
        const key = this.transformMatrixKey(skipGroup);
        const cache = this.matrixCache || (this.matrixCache = {});
        if (cache.key === key) {
            return cache.value;
        }
        if (this.group) {
            matrix = multiplyMatrices(this.group.calcTransformMatrix(false), matrix);
        }
        cache.key = key;
        cache.value = matrix;
        return matrix;
    },

    /**
     * 根据单个元素的属性计算transform matrix.这一步主要罗列元素属性供后续矩阵相乘计算
     */
    calcOwnMatrix() {
        const key = this.transformMatrixKey(true);
        const cache = this.ownMatrixCache || (this.ownMatrixCache = {});
        if (cache.key === key) {
            return cache.value;
        }
        const tMatrix = this._calcTranslateMatrix();
        const options = {
            angle: this.angle,
            translateX: tMatrix[4],
            translateY: tMatrix[5],
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            skewX: this.skewX,
            skewY: this.skewY,
            flipX: this.flipX,
            flipY: this.flipY,
        };
        cache.key = key;
        cache.value = composeMatrix(options);
        return cache.value;
    },

    // 计算对象的平移变换矩阵
    _calcTranslateMatrix() {
        const center = this.getCenterPoint();
        return [1, 0, 0, 1, center.x, center.y];
    },

    /**
     * 根据元素当前属性拼接一个字符串，主要方便后续针对同一属性值时获取缓存的transform matrix计算结果
     * @param {*} skipGroup
     */
    transformMatrixKey(skipGroup) {
        const sep = '_'; let prefix = '';
        if (!skipGroup && this.group) {
            prefix = this.group.transformMatrixKey(skipGroup) + sep;
        }
        return prefix + this.top + sep + this.left + sep + this.scaleX + sep + this.scaleY
          + sep + this.skewX + sep + this.skewY + sep + this.angle + sep + this.originX + sep + this.originY
          + sep + this.width + sep + this.height + sep + this.strokeWidth + this.flipX + this.flipY;
    },

    // 检查一个点是否在当前对象中
    containsPoint: function(point, lines, absolute, calculate) {
        const coords = this._getCoords(absolute, calculate);
            // 图形的四边线段的坐标
        lines = lines || this._getImageLines(coords);
        const xPoints = this._findCrossPoints(point, lines);
        // if xPoints is odd then point is inside the object
        return (xPoints !== 0 && xPoints % 2 === 1);
    },

    /**
     * 这个鬼方法是用来判断 一个点延伸的水平线与图形四边有多少交点
     * 主要用来判断是否某个点在图形内部。
     * 一个点向右延伸的射线如果与图形边缘存在奇数个点 表示在图形内部。
     * @param {Object} point 
     * @param {Object} lines 
     */
    _findCrossPoints: function(point, lines) {
        let b1, b2, a1, a2, xi, // yi,
            xcount = 0,
            iLine;
  
        for (const lineKey in lines) {
          iLine = lines[lineKey];
          // optimisation 1: line below point. no cross
          if ((iLine.o.y < point.y) && (iLine.d.y < point.y)) {
            continue;
          }
          // optimisation 2: line above point. no cross
          if ((iLine.o.y >= point.y) && (iLine.d.y >= point.y)) {
            continue;
          }
          // optimisation 3: vertical line case
          if ((iLine.o.x === iLine.d.x) && (iLine.o.x >= point.x)) {
            xi = iLine.o.x;
            // yi = point.y;
          }
          // calculate the intersection point
          else {
            b1 = 0;
            b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x);
            a1 = point.y - b1 * point.x;
            a2 = iLine.o.y - b2 * iLine.o.x;
  
            xi = -(a1 - a2) / (b1 - b2);
            // yi = a1 + b1 * xi;
          }
          // dont count xi < point.x cases
          if (xi >= point.x) {
            xcount += 1;
          }
          // optimisation 4: specific for square images
          if (xcount === 2) {
            break;
          }
        }
        return xcount;
    },

    /**
     * 返回对象包含图形四边线段的坐标
     * @param {Object} oCoords 
     */
    _getImageLines: function(oCoords) {
        const lines = {
          topline: {
            o: oCoords.tl,
            d: oCoords.tr
          },
          rightline: {
            o: oCoords.tr,
            d: oCoords.br
          },
          bottomline: {
            o: oCoords.br,
            d: oCoords.bl
          },
          leftline: {
            o: oCoords.bl,
            d: oCoords.tl
          }
        };
  
        return lines;
    },

    /**
     * 判断元素与由两个点组成的矩形区域是否相交
     * @param {Object} pointTL 矩形左上点
     * @param {Object} pointBR 矩形右下点
     * @param {Boolean} absolute 没有经过viewportTransform转换
     * @param {Boolean} calculate 不使用oCoords而使用当前点
     */
    intersectsWithRect(pointTL, pointBR, absolute, calculate) {
        const coords = this.getCoords(absolute, calculate);
        const intersection = Intersection.intersectPolygonRectangle(
            coords,
            pointTL,
            pointBR
          );
        return intersection.status === 'Intersection';
    },

    /**
     * 判断某个元素是否在 两个点（左上右下）确定的区域 中
     * @param {Object} pointTL 
     * @param {Object} pointBR 
     * @param {Boolean} absolute 
     * @param {Boolean} calculate 
     */
    isContainedWithinRect(pointTL, pointBR, absolute, calculate) {
        const boundingRect = this.getBoundingRect(absolute, calculate);
  
        return (
          boundingRect.left >= pointTL.x &&
          boundingRect.left + boundingRect.width <= pointBR.x &&
          boundingRect.top >= pointTL.y &&
          boundingRect.top + boundingRect.height <= pointBR.y
        );
    },

    getBoundingRect: function(absolute, calculate) {
        const coords = this.getCoords(absolute, calculate);
        return makeBoundingBoxFromPoints(coords);
    }
};
