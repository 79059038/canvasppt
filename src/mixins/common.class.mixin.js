import {createClass, emptyFunction} from '../util/lang_class';
import {commonOption, commonFunction} from './common.mixin';
import observable from './observable.mixin.js'

const Common = createClass(emptyFunction, commonOption, {...commonFunction, ...observable});

export default Common;
