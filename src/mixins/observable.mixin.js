// 此文件方法主要是用来注册绑定canvas与object相关钩子函数 
/**
   *清掉相应的注册事件 传入handler的话就单独清除 未传入就整个都清空
   * @private
   * @param {String} eventName
   * @param {Function} handler
   */
function _removeEventListener(eventName, handler) {
    if (!this.__eventListeners[eventName]) {
        return;
    }
    const eventListener = this.__eventListeners[eventName];
    if (handler) {
        eventListener[eventListener.indexOf(handler)] = false;
    }
    else {
        Array.fill(eventListener, false);
    }
}

export default {
    /**
     * 触发相应的事件, 根据事件名称调用相应的回调函数，并传入option.
     * 以下为举例 options中有啥参数
     * options = {
            e: e,
            target: target,
            subTargets: targets,
            button: button || LEFT_CLICK,
            isClick: isClick || false,
            pointer: this._pointer,
            absolutePointer: this._absolutePointer,
            transform: this._currentTransform
        };
    * @param {*} eventName
    * @param {*} options
    */
    fire(eventName, options) {
        // 先判断有没有事件队列
        if (!this.__eventListeners) {
            return this;
        }
        // 再判断有没有相应事件函数
        const listenersForEvent = this.__eventListeners[eventName];
        if (!listenersForEvent) {
            return this;
        }
        // 绑定this后在触发函数
        for (let i = 0, len = listenersForEvent.length; i < len; i++) {
            listenersForEvent[i] && listenersForEvent[i].call(this, options || { });
        }
        this.__eventListeners[eventName] = listenersForEvent.filter(value => value !== false);
        return this;
    },

    /**
     * 注册函数
     * @param {String|Object} eventName
     * @param {Function} handler 相应钩子要执行的函数
     */
    on(eventName, handler) {
        if (!this.__eventListeners) {
            this.__eventListeners = { };
        }
        // 有可能只传入一个对象 属性值即为事件名称  值为方法
        if (arguments.length === 1) {
            for (const prop in eventName) {
                if (prop in eventName) {
                    this.on(prop, eventName[prop]);
                }
            }
        }
        // 将需要注册的函数丢到队列中
        else {
            if (!this.__eventListeners[eventName]) {
                this.__eventListeners[eventName] = [];
            }
            this.__eventListeners[eventName].push(handler);
        }
        return this;
    },

    off(eventName, handler) {
        if (!this.__eventListeners) {
            return this;
        }
    
        // 未传入eventName时把所有事件都注销
        if (!eventName) {
            for (eventName in this.__eventListeners) {
                if (eventName in this.__eventListeners) {
                    _removeEventListener.call(this, eventName);
                }
            }
        }
        // 传入的是对象时 分别调用注销
        else if (typeof eventName === 'object') {
            for (const prop in eventName) {
                if (prop in eventName) {
                    _removeEventListener.call(this, prop, eventName[prop]);
                }
            }
        }
        // 注销相应的方法
        else {
            _removeEventListener.call(this, eventName, handler);
        }
        return this;
    }
}