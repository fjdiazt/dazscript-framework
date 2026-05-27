export type SilentObjExportOptions = {
    selectedOnly?: boolean
    selectedRootsOnly?: boolean
    includeParented?: boolean
    writeUvs?: boolean
    writeNormals?: boolean
    writeObjects?: boolean
    writeGroups?: boolean
    writeMaterials?: boolean
    writeMaterialLibrary?: boolean
    groupByGeometry?: boolean
    groupByNodes?: boolean
    groupBySurfaces?: boolean
}

export type ObjFileResult = {
    ok: boolean
    path: string
    result: string
}

export const createSilentObjExportSettings = (options: SilentObjExportOptions = {}): DzFileIOSettings => {
    const settings = createObjAxisSettings()
    settings.setBoolValue('IgnoreInvisible', false)
    settings.setBoolValue('WeldSeams', false)
    settings.setBoolValue('RemoveUnusedVerts', false)
    settings.setBoolValue('WriteVT', options.writeUvs ?? true)
    settings.setBoolValue('WriteVN', options.writeNormals ?? false)
    settings.setBoolValue('WriteO', options.writeObjects ?? true)
    settings.setBoolValue('WriteG', options.writeGroups ?? true)
    settings.setBoolValue('GroupGeom', options.groupByGeometry ?? true)
    settings.setBoolValue('GroupNodes', options.groupByNodes ?? false)
    settings.setBoolValue('GroupSurfaces', options.groupBySurfaces ?? true)
    settings.setBoolValue('GroupSingle', false)
    settings.setBoolValue('WriteUsemtl', options.writeMaterials ?? true)
    settings.setBoolValue('WriteMtllib', options.writeMaterialLibrary ?? false)
    settings.setBoolValue('CollectMaps', false)
    settings.setBoolValue('ConvertMaps', false)
    settings.setBoolValue('SelectedOnly', options.selectedOnly ?? true)
    settings.setBoolValue('SelectedRootsOnly', options.selectedRootsOnly ?? true)
    settings.setBoolValue('PrimaryRootOnly', false)
    settings.setBoolValue('IncludeParented', options.includeParented ?? false)
    settings.setBoolValue('TriangulateNgons', false)
    settings.setBoolValue('CollapseUVTiles', false)
    settings.setBoolValue('ShowIndividualSettings', true)
    settings.setIntValue('FloatPrecision', 6)
    settings.setIntValue('RunSilent', 1)
    return settings
}

export const createMinimalSilentObjExportSettings = (): DzFileIOSettings =>
    createSilentObjExportSettings({
        writeUvs: false,
        writeNormals: false,
        writeObjects: false,
        writeGroups: false,
        writeMaterials: false,
        writeMaterialLibrary: false,
        groupByGeometry: false,
        groupByNodes: false,
        groupBySurfaces: false,
        selectedOnly: true,
        selectedRootsOnly: true,
        includeParented: false
    })

export const createSilentObjImportSettings = (): DzFileIOSettings => {
    const settings = createObjAxisSettings()
    settings.setBoolValue('IncludeVT', false)
    settings.setBoolValue('IncludeG', false)
    settings.setBoolValue('IncludeUsemtl', false)
    settings.setBoolValue('IncludeMtllib', false)
    settings.setBoolValue('ShowIndividualSettings', true)
    settings.setIntValue('RunSilent', 1)
    return settings
}

export const exportObjSilent = (path: string, settings: DzFileIOSettings = createMinimalSilentObjExportSettings()): ObjFileResult => {
    const exporter = (App.getExportMgr() as any).findExporterByClassName('DzObjExporter')
    if (!exporter) return { ok: false, path, result: 'DzObjExporter not found' }

    try {
        const result = exporter.writeFile(path, settings)
        return { ok: true, path, result: String(result) }
    } finally {
        exporter.deleteLater?.()
    }
}

export const importObjSilent = (path: string, settings: DzFileIOSettings = createSilentObjImportSettings()): ObjFileResult => {
    const importer = (App.getImportMgr() as any).findImporterByClassName('DzObjImporter')
    if (!importer) return { ok: false, path, result: 'DzObjImporter not found' }

    try {
        const result = importer.readFile(path, settings)
        return { ok: true, path, result: String(result) }
    } finally {
        importer.deleteLater?.()
    }
}

const createObjAxisSettings = (): DzFileIOSettings => {
    const settings = new DzFileIOSettings()
    settings.setFloatValue('Scale', 243.84)
    settings.setStringValue('LatAxis', 'X')
    settings.setStringValue('VertAxis', 'Y')
    settings.setStringValue('DepthAxis', 'Z')
    settings.setBoolValue('InvertLat', false)
    settings.setBoolValue('InvertVert', false)
    settings.setBoolValue('InvertDepth', false)
    return settings
}
