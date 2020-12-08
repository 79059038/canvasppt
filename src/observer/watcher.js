import Dep, {pushTarget, popTarget} from './dep';
import {queueHasComputedWatcher} from './scheduler.js';

/** CanvasClass所绑定的事件收集Class */
export default class Watcher {

    /**
     * 构建方法
     * @param {CanvasClass} cs - CanvasClass实例
     * @param {Function} fn - CanvasClass实例所包含的渲染对象 计算方法
     * @param {Function} frenderFn - CanvasClass实例所包含的渲染方法
     */
    constructor(cs, fn, renderFn) {
        this.cs = cs;
        this.deps = [];
        this.newDeps = [];
        this.depIds = new Set();
        this.newDepIds = new Set();
        this.getter = fn;
        this.renderFn = renderFn;
        this.computedValue = this.get();
    }

    /**
     * 执行当前watcher的computed方法。目前来说只有canvas对应的所有_computedList计算内容
     */
    get() {
        // 将当前正在渲染的watcher推入顶层
        pushTarget(this);
        let value;
        const {cs} = this;
        try {
            // 执行当前watcher回调方法， canvas的话就是循环需要重新计算的元素进行计算
            value = this.getter.call(cs, cs);
        }
        catch (e) {
            console.log(e);
            throw e;
        }
        finally {
            // 当前渲染watcher已经更新完成，直接弹出
            popTarget();
        }
        return value;
    }

    /**
     * 一般是canvas对应的computed队列计算完成 将该watcher放入队列后 开始进行canvas整体渲染时使用方法
     */
    run() {
        // 将当前正在渲染的watcher推入顶层
        pushTarget(this);
        let value;
        const {cs} = this;
        try {
            // 执行当前watcher回调方法， canvas的话就是循环需要重新计算的元素进行计算
            value = this.renderFn.call(cs, cs);
        }
        catch (e) {
            console.log(e);
            throw e;
        }
        finally {
            // 当前渲染watcher已经更新完成，直接弹出
            popTarget();
            // 清空旧的收集的依赖
            this.cleanupDeps();
        }
        return value;
    }

    /**
     * 新收集的依赖时调用该方法。根据id判断是否已经收集，否则添加到dep数组，并将dep对象添加当前watcher依赖
     * @param {*} dep - dep实例
     */
    addDep(dep) {
        const {id} = dep;
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
    }

    /**
     * 清空上次更新时收集的依赖
     */
    cleanupDeps() {
        let i = this.deps.length;
        // 先将已经不需收集的Dep对象中 指向的watcher依赖去掉
        while (i--) {
            const dep = this.deps[i];
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this);
            }
        }
        let tmp = this.depIds;
        this.depIds = this.newDepIds;
        this.newDepIds = tmp;
        this.newDepIds.clear();
        tmp = this.deps;
        this.deps = this.newDeps;
        this.newDeps = tmp;
        this.newDeps.length = 0;
    }

    update() {
        queueHasComputedWatcher(this);
    }
}
