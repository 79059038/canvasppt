// 根据提供的ele返回相关style样式
export function getElementStyle(element, attr) {
    if (window.getComputedStyle) {
        const style = window.getComputedStyle(element, null);
        return style ? style[attr] : null;
    }
    let value = element.style[attr];
    if (!value && element.currentStyle) {
        value = element.currentStyle[attr];
    }
    return value;
}

/**
 * 获取元素左侧与顶部滚动条叠加长度
 * @param {Element} element
 */
export function getScrollLeftTop(element) {
    let left = 0;
    let top = 0;
    const docElement = document.documentElement;
    const body = document.body || {
        scrollLeft: 0, scrollTop: 0
    };

    // 不断向上寻找 叠加左侧与顶部滚动条位置
    while (element && (element.parentNode || element.host)) {

        // Set element to element parent, or 'host' in case of ShadowDOM
        element = element.parentNode || element.host;

        if (element === document) {
            left = body.scrollLeft || docElement.scrollLeft || 0;
            top = body.scrollTop || docElement.scrollTop || 0;
        }
        else {
            left += element.scrollLeft || 0;
            top += element.scrollTop || 0;
        }

        if (element.nodeType === 1 && element.style.position === 'fixed') {
            break;
        }
    }

    return {left, top};
}

/**
 * 创建canvas dom
 */
export function createCanvasElement() {
    return document.createElement('canvas');
}

/**
 * 创建img dom
 */
export function createImage() {
    return document.createElement('img');
}

/**
 * 加载图片
 * @param {String} url
 */
export function loadImage(url, crossOrigin) {
    return new Promise((res, rej) => {
        if (!url) {
            rej(new Error('url为空'));
        }
        let img = createImage();
        img.onload = function loadImgResult() {
            res(img);
        };
        img.onerror = function loadImgError() {
            rej(new Error(`Error loading ${url}`));
            img = img.onload = img.onerror = null;
        };

        // data数据源的图片 需增加跨域标签
        if (url.indexOf('data') !== 0 && crossOrigin) {
            img.crossOrigin = crossOrigin;
        }

        // TODO 特殊处理svg相关

        img.src = url;
    });
}

/**
 * 根据id获取dom
 * @param {String} id
 */
export function getById(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
}

/**
 *  为dom增加class
 * @param {dom} element
 * @param {String} className
 */
export function addClass(element, className) {
    if (element && element.className.indexOf(className) === -1) {
        element.className += (element.className ? ' ' : '') + className;
    }
}

export function getElementOffset(element) {
    const doc = element && element.ownerDocument;
    let box = {left: 0, top: 0};
    const offset = {left: 0, top: 0};
    const offsetAttributes = {
        borderLeftWidth: 'left',
        borderTopWidth: 'top',
        paddingLeft: 'left',
        paddingTop: 'top'
    };
    if (!doc) {
        return offset;
    }

    for (const attr in offsetAttributes) {
        if (attr in offsetAttributes) {
            offset[offsetAttributes[attr]] += parseInt(getElementStyle(element, attr), 10) || 0;
        }
    }

    const docElem = doc.documentElement;
    if (typeof element.getBoundingClientRect !== 'undefined') {
        box = element.getBoundingClientRect();
    }

    const scrollLeftTop = getScrollLeftTop(element);

    return {
        left: box.left + scrollLeftTop.left - (docElem.clientLeft || 0) + offset.left,
        top: box.top + scrollLeftTop.top - (docElem.clientTop || 0)  + offset.top
    };
}
