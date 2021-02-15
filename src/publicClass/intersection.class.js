import Point from './point.class'

function Intersection(status) {
    this.status = status;
    this.points = [];
}

Intersection.prototype = Object.create({
    constructor: Intersection,
    
    appendPoint(point) {
        this.points.push(point);
        return this;
    },

    appendPoints(points) {
        this.points = this.points.concat(points);
        return this;
    }
})

// 检查矩形是否与多边形相交
Intersection.intersectPolygonRectangle = function(points, r1, r2) {
    const min = r1.min(r2);
    const max = r1.max(r2);
    const topRight = new Point(max.x, min.y);
    const bottomLeft = new Point(min.x, max.y),
    const inter1 = Intersection.intersectLinePolygon(min, topRight, points);
    const inter2 = Intersection.intersectLinePolygon(topRight, max, points);
    const inter3 = Intersection.intersectLinePolygon(max, bottomLeft, points);
    const inter4 = Intersection.intersectLinePolygon(bottomLeft, min, points);
    const result = new Intersection();

    result.appendPoints(inter1.points);
    result.appendPoints(inter2.points);
    result.appendPoints(inter3.points);
    result.appendPoints(inter4.points);

    if (result.points.length > 0) {
        result.status = 'Intersection';
    }
    return result;
}

/**
 * 检查线与多边形是否相交. a1 a2 是线段的两个点。 points是多边形的多个点。
 * 分别判断a1 和 a2 线段和多边形多个边是否相交
 * @param {Point} a1 
 * @param {Point} a2 
 * @param {Array} points 
 */
Intersection.intersectLinePolygon = function(a1, a2, points) {
    const result = new Intersection();
    const length = points.length;
    let b1, b2, inter, i;

    for (i = 0; i < length; i++) {
        b1 = points[i];
        b2 = points[(i + 1) % length];
        inter = Intersection.intersectLineLine(a1, a2, b1, b2);

        result.appendPoints(inter.points);
    }
    if (result.points.length > 0) {
        result.status = 'Intersection';
    }
    return result;
}

/**
 * 判断线与线是否相交
 * 使用到的定力包括 AB * CD = x1*y2 - y1*x2。向量相乘后，CD在AB顺时针是为负 否则为正
 * 分别是 AC * AB AB * AD 根据正负判断是否同一方向 即验证C D 在AB线段两边
 * @param {Point} a1 
 * @param {Point} a2 
 * @param {Point} b1 
 * @param {Point} b2 
 */
Intersection.intersectLineLine = function (a1, a2, b1, b2) {
    let result;
    const uaT = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    const ubT = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    //相减得到以原点为起点的坐标 再向量相乘
    const uB = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    if (uB !== 0) {
        const ua = uaT / uB;
        const ub = ubT / uB;
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            result = new Intersection('Intersection');
            result.appendPoint(new Point(a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)));
        }
        else {
            result = new Intersection();
        }
    }
    else {
        if (uaT === 0 || ubT === 0) {
            result = new Intersection('Coincident');
        }
        else {
            result = new Intersection('Parallel');
        }
    }
    return result;
};

export default Intersection;
