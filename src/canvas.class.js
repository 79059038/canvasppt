import {createClass} from './util/lang_class';
import StaticCanvas from './static_canvas.class';

const CanvasClass = createClass(StaticCanvas, {

    /**
     * 声明当前canvas为可交互
     */
    interactive: true
}, {

    /**
     * 绘制当前活动元素的控制线
     * @param {*} ctx - canvas上下文
     */
    drawControls(ctx) {
        const activeObject = this._activeObject;

        if (activeObject) {
            activeObject._renderControls(ctx);
        }
    }
});
