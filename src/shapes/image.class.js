import {createClass} from '../util/lang_class';
import {getById, addClass} from '../util/dom_mics';
import ObjectCanvas from './object.class';


const ImageClass = createClass(ObjectCanvas, {
    // 滤镜列表
    filters: []
}, {
    type: 'image',
    dirty: false,
    // 应执行滤镜链中最后一个值
    _filterScalingX: 1,
    _filterScalingY: 1,
    initialize(option, ele) {
        this.cacheKey = `texture${ObjectCanvas.__uid++}`;
        this._initElement(ele);
    },
    setElement(element) {
        // 不知道这俩是干啥的
        // this.removeTexture(this.cacheKey);
        // this.removeTexture(`${this.cacheKey}_filtered`);
        this._element = element;
        this._originalElement = element;
        this._initConfig(element);
        // 如果有滤镜要执行滤镜
        if (this.filters.length !== 0) {
            this.applyFilters();
        }
        // 普通过滤后再执行 resizeFilters。它会比普通过滤执行频率高，且应该被用户操作触发
        if (this.resizeFilter) {
            this.applyResizeFilters();
        }
        return this;
    },
    // 初始化宽高
    _initConfig(el) {
        if (!this.width) {
            this.width = el.naturalWidth || el.width || 0;
        }
        if (!this.height) {
            this.height = el.naturalHeight || el.height || 0;
        }
    },
    // 主要初始img的DOM元素
    _initElement(ele) {
        this.setElement(getById(ele));
        addClass(this.getElement(), ImageClass.CSS_CANVAS);
    },
    // 返回当前Image对象的element
    getElement() {
        return this._element || {};
    },
    // 执行过滤器
    applyFilters(filters) {
        // filters = filters || this.filters || [];
        // filters = filters.filter(filter => filter && !filter.isNeutralState());

        // this.dirty = true;
        // // this.removeTexture(`${this.cacheKey}_filtered`);
        // if (filters.length === 0) {
        //     this._element = this._originalElement;
        //     this._filteredEl = null;
        //     this._filterScalingX = 1;
        //     this._filterScalingY = 1;
        //     return this;
        // }

        // const imgElement = this._originalElement;
        // const sourceWidth = imgElement.naturalWidth || imgElement.width;
        // const sourceHeight = imgElement.naturalHeight || imgElement.height;

        // if (this._element === this._originalElement) {
        // // if the element is the same we need to create a new element
        //     var canvasEl = fabric.util.createCanvasElement();
        //     canvasEl.width = sourceWidth;
        //     canvasEl.height = sourceHeight;
        //     this._element = canvasEl;
        //     this._filteredEl = canvasEl;
        // }
        // else {
        // // clear the existing element to get new filter data
        // // also dereference the eventual resized _element
        //     this._element = this._filteredEl;
        //     this._filteredEl.getContext('2d').clearRect(0, 0, sourceWidth, sourceHeight);
        //     // we also need to resize again at next renderAll, so remove saved _lastScaleX/Y
        //     this._lastScaleX = 1;
        //     this._lastScaleY = 1;
        // }
        // if (!fabric.filterBackend) {
        //     fabric.filterBackend = fabric.initFilterBackend();
        // }
        // fabric.filterBackend.applyFilters(filters, this._originalElement, sourceWidth, sourceHeight, this._element, this.cacheKey);
        // if (this._originalElement.width !== this._element.width ||
        //     this._originalElement.height !== this._element.height) {
        //     this._filterScalingX = this._element.width / this._originalElement.width;
        //     this._filterScalingY = this._element.height / this._originalElement.height;
        // }
        // return this;
    },
    applyResizeFilters() {
        console.log();
    }
});

ImageClass.CSS_CANVAS = 'canvas-img';

export default ImageClass;
