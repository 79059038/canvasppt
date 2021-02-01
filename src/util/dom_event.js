import {getScrollLeftTop} from './dom_mics.js'

const touchEvents = ['touchstart', 'touchmove', 'touchend'];

/**
 * 移除相关dom元素的事件监听
 * @param {Element} element 
 * @param {String} eventName 
 * @param {Function} handler 
 * @param {Object} options 
 */
export function removeListener(element, eventName, handler, options) {
    element && element.removeEventListener(eventName, handler, options);
}

// 触摸事件中changedTouches返回list 表示触摸的点 
// touchstart touchmove touchend 的changedTouches含义不同
// 其实就是返回其中一个点
function getTouchInfo(event) {
    const touchProp = event.changedTouches;
    if (touchProp && touchProp[0]) {
      return touchProp[0];
    }
    return event;
}

/**
 * 获取鼠标点击的真实位置，即包含滚动轴的距离
 * @param {Event} event 
 */
export function getPointer(event) {
    const element = event.target,
        scroll = getScrollLeftTop(element),
        _evt = getTouchInfo(event);
    return {
      x: _evt.clientX + scroll.left,
      y: _evt.clientY + scroll.top
    };
}

export function isTouchEvent(event) {
  return touchEvents.indexOf(event.type) > -1 || event.pointerType === 'touch';
}
