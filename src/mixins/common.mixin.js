import {createCanvasElement} from '../util/dom_mics.js';
import {proxy, mergeOptions} from '../util/lang_class';


const CANVAS_INIT_ERROR = new Error('Could not initialize `canvas` element');
// 公共的option内容
export const commonOption = {
    // 背景图片
    backgroundImage: null,
    // 背景颜色
    backgroundColor: ''
};

// 公共的方法内容
export const commonFunction = {
    _createCanvasElement() {
        const element = createCanvasElement();
        if (!element) {
            throw CANVAS_INIT_ERROR;
        }
        if (!element.style) {
            element.style = { };
        }
        if (typeof element.getContext === 'undefined') {
            throw CANVAS_INIT_ERROR;
        }
        return element;
    },
    // 将内部options数据绑定到对象中
    bindOptionObject() {
        const keys = Object.keys(this._options);
        let i = keys.length;
        while (i--) {
            proxy(this, '_options', keys[i]);
        }
    },
    _initOption(options) {
        // TODO 将constructor.options做深拷贝
        this._options = mergeOptions(this.constructor.options, options);
        // TODO对options数据做监听
        
        this.bindOptionObject();
    }
};
