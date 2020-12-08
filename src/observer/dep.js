let uid = 0;

function remove(arr, item) {
    if (arr.length) {
        const index = arr.indexOf(item);
        if (index > -1) {
            return arr.splice(index, 1);
        }
    }
}

/** Dep对象是所有元素对象的所有属性各自对应 */
export default class Dep {
    static target;

    constructor() {
        this.id = uid++;
        this.subs = [];
    }

    /**
     * watcher放置到该list中
     * @param {*} sub - watcher
     */
    addSub(sub) {
        this.subs.push(sub);
    }

    /**
     * 将watcher从list中去掉
     * @param {*} sub - watcher
     */
    removeSub(sub) {
        remove(this.subs, sub);
    }

    /**
     * 当前正在运行的watcher增加该dep对象
     */
    depend() {
        if (Dep.target) {
            Dep.target.addDep(this);
        }
    }

    /**
     * 通知关联watcher进行更新重绘
     */
    notify() {
        const subs = this.subs.slice();
        for (let i = 0, l = subs.length; i < l; i++) {
            subs[i].update();
        }
    }
}

Dep.target = null;
const targetStack = [];

export function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target;
}

export function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
}
