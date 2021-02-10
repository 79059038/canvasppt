export default {
    _objects: [],

    remove(...deleteObjs) {
        const objects = this._objects;
        let index;
        // 存在删除元素的标志
        let somethingRemoved = false; 

        for (let i = 0, length = deleteObjs.length; i < length; i++) {
            index = objects.indexOf(deleteObjs[i]);

            if (index !== -1) {
                somethingRemoved = true;
                objects.splice(index, 1);
                // 删除元素中group标志 dirty置为true
                this._onObjectRemoved && this._onObjectRemoved(deleteObjs[i]);
            }
        }
    },

    /**
     * 返回该group中_objects中某个元素
     * @param {Number} index 
     */
    item(index) {
        return this._objects[index];
    },

    /**
     * 判断某个元素是否在_objects中
     * @param {Object} object 
     */
    contains(object) {
        return this._objects.indexOf(object) > -1;
    },
}