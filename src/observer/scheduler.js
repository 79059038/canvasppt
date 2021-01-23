import {cleanup, activeEffect} from './effect';
export const MAX_UPDATE_COUNT = 100;

const queue = [];
let has = {};
const hasComputeQueue = [];
let hasCom = {};
let waiting = false;
let index = 0;
let comIndex = 0;

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState() {
    index = queue.length = 0;
    has = {};
}

function resetComputedState(index) {
    hasComputeQueue = hasComputeQueue.slice(index)
    comIndex = 0;
}


export let currentFlushTimestamp;

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow = () => Date.now;

const {performance} = window;
if (typeof performance.now === 'function') {
    getNow = () => performance.now();
}

/**
 * 通过requestanimationframe循环调用的方法。后续增加先循环调用
 */
function flushSchedulerQueue() {
    // TODO 计算浏览器渲染间隔方案

    // 所有执行完成 即不再调用该方法。否则循环调用
    if (waiting) {
        return;
    }
    let id;

    // 先判断需渲染的effect队列  存在即立刻开始渲染
    if (queue.length) {
        for (index = 0; index < queue.length; index++) {
            activeEffect = queue[index];
            ({id} = activeEffect);
            has[id] = null;
            activeEffect.run();
        }
        resetSchedulerState();
    }

    // 再判断需要computed的effect队列
    if (hasComputeQueue.length) {
        for (comIndex = 0; comIndex < hasComputeQueue.length; comIndex++) {
            activeEffect = hasComputeQueue[comIndex];
            // 若中断数为0 说明这次是重新开始 则先清空已收集的依赖
            if (activeEffect.break === 0) {
                cleanup(activeEffect);
            }
            
            ({id} = activeEffect);
            // TODO 需要传入需要截止的时间
            const result = activeEffect.computed();
            // 根据运行结果,如果是正常执行则将其置空, 且加入渲染队列 如果是时间太长中断导致则直接退出循环
            if (!result.break) {
                hasCom[id] = null;
                queueEffect(activeEffect);
            }
            else {
                break;
            }
        }
        resetComputedState(comIndex);
    }

    // 如果渲染队列和计算队列都为空 则进入等待状态
    if (hasComputeQueue.length === 0 && queue.length === 0) {
        waiting = true;
    }

    nextTick(flushSchedulerQueue);
}

export function nextTick(cb) {
    window.requestAnimationFrame(cb);
}

/**
 * 将需要渲染的effect放入渲染队列中
 */
export function queueEffect(effect) {
    const {id} = effect;
    // 执行过的has[id] 会被置为null
    if (has[id] == null) {
        has[id] = true;
        queue.push(effect);
        // 如果当前队列为空 则启动循环事件
        if (waiting) {
            waiting = false;
            nextTick(flushSchedulerQueue);
        }
    }
}

export function queueHasComputedEffect(effect) {
    const {id} = effect;
    // 执行过的has[id] 会被置为null
    if (hasCom[id] == null) {
        hasCom[id] = true;
        hasComputeQueue.push(effect);
        // 如果当前队列为空 则启动循环事件
        if (waiting) {
            waiting = false;
            nextTick(flushSchedulerQueue);
        }
    }
    else {
        // 说明该计算引入有了新的数据变动，将记录上次计算中断的数字改为0 即下次全部重新计算
        // 感觉还有优化空间 后续再说
        effect.break = 0;
    }
}
