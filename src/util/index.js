import * as misc from './misc';
import * as langClass from './lang_class';
import * as langOrigin from './lang_origin';
import * as domMisc from './dom_mics';

// 返回对象具体类型
export function toTypeString (val) {
    return Object.prototype.toString.call(val).slice(8, -1)
}

const Util = {
    ...misc, ...langClass, ...langOrigin, domMisc
};

export default Util;