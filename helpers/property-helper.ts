import { sceneHelper } from '@dsf/lib/global'

/**
 * Sets the DzPropertyGroup path (and appropriate geometryregion_dz) for the given property.
 * @param property  The property to change the path of.
 * @param path The new path for the given property.
 */
export const setPath = (property: DzProperty, path: string) => {
    sceneHelper.setPropertyPath(property, path)
}

/**
 * Get the internal name of property (or its alias target), or “Unknown”.
 * @param property
 * @returns The internal name of property (or its alias target), or “Unknown”.
 */
export const getName = (property: DzProperty): string => {
    return sceneHelper.getInternalName(property)
}

/**
 * Unlocks a property temporarily and executes the specified callback while it's unlocked
 * @param property the property to unlock
 * @param then the callback to exectue while the property is unlocked
 */
export const unlock = (property: DzProperty, then: (property: DzProperty) => void) => {
    let locked = property.isLocked()
    if (locked) property.lock(true)
    then(property)
    if (locked) property.lock(false)
}

export const isNumeric = (property: DzProperty): boolean => {
    return property.inherits('DzNumericProperty')
}

export const cast = <T extends DzProperty>(property: DzProperty, type: 'DzNumericProperty' | 'DzFloatProperty' | 'DzIntProperty'): T | null => {
    return property.inherits(type)
        ? property as T
        : null
}

export const toNumeric = (property: DzProperty): DzFloatProperty | DzIntProperty | null => {
    return toFloat(property) ?? toInt(property)
}

export const toFloat = (property: DzProperty): DzFloatProperty | null => {
    return cast<DzFloatProperty>(property, 'DzFloatProperty')
}

export const toInt = (property: DzProperty): DzIntProperty | null => {
    return cast<DzIntProperty>(property, 'DzIntProperty')
}