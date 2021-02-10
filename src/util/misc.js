import Point from '../point.class';
import {iMatrix} from '../HEADER';
import {min, max} from './lang_array';
import Pattern from '../pattern.class';
import {camelize} from './lang_string';
import {PPTCanvas} from '../HEADER.js'

const {sqrt} = Math;
const {atan2} = Math;
const {pow} = Math;
const PiBy180 = Math.PI / 180;
const PiBy2 = Math.PI / 2;

/**
 * 返回相关类的命名空间
 * @param {String} type 
 * @param {Stirng} namespace 
 */
export function getKlass(type, namespace) {
    type = camelize(type.charAt(0).toUpperCase() + type.slice(1));
    return resolveNamespace(namespace)[type];
}

/**
 * 根据给定命名空间返回对象
 * @param {*} namespace 
 */
export function resolveNamespace(namespace) {
    if (!namespace) {
        return PPTCanvas;
      }

      let parts = namespace.split('.'),
          len = parts.length, i,
          obj = window;

      for (i = 0; i < len; ++i) {
        obj = obj[parts[i]];
      }

      return obj;
}

export function sin(angle) {
    if (angle === 0) {
        return 0;
    }
    const angleSlice = angle / PiBy2; let sign = 1;
    if (angle < 0) {
        // sin(-a) = -sin(a)
        sign = -1;
    }
    switch (angleSlice) {
        case 1: return sign;
        case 2: return 0;
        case 3: return -sign;
    }
    return Math.sin(angle);
}
export function cos(angle) {
    if (angle === 0) {
        return 1;
    }
    if (angle < 0) {
        // cos(a) = cos(-a)
        angle = -angle;
    }
    const angleSlice = angle / PiBy2;
    switch (angleSlice) {
        case 1: case 3: return 0;
        case 2: return -1;
    }
    return Math.cos(angle);
}

/**
 * 将矢量 即原点到point坐标点旋转相应弧度
 * @param {Point} vector
 * @param {*} radians
 */
export function rotateVector(vector, radians) {
    const sinvalue = sin(radians);
    const cosvalue = cos(radians);
    const rx = vector.x * cosvalue - vector.y * sinvalue;
    const ry = vector.x * sinvalue + vector.y * cosvalue;
    return {
        x: rx,
        y: ry
    };
}

export function toFixed(number, fractionDigits) {
    return parseFloat(Number(number).toFixed(fractionDigits));
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 将点按中心点旋转相应的弧度
// @param {*} point
// @param {*} origin
// @param {*} radians
export function rotatePoint(point, origin, radians) {
    point.subtractEquals(origin);
    const v = rotateVector(point, radians);
    return Point(v.x, v.y).addEquals(origin);
}

/**
 * 角度转为弧度
 */
export function degreesToRadians(degrees) {
    return degrees * PiBy180;
}

/**
 * 反转 转换transformation。主要矩阵不能相除  但是可以通过乘以逆矩阵的方式得到相同效果
 * @param {*} t
 */
export function invertTransform(t) {
    const a = 1 / (t[0] * t[3] - t[1] * t[2]);
    const r = [a * t[3], -a * t[1], -a * t[2], a * t[0]];
    const o = transformPoint({x: t[4], y: t[5]}, r, true);
    r[4] = -o.x;
    r[5] = -o.y;
    return r;
}

/**
 * 将transform转换为一个Point
 * @param {*} p
 * @param {*} t
 * @param {*} ignoreOffset
 */
export function transformPoint(p, t, ignoreOffset) {
    if (ignoreOffset) {
        return new Point(
            t[0] * p.x + t[2] * p.y,
            t[1] * p.x + t[3] * p.y
        );
    }
    return new Point(
        t[0] * p.x + t[2] * p.y + t[4],
        t[1] * p.x + t[3] * p.y + t[5]
    );
}
// 用矩阵A乘以矩阵B来嵌套变换
export function multiplyTransformMatrices(a, b, is2x2) {
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        is2x2 ? 0 : a[0] * b[4] + a[2] * b[5] + a[4],
        is2x2 ? 0 : a[1] * b[4] + a[3] * b[5] + a[5]
    ];
}

/**
 * 先叠加元素位置后得到的transform matrix，再判断有没有旋转与缩放
 * @param {*} options
 */
export function composeMatrix(options) {
    let matrix = [1, 0, 0, 1, options.translateX || 0, options.translateY || 0];
    const multiply = multiplyTransformMatrices;
    if (options.angle) {
        matrix = multiply(matrix, calcRotateMatrix(options));
    }
    if (options.scaleX !== 1 || options.scaleY !== 1
          || options.skewX || options.skewY || options.flipX || options.flipY) {
        matrix = multiply(matrix, calcDimensionsMatrix(options));
    }
    return matrix;
}

/**
 * 根据元素旋转角度计算transform matrix
 * @param {*} options
 */
export function calcRotateMatrix(options) {
    if (!options.angle) {
        return iMatrix.concat();
    }
    const theta = degreesToRadians(options.angle);
    const cosVal = cos(theta);
    const sinVal = sin(theta);
    return [cosVal, sinVal, -sinVal, cosVal, 0, 0];
}

/**
 * 根据元素scaleX 与 scaleY以及缩放计算返回transform matrix
 * @param {*} options
 */
