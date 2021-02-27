import {track, trigger, TrackOpTypes, ITERATE_KEY, TriggerOpTypes} from './effect';
import {isIntegerKey, isArray} from '@/util/lang_array.js'
import {hasOwn} from '@/util/lang_object.js'
import {toTypeString} from '@/util/index.js'

// this指代proxy对象
const mutableInstrumentations = {
    get(key) {
        return collectget(this, key)
    },
    get size() {
        return size(this)
    },
    has,
    add,
    set: collectset,
    delete: deleteEntry,
    clear,
}

// 映射后给proxy添加的个性化属性 主要用来区分不同响应式对象
export const  ReactiveFlags = {
    SKIP: '__v_skip',
    IS_REACTIVE: '__v_isReactive',
    IS_READONLY: '__v_isReadonly',
    RAW: '__v_raw'
}
// 对象类型 主要包括非法 一般 和集合
const  TargetType = {
    INVALID: 0,
    COMMON: 1,
    COLLECTION: 2
}

// 原对象与映射对象 记录map 使用weakMap 方便垃圾回收
export const reactiveMap = new WeakMap();

// 工具方法 判断是否是对象
function isObject (val) {
    return val !== null && typeof val === 'object'
}

// 工具方法 判断新老数据是否已经变化 包括NaN
export const hasChanged = (value, oldValue) =>
  value !== oldValue && (value === value || oldValue === oldValue)

// 工具方法 判断对象类型
function getTargetType(value) {
    return !Object.isExtensible(value)
        ? TargetType.INVALID
        : targetTypeMap(toTypeString(value))
}

// 工具方法 根据对象类型返回TargetType配置类型
function targetTypeMap(rawType) {
    switch (rawType) {
      case 'Object':
      case 'Array':
        return TargetType.COMMON
      case 'Map':
      case 'Set':
      case 'WeakMap':
      case 'WeakSet':
        return TargetType.COLLECTION
      default:
        return TargetType.INVALID
    }
}

// 工具方法 检查对象是否有ReactiveFlags.RAW属性,存在即返回该属性，否则返回原对象
export function toRaw(observed){
    return (
      (observed && toRaw(observed[ReactiveFlags.RAW])) || observed
    )
}

// 工具方法 获取原型
const getProto =(v) => Reflect.getPrototypeOf(v)
// 工具方法 将一个对象做成响应式
const toReactive = (value) => isObject(value) ? reactive(value) : value
// 工具方法 判断是否是map
export const isMap = (val) => toTypeString(val) === 'Map'


/**
 * vue使用柯里化 产生不同的get函数 这里就暂时不搞这么复杂，默认全部都可改 全部深层次监听
 * @param {*} isReadonly 
 * @param {*} shallow 
 */
function createGetter(isReadonly = false) {
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (
            key === ReactiveFlags.RAW &&
            receiver === reactiveMap.get(target)
        ) {
            return target
        }


        const res = Reflect.get(target, key, receiver)

        if (!isReadonly) {
            track(target, 'get', key)
        }

        return res
    }
}

/**
 * vue使用柯里化 产生不同的set函数
 */
function createSetter () {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]
        value = toRaw(value)
        const hadKey =
            isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key)
        const result = Reflect.set(target, key, value, receiver)
        // 如果属性属于原型链上则不使用trigger方法
        if (target === toRaw(receiver)) {
            // 根据该key值是原有还是新增使用不同方法
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value)
            }
            else if (hasChanged(value, oldValue)) {
                trigger(target, TriggerOpTypes.SET, key, value, oldValue)
            }
        }
        return result
    }
}

const get = createGetter()
const set = createSetter()

function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const oldValue = target[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
}

// 普通对象proxy的handle
const mutableHandlers = {
    get,
    set,
    deleteProperty
}

// 数组与集合相关的proxy的handle 因为集合的proxy本身存在缺陷 不能直接proxy调用set等方法
// 只监听get方法，若key值是get|size|set|has|add|delete|clear等方法，直接从proxy的ReactiveFlags.RAW获取原对象
// 再调用原对象的方法进行操作
const mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
}

// 创建集合类handler的get 主要使用mutableInstrumentations中 若该对象中有key值且key属于target 则目标是该对象，否则是target
function createInstrumentationGetter() {
    const instrumentations = mutableInstrumentations
  
    return (target, key, receiver) => {
      if (key === ReactiveFlags.RAW) {
        return target
      }
  
      return Reflect.get(
        hasOwn(instrumentations, key) && key in target
          ? instrumentations
          : target,
        key,
        receiver
      )
    }
}

/**
 * 根据get获取proxy方法
 * @param {proxy} target 
 * @param {*} key 
 */
function collectget(target, key) {
    target = target[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    // 可能key 值也是响应式对象
    if (key !== rawKey) {
        track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
    const { has } = getProto(rawTarget)
    const wrap = toReactive
    if (has.call(rawTarget, key)) {
      return wrap(target.get(key))
    } else if (has.call(rawTarget, rawKey)) {
      return wrap(target.get(rawKey))
    }
}

function size(target) {
    target = target[ReactiveFlags.RAW]
    track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
}

function has(key) {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        track(rawTarget, TrackOpTypes.HAS, key)
    }
    track(rawTarget, TrackOpTypes.HAS, rawKey)
    // key 优先级比rawKey高
    return key === rawKey
      ? target.has(key)
      : target.has(key) || target.has(rawKey)
}

function add(value) {
    value = toRaw(value)
    const target = toRaw(this)
    const proto = getProto(target)
    const hadKey = proto.has.call(target, value)
    const result = target.add(value)
    // 如果是新增属性则增加监听
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, value, value)
    }
    return result
}

function collectset(key, value) {
    value = toRaw(value)
    const target = toRaw(this)
    const { has, get } = getProto(target)
  
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
  
    const oldValue = get.call(target, key)
    const result = target.set(key, value)
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return result
}

function deleteEntry(key) {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
  
    const oldValue = get ? get.call(target, key) : undefined
    // forward the operation before queueing reactions
    const result = target.delete(key)
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
}

function clear() {
    const target = toRaw(this)
    const hadItems = target.size !== 0
      ? isMap(target)
        ? new Map(target)
        : new Set(target)
      : undefined
    // forward the operation before queueing reactions
    const result = target.clear()
    if (hadItems) {
      trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, undefined)
    }
    return result
}


/**
 * 创建映射对象
 * @param {Object} target 
 * @param {Object} baseHandlers 
 * @param {Object} collectionHandlers 
 */
function createReactiveObject(target, baseHandlers, collectionHandlers) {
    if (!isObject(target)) {
        return target
    }

    // target已经是proxy对象
    if (target[ReactiveFlags.RAW]) {
        return target
    }

    // 该对象是普通对象,从map中检查是否已经存在proxy对象
    const existingProxy = reactiveMap.get(target)
    if (existingProxy) {
        return existingProxy
    }

    const targetType = getTargetType(target)
    if (targetType === TargetType.INVALID) {
        return target
    }

    const proxy = new Proxy(
        target,
        targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
    )
    reactiveMap.set(target, proxy)
    return proxy
}

/**
 * 创建映射对象工厂方法，传入handler
 * @param {*} target 对象
 */
export function reactive (target){
    return createReactiveObject(
        target,
        mutableHandlers,
        mutableCollectionHandlers
      )
}