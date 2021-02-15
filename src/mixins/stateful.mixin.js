function _isEqual(origValue, currentValue, firstPass) {
    if (origValue === currentValue) {
      // if the objects are identical, return
        return true;
    }
    else if (Array.isArray(origValue)) {
        if (!Array.isArray(currentValue) || origValue.length !== currentValue.length) {
            return false;
        }
        for (let i = 0, len = origValue.length; i < len; i++) {
            if (!_isEqual(origValue[i], currentValue[i])) {
                return false;
            }
        }
        return true;
    }
    else if (origValue && typeof origValue === 'object') {
        const keys = Object.keys(origValue), key;
        if (!currentValue ||
            typeof currentValue !== 'object' ||
            (!firstPass && keys.length !== Object.keys(currentValue).length)
        ) {
            return false;
        }
        for (let i = 0, len = keys.length; i < len; i++) {
            key = keys[i];
            // since clipPath is in the statefull cache list and the clipPath objects
            // would be iterated as an object, this would lead to possible infinite recursion
            if (key === 'canvas') {
                continue;
            }
            if (!_isEqual(origValue[key], currentValue[key])) {
                return false;
            }
        }
        return true;
    }
  }

export default {
    hasStateChanged(propertySet) {
        propertySet = propertySet || originalSet;
        var dashedPropertySet = '_' + propertySet;
        if (Object.keys(this[dashedPropertySet]).length < this[propertySet].length) {
          return true;
        }
        return !_isEqual(this[dashedPropertySet], this, true);
    }
}