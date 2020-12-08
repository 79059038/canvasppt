import {createClass} from '../util/lang_class';
import {rePathCommand} from '../HEADER';
import ObjectClass from './object.class';
import Polyline from './polyline.class';
import {drawArc} from '../util/arc';

/**
 * 传入path为字符串时进行解析 不同命令后续跟随的数字  的数量
 */
const commandLengths = {
    m: 2,
    l: 2,
    h: 1,
    v: 1,
    c: 6,
    s: 4,
    q: 4,
    t: 2,
    a: 7
};

const repeatedCommands = {
    m: 'l',
    M: 'L'
};

const PathClass = createClass(ObjectClass, {

    /**
     * path 点的数组
     */
    path: null,

}, {
    type: 'path',

    cacheProperties: ObjectClass.prototype.cacheProperties.concat('path', 'fillRule'),

    stateProperties: ObjectClass.prototype.stateProperties.concat('path'),

    initialize(path = [], options = {}) {
        this.callSuper('initialize', options);

        const fromArray = Array.isArray(path);

        this.path = fromArray
            ? path
            // 可能传入的path是带有命令的字符串
            : path.match && path.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);

        if (!this.path) {
            return;
        }
        // 将字符串格式path进行解析成数组
        if (!fromArray) {
            this.path = this._parsePath();
        }
        // 主要计算设置left top pathOffset
        Polyline.prototype._setPositionDimensions.call(this, options);
    },

    /**
     * 将数据解析成二维数组。数组格式为 ['m', 10, 10]
     * @private
     */
    _parsePath() {
        const result = [];
        const coords = [];
        let currentPath;
        let parsed;
        const re = rePathCommand;
        let match;
        let coordsStr;

        for (let i = 0, coordsParsed, len = this.path.length; i < len; i++) {
            currentPath = this.path[i];
            // 先解析出命令字母
            coordsStr = currentPath.slice(1).trim();
            coords.length = 0;

            while ((match = re.exec(coordsStr))) {
                coords.push(match[0]);
            }

            coordsParsed = [currentPath.charAt(0)];

            for (let j = 0, jlen = coords.length; j < jlen; j++) {
                parsed = parseFloat(coords[j]);
                if (!isNaN(parsed)) {
                    coordsParsed.push(parsed);
                }
            }

            let command = coordsParsed[0];
            const commandLength = commandLengths[command.toLowerCase()];
            const repeatedCommand = repeatedCommands[command] || command;

            if (coordsParsed.length - 1 > commandLength) {
                for (let k = 1, klen = coordsParsed.length; k < klen; k += commandLength) {
                    result.push([command].concat(coordsParsed.slice(k, k + commandLength)));
                    command = repeatedCommand;
                }
            }
            else {
                result.push(coordsParsed);
            }
        }

        return result;
    },

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx context to render path on
     */
    _renderPathCommands(ctx) {
        // current instruction
        let current;
        let previous = null;
        let subpathStartX = 0;
        let subpathStartY = 0;
        // current x
        let x = 0;
        // current y
        let y = 0;
        // current control point x
        let controlX = 0;
        // current control point x
        let controlY = 0;
        let tempX;
        let tempY;
        const l = -this.pathOffset.x;
        const t = -this.pathOffset.y;

        ctx.beginPath();

        for (let i = 0, len = this.path.length; i < len; ++i) {

            current = this.path[i];
            // first letter
            switch (current[0]) {
                // lineto, relative
                case 'l':
                    x += current[1];
                    y += current[2];
                    ctx.lineTo(x + l, y + t);
                    break;
                // lineto, absolute
                case 'L':
                    x = current[1];
                    y = current[2];
                    ctx.lineTo(x + l, y + t);
                    break;
                // horizontal lineto, relative
                case 'h':
                    x += current[1];
                    ctx.lineTo(x + l, y + t);
                    break;
                // horizontal lineto, absolute
                case 'H':
                    x = current[1];
                    ctx.lineTo(x + l, y + t);
                    break;
                // vertical lineto, relative
                case 'v':
                    y += current[1];
                    ctx.lineTo(x + l, y + t);
                    break;
                // verical lineto, absolute
                case 'V':
                    y = current[1];
                    ctx.lineTo(x + l, y + t);
                    break;
                // moveTo, relative
                case 'm':
                    x += current[1];
                    y += current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    ctx.moveTo(x + l, y + t);
                    break;
                // moveTo, absolute
                case 'M':
                    x = current[1];
                    y = current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    ctx.moveTo(x + l, y + t);
                    break;
                // bezierCurveTo, relative
                case 'c':
                    tempX = x + current[5];
                    tempY = y + current[6];
                    controlX = x + current[3];
                    controlY = y + current[4];
                    ctx.bezierCurveTo(
                        x + current[1] + l,
                        y + current[2] + t,
                        controlX + l,
                        controlY + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;
                    break;

                // bezierCurveTo, absolute
                case 'C':
                    x = current[5];
                    y = current[6];
                    controlX = current[3];
                    controlY = current[4];
                    ctx.bezierCurveTo(
                        current[1] + l,
                        current[2] + t,
                        controlX + l,
                        controlY + t,
                        x + l,
                        y + t
                    );
                    break;

                // shorthand cubic bezierCurveTo, relative
                case 's':

                    // transform to absolute x,y
                    tempX = x + current[3];
                    tempY = y + current[4];

                    if (previous[0].match(/[CcSs]/) === null) {
                        // If there is no previous command or if the previous command was not a C, c, S, or s,
                        // the control point is coincident with the current point
                        controlX = x;
                        controlY = y;
                    }
                    else {
                        // calculate reflection of previous control points
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }

                    ctx.bezierCurveTo(
                        controlX + l,
                        controlY + t,
                        x + current[1] + l,
                        y + current[2] + t,
                        tempX + l,
                        tempY + t
                    );
                    // set control point to 2nd one of this command
                    // "... the first control point is assumed to be
                    // the reflection of the second control point on
                    // the previous command relative to the current point."
                    controlX = x + current[1];
                    controlY = y + current[2];

                    x = tempX;
                    y = tempY;
                    break;

                // shorthand cubic bezierCurveTo, absolute
                case 'S':
                    tempX = current[3];
                    tempY = current[4];
                    if (previous[0].match(/[CcSs]/) === null) {
                        // If there is no previous command or if the previous command was not a C, c, S, or s,
                        // the control point is coincident with the current point
                        controlX = x;
                        controlY = y;
                    }
                    else {
                        // calculate reflection of previous control points
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.bezierCurveTo(
                        controlX + l,
                        controlY + t,
                        current[1] + l,
                        current[2] + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;

                    // set control point to 2nd one of this command
                    // "... the first control point is assumed to be
                    // the reflection of the second control point on
                    // the previous command relative to the current point."
                    controlX = current[1];
                    controlY = current[2];

                    break;

                // quadraticCurveTo, relative
                case 'q':
                    // transform to absolute x,y
                    tempX = x + current[3];
                    tempY = y + current[4];

                    controlX = x + current[1];
                    controlY = y + current[2];

                    ctx.quadraticCurveTo(
                        controlX + l,
                        controlY + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;
                    break;

                // quadraticCurveTo, absolute
                case 'Q':
                    tempX = current[3];
                    tempY = current[4];

                    ctx.quadraticCurveTo(
                        current[1] + l,
                        current[2] + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;
                    controlX = current[1];
                    controlY = current[2];
                    break;

                // shorthand quadraticCurveTo, relative
                case 't':

                    // transform to absolute x,y
                    tempX = x + current[1];
                    tempY = y + current[2];

                    if (previous[0].match(/[QqTt]/) === null) {
                        // If there is no previous command or if the previous command was not a Q, q, T or t,
                        // assume the control point is coincident with the current point
                        controlX = x;
                        controlY = y;
                    }
                    else {
                        // calculate reflection of previous control point
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }

                    ctx.quadraticCurveTo(
                        controlX + l,
                        controlY + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;

                    break;

                case 'T':
                    tempX = current[1];
                    tempY = current[2];

                    if (previous[0].match(/[QqTt]/) === null) {
                        // If there is no previous command or if the previous command was not a Q, q, T or t,
                        // assume the control point is coincident with the current point
                        controlX = x;
                        controlY = y;
                    }
                    else {
                        // calculate reflection of previous control point
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.quadraticCurveTo(
                        controlX + l,
                        controlY + t,
                        tempX + l,
                        tempY + t
                    );
                    x = tempX;
                    y = tempY;
                    break;

                case 'a':
                    drawArc(ctx, x + l, y + t, [
                        current[1],
                        current[2],
                        current[3],
                        current[4],
                        current[5],
                        current[6] + x + l,
                        current[7] + y + t
                    ]);
                    x += current[6];
                    y += current[7];
                    break;

                case 'A':
                    drawArc(ctx, x + l, y + t, [
                        current[1],
                        current[2],
                        current[3],
                        current[4],
                        current[5],
                        current[6] + l,
                        current[7] + t
                    ]);
                    x = current[6];
                    y = current[7];
                    break;

                case 'z':
                case 'Z':
                    x = subpathStartX;
                    y = subpathStartY;
                    ctx.closePath();
                    break;
            }
            previous = current;
        }
    },

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx context to render path on
     */
    _render(ctx) {
        this._renderPathCommands(ctx);
        this._renderPaintInOrder(ctx);
    },

    /**
     * Returns string representation of an instance
     * @return {String} string representation of an instance
     */
    toString() {
        return `#<fabric.Path (${this.complexity()
        }): { "top": ${this.top}, "left": ${this.left} }>`;
    },

    _toSVG() {
        const path = this.path.map(path => path.join(' ')).join(' ');
        return [
            '<path ',
            'COMMON_PARTS',
            'd="',
            path,
            '" stroke-linecap="round" ',
            '/>\n'
        ];
    }
}, 'PathClass');

export default PathClass;
