import {degreesToRadians, cos, sin, transformPoint} from '../util/misc';

export default {

    /**
     * 主要用来绘制选中后的外边框
     * 依赖于公共的属性 padding
     * 静态canvas时将会跳过该步骤
     * this function is called when the context is transformed
     * @param {CanvasRenderingContext2D} ctx Context to draw on
     * @return {fabric.Object} thisArg
     * @chainable
     */
    drawSelectionBackground(ctx) {
        // activeObject
        if (
            (this.canvas && !this.canvas.interactive)
          || (this.canvas && this.canvas.activeObject !== this)
        ) {
            return this;
        }
        ctx.save();
        const center = this.getCenterPoint(); const wh = this.calculateCurrentDimensions();
        const vpt = this.canvas.viewportTransform;
        ctx.translate(center.x, center.y);
        ctx.scale(1 / vpt[0], 1 / vpt[3]);
        ctx.rotate(degreesToRadians(this.angle));
        ctx.fillStyle = this.selectionBackgroundColor;
        ctx.fillRect(-wh.x / 2, -wh.y / 2, wh.x, wh.y);
        ctx.restore();
        return this;
    },

    // 设置可拖动框角落的坐标，用于缩放/旋转
    // 如果是圆角就没有这些问题
    // 解是单点和一个勾股定理的距离
    _setCornerCoords() {
        const coords = this.oCoords;
        const newTheta = degreesToRadians(45 - this.angle);
        const cosTheta = cos(newTheta);
        const sinTheta = sin(newTheta);

        /* Math.sqrt(2 * Math.pow(this.cornerSize, 2)) / 2, */
        /* 0.707106 stands for sqrt(2)/2 */
        const cornerHypotenuse = this.cornerSize * 0.707106;
        const touchHypotenuse = this.touchCornerSize * 0.707106;
        const cosHalfOffset = cornerHypotenuse * cosTheta;
        const sinHalfOffset = cornerHypotenuse * sinTheta;
        const touchCosHalfOffset = touchHypotenuse * cosTheta;
        const touchSinHalfOffset = touchHypotenuse * sinTheta;
        let x; let y;

        for (const control in coords) {
            if (coords.hasOwnProperty(control)) {
                ({x, y} = coords[control]);
                coords[control].corner = {
                    tl: {
                        x: x - sinHalfOffset,
                        y: y - cosHalfOffset
                    },
                    tr: {
                        x: x + cosHalfOffset,
                        y: y - sinHalfOffset
                    },
                    bl: {
                        x: x - cosHalfOffset,
                        y: y + sinHalfOffset
                    },
                    br: {
                        x: x + sinHalfOffset,
                        y: y + cosHalfOffset
                    }
                };
                coords[control].touchCorner = {
                    tl: {
                        x: x - touchSinHalfOffset,
                        y: y - touchCosHalfOffset
                    },
                    tr: {
                        x: x + touchCosHalfOffset,
                        y: y - touchSinHalfOffset
                    },
                    bl: {
                        x: x - touchCosHalfOffset,
                        y: y + touchSinHalfOffset
                    },
                    br: {
                        x: x + touchSinHalfOffset,
                        y: y + touchCosHalfOffset
                    }
                };
            }
        }
    },

    drawBorders(ctx, styleOverride) {
        styleOverride = styleOverride || {};
        // 计算边框尺寸
        const wh = this._calculateCurrentDimensions();
        const strokeWidth = this.borderScaleFactor;
        const width = wh.x + strokeWidth;
        const height = wh.y + strokeWidth;
        const hasControls = typeof styleOverride.hasControls !== 'undefined' ? styleOverride.hasControls : this.hasControls;
        let shouldStroke = false;

        ctx.save();
        ctx.strokeStyle = styleOverride.borderColor || this.borderColor;
        this._setLineDash(ctx, styleOverride.borderDashArray || this.borderDashArray, null);

        ctx.strokeRect(
            -width / 2,
            -height / 2,
            width,
            height
        );

        if (hasControls) {
            ctx.beginPath();
            this.forEachControl((control, key, fabricObject) => {
            // in this moment, the ctx is centered on the object.
            // width and height of the above function are the size of the bbox.
                if (control.withConnection && control.getVisibility(fabricObject, key)) {
                    // reset movement for each control
                    shouldStroke = true;
                    ctx.moveTo(control.x * width, control.y * height);
                    ctx.lineTo(
                        control.x * width + control.offsetX,
                        control.y * height + control.offsetY
                    );
                }
            });
            if (shouldStroke) {
                ctx.stroke();
            }
        }
        ctx.restore();
        return this;
    },

    /**
     * 为元素计算包含padding 缩放的控制边框
     */
    _calculateCurrentDimensions() {
        const vpt = this.getViewportTransform();
        const dim = this._getTransformedDimensions();
        const p = transformPoint(dim, vpt, true);
        return p.scalarAdd(2 * this.padding);
    },

    /**
     * 依赖于width height cornerSize padding 绘制元素边框的角
     * @param {CanvasRenderingContext2D}} ctx - canvas上下文
     * @param {Object} styleOverride - 覆盖元素原本样式的对象
     */
    drawControls(ctx, styleOverride) {
        styleOverride = styleOverride || {};
        ctx.save();
        ctx.setTransform(this.canvas.getRetinaScaling(), 0, 0, this.canvas.getRetinaScaling(), 0, 0);
        ctx.strokeStyle = ctx.fillStyle = styleOverride.cornerColor || this.cornerColor;
        // 控制元素控制线角的颜色
        // if (!this.transparentCorners) {
        //     ctx.strokeStyle = styleOverride.cornerStrokeColor || this.cornerStrokeColor;
        // }
        this._setLineDash(ctx, styleOverride.cornerDashArray || this.cornerDashArray, null);
        this.setCoords();
        this.forEachControl((control, key, fabricObject) => {
            if (control.getVisibility(fabricObject, key)) {
                control.render(ctx, fabricObject.oCoords[key].x, fabricObject.oCoords[key].y, styleOverride, fabricObject);
            }
        });
        ctx.restore();

        return this;
    },

    /**
     * 遍历整个controls 并调用传入方法进行处理
     * @param {Function}} fn - 遍历controls要执行的方法
     */
    forEachControl(fn) {
        for (const i in this.controls) {
            if (this.controls.hasOwnProperty(i)) {
                fn(this.controls[i], i, this);
            }
        }
    },

    /**
     * 判断哪个控制边框边缘的点被点击
     * @param {Object} pointer 鼠标点击的位置
     * @param {*} forTouch 是否来自于touch事件
     */
    _findTargetCorner: function(pointer, forTouch) {
        // 如果没被控制 属于group 或者不属于被选中的对象 直接返回
        if (!this.hasControls || this.group || (!this.canvas || this.canvas._activeObject !== this)) {
          return false;
        }
  
        const ex = pointer.x,
            ey = pointer.y;

        const keys = Object.keys(this.oCoords)

        let xPoints;
        let lines;
        let j = keys.length - 1;
        let i;
        this.__corner = 0;
  
        // 两级反转！ 先去top点
        for (; j >= 0; j--) {
          i = keys[j];
          // 如果当前元素控制框不显示
          if (!this.isControlVisible(i)) {
            continue;
          }
          // 获取元素四边的线的坐标
          lines = this._getImageLines(forTouch ? this.oCoords[i].touchCorner : this.oCoords[i].corner);
          // 一个点延伸的水平线与图形四边有多少交点
          xPoints = this._findCrossPoints({ x: ex, y: ey }, lines);
          if (xPoints !== 0 && xPoints % 2 === 1) {
            this.__corner = i;
            return i;
          }
        }
        return false;
    },

    // 判断是否当前控制线是否可见的
    isControlVisible: function(controlKey) {
        return this.controls[controlKey] && this.controls[controlKey].getVisibility(this, controlKey);
    },

    // 当销毁之前选中元素或者重新设置选中元素 调用该方法。若返回会false则会中断当前近程
    // 我也不知道为嘛这函数是空的
    onSelect() {}
};
