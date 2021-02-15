import ActiveSelection from '../shapes/active_selection.class.js';
import Point from '../publicClass/point.class';
export default {
    _shouldGroup(e, target) {
        const activeObject = this._activeObject;
        return activeObject && this._isSelectionKeyPressed(e) && target && target.selectable && this.selection &&
            (activeObject !== target || activeObject.type === 'activeSelection') && !target.onSelect({ e: e });
    },


    _handleGrouping(e, target) {
        const activeObject = this._activeObject;
        // avoid multi select when shift click on a corner
        if (activeObject.__corner) {
            return;
        }
        if (target === activeObject) {
            // if it's a group, find target again, using activeGroup objects
            target = this.findTarget(e, true);
            // if even object is not found or we are on activeObjectCorner, bail out
            if (!target || !target.selectable) {
                return;
            }
        }
        if (activeObject && activeObject.type === 'activeSelection') {
            this._updateActiveSelection(target, e);
        }
        else {
            this._createActiveSelection(target, e);
        }
    },

    /**
     * 创建新的active groups
     * @param {Object} target 
     * @param {Event} e 
     */
    _createActiveSelection: function(target, e) {
        const currentActives = this.getActiveObjects()
        const group = this._createGroup(target);
        this._hoveredTarget = group;
        this._setActiveObject(group, e);
        this._fireSelectionEvents(currentActives, e);
    },

    _createGroup: function(target) {
        const objects = this._objects;
        const isActiveLower = objects.indexOf(this._activeObject) < objects.indexOf(target);
        const groupObjects = isActiveLower
              ? [this._activeObject, target]
              : [target, this._activeObject];
        this._activeObject.isEditing && this._activeObject.exitEditing();
        return new ActiveSelection({
            canvas: this
          }, groupObjects);
    },

    /**
     * 之前存在选中元素  此次为更新
     * @param {Object} target 新选中的元素
     * @param {Event} e 
     */
    _updateActiveSelection(target, e) {
        const activeSelection = this._activeObject;
        const currentActiveObjects = activeSelection._objects.slice(0);
        // 如果之前该元素是已被选中的，则此次将其取消选中
        if (activeSelection.contains(target)) {
          activeSelection.removeWithUpdate(target);
          this._hoveredTarget = target;
          this._hoveredTargets = this.targets.concat();
          if (activeSelection.size() === 1) {
            // activate last remaining object
            this._setActiveObject(activeSelection.item(0), e);
          }
        }
        // 如果该元素原来不是选中状态 则选中group增加该元素
        else {
          activeSelection.addWithUpdate(target);
          this._hoveredTarget = activeSelection;
          this._hoveredTargets = this.targets.concat();
        }
        this._fireSelectionEvents(currentActiveObjects, e);
    },

    _groupSelectedObjects(e) {
        const group = this._collectObjects(e),
            aGroup;
  
        // 仅有一个元素时不创建group
        if (group.length === 1) {
          this.setActiveObject(group[0], e);
        }
        else if (group.length > 1) {
          aGroup = new ActiveSelection(group.reverse(), {
            canvas: this
          });
          this.setActiveObject(aGroup, e);
        }
    },

    _collectObjects(e) {
        let group = [];
        let currentObject;
        const x1 = this._groupSelector.ex;
        const y1 = this._groupSelector.ey,
        const x2 = x1 + this._groupSelector.left;
        const y2 = y1 + this._groupSelector.top;
        const selectionX1Y1 = new Point(min(x1, x2), min(y1, y2));
        const selectionX2Y2 = new Point(max(x1, x2), max(y1, y2));
        const allowIntersect = !this.selectionFullyContained;
        const isClick = x1 === x2 && y1 === y2;
        // we iterate reverse order to collect top first in case of click.
        for (let i = this._objects.length; i--; ) {
            currentObject = this._objects[i];
  
            if (!currentObject || !currentObject.selectable || !currentObject.visible) {
                continue;
            }
  
            if ((allowIntersect && currentObject.intersectsWithRect(selectionX1Y1, selectionX2Y2)) ||
                currentObject.isContainedWithinRect(selectionX1Y1, selectionX2Y2) ||
                (allowIntersect && currentObject.containsPoint(selectionX1Y1)) ||
                (allowIntersect && currentObject.containsPoint(selectionX2Y2))
            ) {
                group.push(currentObject);
                // only add one object if it's a click
                if (isClick) {
                    break;
                }
            }
        }
  
        if (group.length > 1) {
            group = group.filter(function(object) {
                return !object.onSelect({ e: e });
            });
        }
  
        return group;
    },

    _maybeGroupObjects(e) {
        if (this.selection && this._groupSelector) {
          this._groupSelectedObjects(e);
        }
        this.setCursor(this.defaultCursor);
        // clear selection and current transformation
        this._groupSelector = null;
    }
}