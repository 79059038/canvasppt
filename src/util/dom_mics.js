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

/**
 * 返回dom的content距离左侧和顶部的绝对距离（包括滚动轴）
 * @param {Element} element 
 */
export function getElementOffset(element) {
    // 获取dom所属的document
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

    // 将border和paading的left和top进行累加
    for (const attr in offsetAttributes) {
        offset[offsetAttributes[attr]] += parseInt(getElementStyle(element, attr), 10) || 0;
    }

    const docElem = doc.documentElement;
    if (typeof element.getBoundingClientRect !== 'undefined') {
        // 距离视口的所有属性
        box = element.getBoundingClientRect();
    }

    // 获取元素滚动轴滚动距离
    const scrollLeftTop = getScrollLeftTop(element);

    // 举例：left = 距离视口left + 滚动轴left + borderLeft + paddingLeft  - html相对左边框的宽度
    //
    return {
        left: box.left + scrollLeftTop.left - (docElem.clientLeft || 0) + offset.left,
        top: box.top + scrollLeftTop.top - (docElem.clientTop || 0)  + offset.top
    };
}

/**
 * 将传入的dom外层包裹一层element
 */
export function wrapElement (element, wrapper, attributes) {
    if (typeof wrapper === 'string') {
        wrapper = makeElement(wrapper, attributes);
    }
    if (element.parentNode) {
        element.parentNode.replaceChild(wrapper, element);
    }
    wrapper.appendChild(element);
    return wrapper;
}

/**
 * 创建element
 * @param {*} tagName element的name
 * @param {*} attributes element的相关属性
 */
function makeElement(tagName, attributes) {
    var el = document.createElement(tagName);
    for (var prop in attributes) {
      if (prop === 'class') {
        el.className = attributes[prop];
      }
      else if (prop === 'for') {
        el.htmlFor = attributes[prop];
      }
      else {
        el.setAttribute(prop, attributes[prop]);
      }
    }
    return el;
}

/**
 * 设置样式
 * @param {Element} element dom元素
 * @param {Object|Stirng} styles 样式内容
 */
export function setStyle(element, styles) {
    var elementStyle = element.style;
    if (!elementStyle) {
      return element;
    }
    // 如果是string 则直接追加
    if (typeof styles === 'string') {
      element.style.cssText += ';' + styles;
      return styles.indexOf('opacity') > -1
        // 正则匹配获取opacity设置的数值
        ? setOpacity(element, styles.match(/opacity:\s*(\d?\.?\d*)/)[1])
        : element;
    }
    for (var property in styles) {
      if (property === 'opacity') {
        setOpacity(element, styles[property]);
      }
      else {
        var normalizedProperty = (property === 'float' || property === 'cssFloat')
          ? (typeof elementStyle.styleFloat === 'undefined' ? 'cssFloat' : 'styleFloat')
          : property;
        elementStyle[normalizedProperty] = styles[property];
      }
    }
    return element;
}

/**
 * 设置dom元素的Opacity属性
 */
export function setOpacity() {
    element.style.opacity = value;
    return element;
}

const style = document.documentElement.style,
        selectProp = 'userSelect' in style
          ? 'userSelect'
          : 'MozUserSelect' in style
            ? 'MozUserSelect'
            : 'WebkitUserSelect' in style
              ? 'WebkitUserSelect'
              : 'KhtmlUserSelect' in style
                ? 'KhtmlUserSelect'
                : '';

/**
 * 设置dom不可选
 * @param {Element} element 
 */
export function makeElementUnselectable(element) {
    if (typeof element.onselectstart !== 'undefined') {
      element.onselectstart = falseFunction;
    }
    if (selectProp) {
      element.style[selectProp] = 'none';
    }
    else if (typeof element.unselectable === 'string') {
      element.unselectable = 'on';
    }
    return element;
}

function falseFunction() {
    return false;
}

/**
 * 将给定dom添加相应的class
 * @param {Element} element dom对象
 * @param {String} className class名称
 */
function addClass(element, className) {
    if (element && (' ' + element.className + ' ').indexOf(' ' + className + ' ') === -1) {
      element.className += (element.className ? ' ' : '') + className;
    }
}

/**
 * dom的ScrollLeft 和 ScrollTop 即滚动轴位置
 * 如果其中一个父级为fixed布局则累计至该父级的所有 offsets
 * 如果没有fixed的则返回body 的offsets
 * @param {Element} element 
 */
export function getScrollLeftTop(element) {

    let left = 0,
        top = 0
    const docElement = document.documentElement,
        body = document.body || {
          scrollLeft: 0, scrollTop: 0
        };

    // 递归判断.parentNode 或者 .host 为了计算shadowDom
    // shadowDom可提供原生隔离外部环境提供原生组件的功能。
    // shadowDom 存在root节点，表示dom的根节点。且该节点.parentNode为null，.host为实际挂载的dom节点
    while (element && (element.parentNode || element.host)) {
        // 获取dom父级，可能是.parentNode 或者 .host
        element = element.parentNode || element.host;

        if (element === document) {
            left = body.scrollLeft || docElement.scrollLeft || 0;
            top = body.scrollTop ||  docElement.scrollTop || 0;
        }
        else {
            left += element.scrollLeft || 0;
            top += element.scrollTop || 0;
        }
        // fixed布局特殊处理
        if (element.nodeType === 1 && element.style.position === 'fixed') {
            break;
        }
    }

    return { left: left, top: top };
  }