export default {
    _shouldGroup(e, target) {
        const activeObject = this._activeObject;
        return activeObject && this._isSelectionKeyPressed(e) && target && target.selectable && this.selection &&
            (activeObject !== target || activeObject.type === 'activeSelection') && !target.onSelect({ e: e });
    }
}