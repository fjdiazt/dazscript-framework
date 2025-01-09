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