import * as misc from './misc';
import * as langClass from './lang_class';
import * as langOrigin from './lang_origin';
import * as domMisc from './dom_mics';

const Util = {...misc, ...langClass, ...langOrigin, domMisc};

export default Util;