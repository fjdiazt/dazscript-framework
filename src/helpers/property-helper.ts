import { sceneHelper } from '@dsf/core/global'

export type PropertyRelationSource = 'controller' | 'currentController' | 'link' | 'follow' | 'slaveController'

/**
 * A property relationship discovered from Daz controller, link, follow, or slave-controller APIs.
 */
export type PropertyRelation = {
    /** The related input or output property. */
    property: DzProperty
    /** The controller that exposed the relation, or null for direct numeric property links. */
    controller: DzController | null
    /** The Daz API surface that exposed the relation. */
    source: PropertyRelationSource
}

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
    return sceneHelper.getInternalName(property).valueOf()
}

/**
 * Ensures the property's internal name is unique on its owning node.
 * @param property The property whose internal name should be checked.
 * @returns The unique internal name assigned to the property.
 */
export const ensureNameIsUnique = (property: DzProperty): string => {
    const name = getName(property)
    const uniqueName = sceneHelper.getUniqueMorphName(sceneHelper.getNode(property), name)
    if (name !== uniqueName) {
        sceneHelper.setInternalName(property, uniqueName.valueOf())
    }
    return uniqueName.valueOf()
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

/**
 * Adds a property relation unless the same property, controller, and source were already collected.
 * @param relations The relation collection to update.
 * @param property The related property to add, or null to skip.
 * @param controller The controller that exposed the relation, or null for direct property links.
 * @param source The Daz API surface that exposed the relation.
 */
const addRelation = (relations: PropertyRelation[], property: DzProperty | null, controller: DzController | null, source: PropertyRelationSource): void => {
    if (!property) return

    for (let relation of relations) {
        if (relation.property === property && relation.controller === controller && relation.source === source) return
    }

    relations.push({ property, controller, source })
}

/**
 * Gets the source property referenced by a controller.
 * @param controller The controller to inspect.
 * @param current If true, uses getCurrentProperty; otherwise, uses getProperty.
 * @returns The controller's property, or null when the controller does not expose that method.
 */
const getControllerProperty = (controller: DzController, current: boolean): DzProperty | null => {
    const methodName = current ? 'getCurrentProperty' : 'getProperty'
    const method = (controller as any)[methodName]
    if (typeof method !== 'function') return null

    return method.call(controller) as DzProperty | null
}

/**
 * Gets properties that drive this property through controllers or direct numeric links.
 * @param property The property whose input/driving properties should be collected.
 * @returns Related input properties with the controller/source that exposed each relation.
 */
export const getPropertyInputs = (property: DzProperty): PropertyRelation[] => {
    const relations: PropertyRelation[] = []
    const controllerCount = property.getNumControllers()

    for (let index = 0; index < controllerCount; index++) {
        const controller = property.getController(index)
        addRelation(relations, getControllerProperty(controller, false), controller, 'controller')
        addRelation(relations, getControllerProperty(controller, true), controller, 'currentController')
    }

    const numericProperty = cast<DzNumericProperty>(property, 'DzNumericProperty')
    if (numericProperty) {
        addRelation(relations, numericProperty.getLinkProperty(), null, 'link')
        addRelation(relations, numericProperty.getFollowProperty(), null, 'follow')
    }

    return relations
}

/**
 * Gets properties driven by this property through slave controllers.
 * @param property The property whose output/driven properties should be collected.
 * @returns Related output properties with the controller/source that exposed each relation.
 */
export const getPropertyOutputs = (property: DzProperty): PropertyRelation[] => {
    const relations: PropertyRelation[] = []
    const controllerCount = property.getNumSlaveControllers()

    for (let index = 0; index < controllerCount; index++) {
        const controller = property.getSlaveController(index)
        addRelation(relations, controller.getOwner(), controller, 'slaveController')
    }

    return relations
}

/**
 * Checks whether a property is a Daz numeric property.
 * @param property The property to check.
 * @returns True if the property inherits DzNumericProperty.
 */
export const isNumeric = (property: DzProperty): boolean => {
    return property.inherits('DzNumericProperty')
}

/**
 * Casts a property to a specific Daz property type when it inherits that type.
 * @param property The property to cast.
 * @param type The Daz property class name to test.
 * @returns The property typed as T, or null when it does not inherit the requested type.
 */
export const cast = <T extends DzProperty>(property: DzProperty, type: 'DzNumericProperty' | 'DzFloatProperty' | 'DzIntProperty'): T | null => {
    return property.inherits(type)
        ? property as T
        : null
}

/**
 * Casts a property to a numeric float or int property.
 * @param property The property to cast.
 * @returns The property as DzFloatProperty or DzIntProperty, or null if it is neither.
 */
export const toNumeric = (property: DzProperty): DzFloatProperty | DzIntProperty | null => {
    return toFloat(property) ?? toInt(property)
}

/**
 * Casts a property to a float property.
 * @param property The property to cast.
 * @returns The property as DzFloatProperty, or null if it is not one.
 */
export const toFloat = (property: DzProperty): DzFloatProperty | null => {
    return cast<DzFloatProperty>(property, 'DzFloatProperty')
}

/**
 * Casts a property to an int property.
 * @param property The property to cast.
 * @returns The property as DzIntProperty, or null if it is not one.
 */
export const toInt = (property: DzProperty): DzIntProperty | null => {
    return cast<DzIntProperty>(property, 'DzIntProperty')
}
