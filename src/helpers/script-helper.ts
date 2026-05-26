export const getScriptPath = (): string => {
    var fileName = getScriptFileName();
    var fileInfo = new DzFileInfo(fileName);

    let path: string;

    if (typeof (fileInfo.canonicalPath) == "function") {
        path = fileInfo.canonicalPath();
    } else {
        path = fileInfo.path();
    }

    fileInfo.deleteLater();

    return path;
}

export const getScriptArguments = (): any[] => {
    try {
        return typeof getArguments === 'function' ? getArguments() : []
    }
    catch (e) {
        return []
    }
}

export const getStringScriptArguments = (): string[] => {
    const args = getScriptArguments()
    const values: string[] = []
    for (let index = 0; index < args.length; index++) values.push(String(args[index]))
    return values
}
