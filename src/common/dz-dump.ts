import { any } from '@dsf/helpers/array-helper';
import { contains, count, remove } from '@dsf/helpers/string-helper';

function isUpperCase(myString: string) {
    return (myString === myString.toUpperCase());
}

var lines = [];
function processLine(x: string): void {
    x = remove(x, "*");
    x = x.replace("const ", "");
    x = x.replace(/\(([a-zA-Z0-9]*),/, "(#{arg}:$1,");
    x = x.replace(/,([a-zA-Z0-9]*)\)/, ", #{arg}:$1)");
    x = x.replace(/,([a-zA-Z0-9]\w*)/g, ", #{arg}:$1");
    while (contains(x, "#{arg}")) {
        var n = count(x, "#{arg}") - 1;
        x = x.replace(new RegExp('#{arg}(?!.*#{arg})'), `p${n}`);
    }
    x = x.replace(/(int|float)/g, "number");
    x = x.replace(/(bool)/g, "boolean");
    x = x.replace(/(QString)/g, "string");
    x = x.replace(/(QPonumber)/g, "number");
    x = x.replace(/\((\w*\))/, "(p0:$1");
    x = x.replace(/\((\w*\))/, "(p0:$1");
    x = x.replace("p0:)", ")");
    lines.push("    " + x + ": any;");
};

// Keep track of classes avoiding duplicates
var classesFound = {};

export default function dz_dump(obj: any): void {
    if (!obj || obj === null) {
        print('null object');
        App.flushLogBuffer()
        return;
    }

    var className = null;
    var enumerations = [];
    var properties = [];
    var functions = [];
    var signals = [];

    // is DAZ object?
    if (obj["className"]) {
        className = obj.className();
    }

    // already seen? leave
    if (classesFound[className]) return;

    for (var name in obj) {
        var o = obj[name];
        if (typeof o == "function") {
            if (any(["Changed", "Requested", "Renamed", "Clicked", "Pressed"], x => contains(name, x)))
                signals.push(name);
            else
                functions.push(name);
        }
        else {
            if (isUpperCase(name[0]))
                enumerations.push(name);
            else
                properties.push(name);
        }
    }
    properties.sort();
    functions.sort();
    signals.sort();

    lines.push("");
    lines.push("/**");
    lines.push(" * class " + className);
    lines.push(" */");
    lines.push("declare class " + className + " {");

    if (enumerations.length > 0) {
        lines.push("");
        lines.push("    //#region Enumerations");
        enumerations.forEach(function (x) {
            lines.push("    static " + x + ": " + typeof obj[x] + "; // " + (obj[x]));
        });
    }
    lines.push("    //#endregion");
    lines.push("");
    lines.push("    // Properties");

    properties.forEach(function (x) {
        lines.push("    " + x + ": " + typeof obj[x] + "; // " + (obj[x]));
    });
    lines.push("");
    lines.push("    // Methods");

    // Process LineFunctions
    functions.forEach(processLine);

    // Process Signals
    if (signals.length > 0) {
        lines.push("");
        lines.push("    // Signals");
        signals.forEach(processLine);
    }
    lines.push("}");

    classesFound[className] = lines.join('\r\n');

    // output classes found
    for (var name in classesFound) {
        print(classesFound[name]);
    }

}

// =======================================
// =======================================
// =======================================
//dump(new DzERCLink());
// =======================================
// =======================================
// =======================================