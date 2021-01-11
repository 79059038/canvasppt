export function find(array, byProperty, condition) {
    if (!array || array.length === 0) {
        return;
    }

    let i = array.length - 1;
    let result = byProperty ? array[i][byProperty] : array[i];
    if (byProperty) {
        while (i--) {
            if (condition(array[i][byProperty], result)) {
                result = array[i][byProperty];
            }
        }
    }
    else {
        while (i--) {
            if (condition(array[i], result)) {
                result = array[i];
            }
        }
    }
    return result;
}

/**
 * 寻找数组中最小值
 * @param {*} array - 数组
 * @param {*} byProperty - 属性
 */
export function min(array, byProperty) {
    return find(array, byProperty, (value1, value2) => value1 < value2);
}

/**
 * 寻找数组中最小值
 * @param {*} array - 数组
 * @param {*} byProperty - 属性
 */
export function max(array, byProperty) {
    return find(array, byProperty, (value1, value2) => value1 >= value2);
}

/**
 * 判断是合法的数字key值
 * @param {String} key 
 */
export function isIntegerKey(key) {
    return isString(key) &&
        key !== 'NaN' &&
        key[0] !== '-' &&
        '' + parseInt(key, 10) === key
}

export function isArray (val) {
    return Array.isArray(val)
}