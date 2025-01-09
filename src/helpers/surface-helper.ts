import { getSurfacesPane } from './pane-helper'

export const getSelectedSurfacePropertiesOfType = <TProperty extends DzProperty>(className: string): TProperty[] => {
    return getSurfacesPane().getNodeEditor().getPropertySelections(true)
        .filter(p => p.inherits(className)) as TProperty[]
}