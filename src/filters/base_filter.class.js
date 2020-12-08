import {createClass, emptyFunction} from '../util/lang_class';
import ImageClass from '../shapes/image.class';

const baseFilterClass = createClass(emptyFunction, {}, {
    type: 'BaseFilter',
    // 仅用于image的applyFilters 去舍弃一些对image没有影响的滤镜
    isNeutralState() {
        // 子类的属性
        const main = this.mainParameter;
        // 就是指的filter相关class函数
        const _class = ImageClass.filters[this.type].prototype;
        // 没看懂是什么鬼玩意
        if (main) {
            if (Array.isArray(_class[main])) {
                for (let i = _class[main].length; i--;) {
                    if (this[main][i] !== _class[main][i]) {
                        return false;
                    }
                }
                return true;
            }
            return _class[main] === this[main];
        }
    }
});

export default baseFilterClass;
