import {createCanvasElement} from '../util/dom_mics.js';
import {proxy, mergeOptions} from '../util/lang_class';
import {reactive} from '../observer/relative'


const CANVAS_INIT_ERROR = new Error('Could not initialize `canvas` element');
// 公共的option内容
export const commonOption = {
    // 背景图片
    backgroundImage: null,
    // 背景颜色
    backgroundColor: ''
};

function deepCopy(target){ 
    let copyed_objs = [];//此数组解决了循环引用和相同引用的问题，它存放已经递归到的目标对象 
    function _deepCopy(target){ 
        if((typeof target !== 'object')||!target){return target;}
        for(let i= 0 ;i<copyed_objs.length;i++){
            if(copyed_objs[i].target === target){
                return copyed_objs[i].copyTarget;
            }
        }
        let obj = {};
        if(Array.isArray(target)){
            obj = [];//处理target是数组的情况 
        }
        copyed_objs.push({target:target,copyTarget:obj}) 
        Object.keys(target).forEach(key=>{ 
            if(obj[key]){ return;} 
            obj[key] = _deepCopy(target[key]);
        }); 
        return obj;
    } 
    return _deepCopy(target);
}

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
    bindOptionObject(param) {
        const keys = Object.keys(this[param]);
        let i = keys.length;
        while (i--) {
            proxy(this, param, keys[i]);
        }
    },

    _initOption(options) {
        // 将constructor.options做深拷贝
        const copyOptions = deepCopy(this.constructor.options);
        // 将options的数据进行响应式
        this._options = reactive(mergeOptions(copyOptions, options, true));
        this.bindOptionObject('_options');
        // 将constructor.shallowOptions做深拷贝
        this._shallow = deepCopy(this.constructor.shallowOptions);
        // 将_shallow中的数据映射到this中
        this.bindOptionObject('_shallow');
    }
};
