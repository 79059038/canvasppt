import {queueHasComputedEffect} from './scheduler.js'
import {isArray, isIntegerKey} from '@/util/lang_array.js'
export const TrackOpTypes = {
    GET: 'get',
    HAS: 'has',
    ITERATE: 'iterate'
}
export const TriggerOpTypes = {
    SET: 'set',
    ADD: 'add',
    DELETE: 'delete',
    CLEAR: 'clear'
}

let uid = 0;
// 当前正在渲染的Effect
export let activeEffect = void 0;
// 以target为key 的映射对象。映射值为depsMap
const targetMap = new WeakMap()

export function effect(computed, render, options) {
    const effect = createReactiveEffect(computed, render, options)
    // vue的computed是lazy的 只有依赖的数据变更才会让computed重新计算
    if (!options.lazy) {
        effect()
    }
    return effect
}
//将effect包装后再返回
function createReactiveEffect (computed, render, options) {
    const effect = function reactiveEffect() {
        return computed()
    }
    effect.id = uid++
    effect.active = true
    effect.computed = computed
    effect.render = render;
    effect.deps = []
    effect.options = options
    // 中断数字。主要是记录computed若因时间原因中断 记录已经计算到第几个数据
    effect.break = 0
    return effect
}

/**
 * 做后续清理工作 获取deps后将已经收集的当前effect取消掉
 * @param {effect} effect 
 */
export function cleanup(effect) {
    const { deps } = effect
    if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
        deps[i].delete(effect)
      }
      deps.length = 0
    }
  }

/**
 * 依赖收集工作
 * @param {Object} target 
 * @param {String} key 
 */
export function track(target, type,key) {
    if(activeEffect === undefined) {
        return
    }
    // 先检测target对象的映射是否已经保存过
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    // 再检测该target的Map中是否已经有key值得Set
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    // 最后检测是否dep中是否已经保存该Watcher 没有的话dep和Watcher相互引用
    if(dep.has(activeEffect)) {
        dep.add(activeEffect)
        activeEffect.deps.push(dep)
    }
}

export const ITERATE_KEY = Symbol('iterate')
export const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate')

export const isMap = (val) =>
  toTypeString(val) === '[object Map]'

export function trigger(target, type, key, newValue, oldValue, oldTarget) {
    const depsMap = targetMap.get(target)
    // 整个对象没被收集过依赖
    if (!depsMap) {
        return
    }

    const effects = new Set()
    // 循环方法 获取所有effect对象
    const add = (effectsToAdd) => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => {
                if (effect !== activeEffect) {
                  effects.add(effect)
                }
            })
        }
    }

    if (type === TriggerOpTypes.CLEAR) {
        depsMap.forEach(add)
    } else if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            // 只有依赖length或者大于新设置的length的key值才需要更新。即删除了的数组值
            if (key === 'length' || key >= newValue) {
              add(dep)
            }
        })
    } else {
        if (key !== void 0) {
            add(depsMap.get(key))
        }

        // 在ADD|DELETE|SET 时相应迭代key值收集的effect也需要运行
        switch (type) {
            case TriggerOpTypes.ADD:
                // 如果是普通对象 
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY))
                    if (isMap(target)) {
                        add(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                } else if (isIntegerKey(key)) {
                    add(depsMap.get('length'))
                }
                break
            case TriggerOpTypes.DELETE:
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY))
                    if (isMap(target)) {
                        add(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                }
            break
            case TriggerOpTypes.SET:
                if (isMap(target)) {
                    add(depsMap.get(ITERATE_KEY))
                }
            break
        }
    }

    // 将需要重新渲染的effect加入到队列中
    const run = (effect) => {
        queueHasComputedEffect(effect)
    }

    effects.forEach(run)
}