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

function resetComputedState() {
    comIndex = hasComputeQueue.length = 0;
    hasCom = {};
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
    // 所有执行完成 即不再调用该方法。否则循环调用
    if (waiting) {
        return;
    }
    let watcher; let id;

    // 先判断需渲染的watcher队列  存在即立刻开始渲染
    if (queue.length) {
        for (index = 0; index < queue.length; index++) {
            watcher = queue[index];
            ({id} = watcher);
            has[id] = null;
            watcher.run();
        }
        resetSchedulerState();
    }
    // 再判断需要computed的watcher队列
    // TODO 根据时间做类似react的中断处理
    if (hasComputeQueue.length) {
        for (comIndex = 0; comIndex < hasComputeQueue.length; comIndex++) {
            watcher = hasComputeQueue[comIndex];
            ({id} = watcher);
            const result = watcher.computed();
            // 根据运行结果,如果是正常执行则将其置空, 且加入渲染队列 如果是时间太长中断导致则直接退出循环
            if (!result.break) {
                hasCom[id] = null;
                queueWatcher(watcher);
            }
            else {
                break;
            }
        }
        resetComputedState();
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
 * 将需要渲染的watcher放入渲染队列中
 */
export function queueWatcher(watcher) {
    const {id} = watcher;
    // 执行过的has[id] 会被置为null
    if (has[id] == null) {
        has[id] = true;
        queue.push(watcher);
        // 如果当前队列为空 则启动循环事件
        if (waiting) {
            waiting = false;
            nextTick(flushSchedulerQueue);
        }
    }
}

export function queueHasComputedWatcher(watcher) {
    const {id} = watcher;
    // 执行过的has[id] 会被置为null
    if (hasCom[id] == null) {
        hasCom[id] = true;
        hasComputeQueue.push(watcher);
        // 如果当前队列为空 则启动循环事件
        if (waiting) {
            waiting = false;
            nextTick(flushSchedulerQueue);
        }
    }
}
