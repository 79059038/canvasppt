/**
 * Check whether an object has the property.
 */
const {hasOwnProperty} = Object.prototype;
export function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key);
}