export function calcDimensionsMatrix(options) {
    const scaleX = typeof options.scaleX === 'undefined' ? 1 : options.scaleX;
    const scaleY = typeof options.scaleY === 'undefined' ? 1 : options.scaleY;
    let scaleMatrix = [
        options.flipX ? -scaleX : scaleX,
        0,
        0,
        options.flipY ? -scaleY : scaleY,
        0,
        0
    ];
    const multiply = multiplyTransformMatrices;
    if (options.skewX) {
        scaleMatrix = multiply(
            scaleMatrix,
            [1, 0, Math.tan(degreesToRadians(options.skewX)), 1],
            true
        );
    }
    if (options.skewY) {
        scaleMatrix = multiply(
            scaleMatrix,
            [1, Math.tan(degreesToRadians(options.skewY)), 0, 1],
            true
        );
    }
    return scaleMatrix;
}

/**
 * 分解一个 2 * 3的矩阵成为一个转换对象，包含各类参数胡
 * @param {*} a
 */
export function qrDecompose(a) {
    const angle = atan2(a[1], a[0]);
    const denom = pow(a[0], 2) + pow(a[1], 2);
    const scaleX = sqrt(denom);
    const scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX;
    const skewX = atan2(a[0] * a[2] + a[1] * a[3], denom);
    return {
        angle: angle / PiBy180,
        scaleX,
        scaleY,
        skewX: skewX / PiBy180,
        skewY: 0,
        translateX: a[4],
        translateY: a[5]
    };
}

/**
 * 根据提供的宽高以及transform， 返回一个可包裹该范围box尺度
 * @param {*} width 元素宽
 * @param {*} height 元素高
 * @param {*} options 选项
 */
export function sizeAfterTransform(width, height, options) {
    const dimX = width / 2;
    const dimY = height / 2;
    const points = [
        {
            x: -dimX,
            y: -dimY
        },
        {
            x: dimX,
            y: -dimY
        },
        {
            x: -dimX,
            y: dimY
        },
        {
            x: dimX,
            y: dimY
        }
    ];
    const transformMatrix = calcDimensionsMatrix(options);
    const bbox = makeBoundingBoxFromPoints(points, transformMatrix);
    return {
        x: bbox.width,
        y: bbox.height,
    };
}

/**
 * 返回四个点组成的矩形坐标
 * @param {PointClass} points - 4个点
 * @param {*} transform transform matrix
 */
export function makeBoundingBoxFromPoints(points, transform) {
    if (transform) {
        for (let i = 0; i < points.length; i++) {
            points[i] = transformPoint(points[i], transform);
        }
    }
    const xPoints = [points[0].x, points[1].x, points[2].x, points[3].x];
    const minX = min(xPoints);
    const maxX = max(xPoints);
    const width = maxX - minX;
    const yPoints = [points[0].y, points[1].y, points[2].y, points[3].y];
    const minY = min(yPoints);
    const maxY = max(yPoints);
    const height = maxY - minY;

    return {
        left: minX,
        top: minY,
        width,
        height
    };
}

export function enlivenPatterns(patterns, callback) {
    patterns = patterns || [];

    function onLoaded() {
      if (++numLoadedPatterns === numPatterns) {
        callback && callback(enlivenedPatterns);
      }
    }

    var enlivenedPatterns = [],
        numLoadedPatterns = 0,
        numPatterns = patterns.length;

    if (!numPatterns) {
      callback && callback(enlivenedPatterns);
      return;
    }

    patterns.forEach(function (p, index) {
      if (p && p.source) {
        new Pattern(p, function(pattern) {
          enlivenedPatterns[index] = pattern;
          onLoaded();
        });
      }
      else {
        enlivenedPatterns[index] = p;
        onLoaded();
      }
    });
}

export function enlivenObjects(objects, callback, namespace, reviver) {
    objects = objects || [];

    var enlivenedObjects = [],
        numLoadedObjects = 0,
        numTotalObjects = objects.length;

    function onLoaded() {
      if (++numLoadedObjects === numTotalObjects) {
        callback && callback(enlivenedObjects.filter(function(obj) {
          // filter out undefined objects (objects that gave error)
          return obj;
        }));
      }
    }

    if (!numTotalObjects) {
      callback && callback(enlivenedObjects);
      return;
    }

    objects.forEach(function (o, index) {
      // if sparse array
      if (!o || !o.type) {
        onLoaded();
        return;
      }
      var klass = getKlass(o.type, namespace);
      klass.fromObject(o, function (obj, error) {
        error || (enlivenedObjects[index] = obj);
        reviver && reviver(o, obj, error);
        onLoaded();
      });
    });
}

/**
 * 重置当前对象的state。不重置对象的top和left
 * @param {Object} target 
 */
export function resetObjectTransform(target) {
    target.scaleX = 1;
    target.scaleY = 1;
    target.skewX = 0;
    target.skewY = 0;
    target.flipX = false;
    target.flipY = false;
    target.rotate(0);
}

export function saveObjectTransform(target) {
    return {
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        skewX: target.skewX,
        skewY: target.skewY,
        angle: target.angle,
        left: target.left,
        flipX: target.flipX,
        flipY: target.flipY,
        top: target.top
    };
}

