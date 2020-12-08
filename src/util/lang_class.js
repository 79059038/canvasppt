import {
    hasOwn
} from './lang_origin.js';
import {PPTCanvas} from '../HEADER'

export const emptyFunction = function () { };

/**
 * 根据父类创建子类
 * @param {*} parent 父类方法
 * @param {*} extendOption 可供外界变更操作的属性
 * @param {*} extendFunction 该类内部相关属性与方法
 */
export function createClass(parent, extendOptions, extendFunction, className) {
    const child = function (...options) {
        // 初始化option 主要和类option合并以及产生映射 可直接this.  第一个参数默认为option
        this._initOption(options[0]);
        this.initialize(...options);
    };
    // 记录父级关系
    child.superclass = parent;
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
    // 方便子类调用父级
    child.prototype.callSuper = callSuper;

    // 合并该类型function的option属性
    child.options = mergeOptions(
        parent.options,
        extendOptions
    );

    mergeFunction(child, extendFunction);

    // 必须要有初始化函数
    if (!child.prototype.initialize) {
        child.prototype.initialize = emptyFunction;
    }
    // 将该class关联到总的对象属性中。方便后续根据参数object创建相关图形实例
    if (className) {
        PPTCanvas[className] = child;
    }

    return child;
}

/**
 * 合并option信息，后续只提供操作option相关
 */
export function mergeOptions(parent, child) {

    const options = {};

    for (const key in parent) {
        mergeField(key);
    }

    for (const key in child) {
        if (hasOwn(parent, child)) {
            mergeField(key);
        }
    }

    function mergeField(key) {
        options[key] = child[key] ? parent[key] : child[key];
    }

    return options;
}

/**
 * 合并新提供的方法.主要方便后续新类能有自己独有的方法
 * @param {*} child
 * @param {*} extendFunction
 */
function mergeFunction(child, extendFunction) {
    for (const property in extendFunction) {
        if (extendFunction[property]) {
            child.prototype[property] = extendFunction[property];
        }
    }
}

const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: emptyFunction,
    set: emptyFunction
};

/**
 * 创建对象内部映射
 */
export function proxy(target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key];
    };
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val;
    };
    Object.defineProperty(target, key, sharedPropertyDefinition);
}

function callSuper(...[options]) {
    const methodName = options[0];
    let parentMethod = null;
    let _this = this;

    // climb prototype chain to find method not equal to callee's method
    while (_this.constructor.superclass) {
        const superClassMethod = _this.constructor.superclass.prototype[methodName];
        if (_this[methodName] !== superClassMethod) {
            parentMethod = superClassMethod;
            break;
        }
        // eslint-disable-next-line
      _this = _this.constructor.superclass.prototype;
    }

    if (!parentMethod) {
        return console.log(`tried to callSuper ${methodName}, method not found in prototype chain`, this);
    }

    return (arguments.length > 1)
        ? parentMethod.apply(this, options.slice(1))
        : parentMethod.call(this);
}