import {arcToSegmentsCache} from '../HEADER';
import {sin, cos} from './misc';

const _join = Array.prototype.join;

function arcToSegments(toX, toY, rx, ry, large, sweep, rotateX) {
    const argsString = _join.call(arguments);
    if (arcToSegmentsCache[argsString]) {
        return arcToSegmentsCache[argsString];
    }

    const {PI} = Math; const th = rotateX * PI / 180;
    const sinTh = sin(th);
    const cosTh = cos(th);
    let fromX = 0; let fromY = 0;

    rx = Math.abs(rx);
    ry = Math.abs(ry);

    const px = -cosTh * toX * 0.5 - sinTh * toY * 0.5;
    const py = -cosTh * toY * 0.5 + sinTh * toX * 0.5;
    const rx2 = rx * rx; const ry2 = ry * ry; const py2 = py * py; const px2 = px * px;
    const pl = rx2 * ry2 - rx2 * py2 - ry2 * px2;
    let root = 0;

    if (pl < 0) {
        const s = Math.sqrt(1 - pl / (rx2 * ry2));
        rx *= s;
        ry *= s;
    }
    else {
        root = (large === sweep ? -1.0 : 1.0)
              * Math.sqrt(pl / (rx2 * py2 + ry2 * px2));
    }

    const cx = root * rx * py / ry;
    const cy = -root * ry * px / rx;
    const cx1 = cosTh * cx - sinTh * cy + toX * 0.5;
    const cy1 = sinTh * cx + cosTh * cy + toY * 0.5;
    let mTheta = calcVectorAngle(1, 0, (px - cx) / rx, (py - cy) / ry);
    let dtheta = calcVectorAngle((px - cx) / rx, (py - cy) / ry, (-px - cx) / rx, (-py - cy) / ry);

    if (sweep === 0 && dtheta > 0) {
        dtheta -= 2 * PI;
    }
    else if (sweep === 1 && dtheta < 0) {
        dtheta += 2 * PI;
    }

    // Convert into cubic bezier segments <= 90deg
    const segments = Math.ceil(Math.abs(dtheta / PI * 2));
    const result = []; const mDelta = dtheta / segments;
    const mT = 8 / 3 * Math.sin(mDelta / 4) * Math.sin(mDelta / 4) / Math.sin(mDelta / 2);
    let th3 = mTheta + mDelta;

    for (let i = 0; i < segments; i++) {
        result[i] = segmentToBezier(mTheta, th3, cosTh, sinTh, rx, ry, cx1, cy1, mT, fromX, fromY);
        fromX = result[i][4];
        fromY = result[i][5];
        mTheta = th3;
        th3 += mDelta;
    }
    arcToSegmentsCache[argsString] = result;
    return result;
}

/**
 * 计算矢量角度
 * @param {Number} ux 
 * @param {Number} uy 
 * @param {Number} vx 
 * @param {Number} vy 
 */
function calcVectorAngle(ux, uy, vx, vy) {
    var ta = Math.atan2(uy, ux),
        tb = Math.atan2(vy, vx);
    if (tb >= ta) {
      return tb - ta;
    }
    else {
      return 2 * Math.PI - (ta - tb);
    }
}

function segmentToBezier(th2, th3, cosTh, sinTh, rx, ry, cx1, cy1, mT, fromX, fromY) {
    var costh2 = cos(th2),
        sinth2 = sin(th2),
        costh3 = cos(th3),
        sinth3 = sin(th3),
        toX = cosTh * rx * costh3 - sinTh * ry * sinth3 + cx1,
        toY = sinTh * rx * costh3 + cosTh * ry * sinth3 + cy1,
        cp1X = fromX + mT * ( -cosTh * rx * sinth2 - sinTh * ry * costh2),
        cp1Y = fromY + mT * ( -sinTh * rx * sinth2 + cosTh * ry * costh2),
        cp2X = toX + mT * ( cosTh * rx * sinth3 + sinTh * ry * costh3),
        cp2Y = toY + mT * ( sinTh * rx * sinth3 - cosTh * ry * costh3);

    return [
      cp1X, cp1Y,
      cp2X, cp2Y,
      toX, toY
    ];
}

/**
 * 绘制弧度
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} fx
 * @param {Number} fy
 * @param {Array} coords
 */
export function drawArc(ctx, fx, fy, coords) {
    const rx = coords[0];
    const ry = coords[1];
    const rot = coords[2];
    const large = coords[3];
    const sweep = coords[4];
    const tx = coords[5];
    const ty = coords[6];
    const segs = [[], [], [], []];
    const segsNorm = arcToSegments(tx - fx, ty - fy, rx, ry, large, sweep, rot);

    for (let i = 0, len = segsNorm.length; i < len; i++) {
        segs[i][0] = segsNorm[i][0] + fx;
        segs[i][1] = segsNorm[i][1] + fy;
        segs[i][2] = segsNorm[i][2] + fx;
        segs[i][3] = segsNorm[i][3] + fy;
        segs[i][4] = segsNorm[i][4] + fx;
        segs[i][5] = segsNorm[i][5] + fy;
        ctx.bezierCurveTo.apply(ctx, segs[i]);
    }
}