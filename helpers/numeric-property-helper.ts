import { scene } from '@dsf/lib/global';
import { PropertyKey, PropertyKeys } from '@dsf/models/frame-keys';
import { isNumeric, toFloat } from './property-helper';
import { timeToFrame } from './scene-helper';

/**
 * Adjust the value of the property based on the contribution of property controllers.
 * @param property the property to adjust
 * @param value the 'final' value desired for the property
 * @param time the animation time to adjust the property at or current time if not specified
 * @param interpolation the animation interpolation of DzProperty
 * @deprecated use adjust instead
 */
export const adjustFn = (property: DzFloatProperty | DzIntProperty, value: number, interpolation?: number, time?: DzTime) => {
    return () => {
        interpolation = interpolation ?? DzProperty.InterpConstant
        time = time ?? scene.getTime()
        property.setValue(time, property.adjustValue(time, value), interpolation)
    };
}

/**
 * Adjust the value of the property based on the contribution of property controllers.
 * @param property the property to adjust
 * @param value the 'final' value desired for the property
 * @param time the animation time to adjust the property at or current time if not specified
 * @param interpolation the animation interpolation of DzProperty
 */
export const adjust = (property: DzFloatProperty | DzIntProperty, value: number, interpolation?: number, time?: DzTime) => {
    interpolation = interpolation ?? DzProperty.InterpConstant
    time = time ?? scene.getTime()

    adjustFn(property, value, interpolation, time)()
}

export const nudge = (property: DzFloatProperty | DzIntProperty, value: number, interpolation?: number, time?: DzTime) => {
    interpolation = interpolation ?? DzProperty.InterpConstant
    time = time ?? scene.getTime()

    const sensitivity = property.getSensitivity()
    adjust(property, property.getValue() + value * sensitivity, interpolation, time)
    //property.setValue(time, property.getValue() + value * sensitivity, interpolation)
}

export const clamp = (property: DzFloatProperty | DzIntProperty, interpolation?: number, time?: DzTime) => {
    interpolation = interpolation ?? DzProperty.InterpConstant
    time = time ?? scene.getTime()

    property.setIsClamped(true)

    if (property.getRawValue() > property.getMax()) {
        property.setValue(time, property.getMax(), interpolation)
    }
    else if (property.getRawValue() < property.getMin()) {
        property.setValue(time, property.getMin(), interpolation)
    }

}

export const setInterpolation = (property: DzProperty, keyIndex: number, interpolationType: number) => {
    toFloat(property)?.setKeyInterpolation(keyIndex, interpolationType)
}

/**
 * Gets a collection of numeric property keys
 * @param property the property to get the keys from
 * @returns an array of keys
 */
export const getKeys = (property: DzNumericProperty): PropertyKeys => {
    if (!isNumeric(property)) throw Error(`The property "${property.getLabel()}" is not numeric`)

    const keys: PropertyKey[] = []

    for (let i = 0; i < property.getNumKeys(); i++) {
        const key = new PropertyKey()
        key.index = i
        key.time = property.getKeyTime(i)
        key.value = property.getDoubleValue(key.time)
        key.frame = timeToFrame(key.time)
        keys.push(key)
    }

    const keyCollection = new PropertyKeys(keys);

    // This would make frame the index, but it would not be zero based and
    // could lead to trouble
    // keys.forEach((key) => {
    //     keyCollection[key.frame] = key
    // })

    return keyCollection
}