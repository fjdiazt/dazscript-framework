const t = require('@babel/types');
const pathModule = require('path');
let globalEnable = true;
let enabled = false;

function wrapWithLogMethod(t, logMethodName, expression) {
  return t.callExpression(
    t.memberExpression(t.identifier('log'), t.identifier(logMethodName)),
    [t.stringLiteral(expression)]
  );
}

function createLogMessage(path) {
  // Ensure that the parent is a function before accessing its name
  if (
    t.isFunctionDeclaration(path.parent) ||
    t.isFunctionExpression(path.parent)
  ) {
    const functionName = path.parent.id ? path.parent.id.name : 'anonymous';
    const filename = path.hub.file.opts.filename || 'unknown';
    const lineNumber = path.node.loc?.start?.line || 'unknown';
    const filenameWithoutPath = pathModule.basename(filename);

    return `${filenameWithoutPath}.${functionName}(${lineNumber + 2}): ${
      path.node.arguments[0].value
    }`;
  } else {
    // If the parent is not a function, use "anonymous"
    const filename = path.hub.file.opts.filename || 'unknown';
    const lineNumber = path.node.loc?.start?.line || 'unknown';
    const filenameWithoutPath = pathModule.basename(filename);
    const lineNumberStr = lineNumber === 'unknown' ? '' : `(${lineNumber + 2})`;

    return `${filenameWithoutPath}${lineNumberStr}: ${path.node.arguments[0].value}`;
  }
}

function isNonStringLiteralOrTemplateLiteral(node) {
  // Check if the node is not a string literal or is a template literal
  return !(t.isStringLiteral(node) || t.isTemplateLiteral(node));
}

function replaceLogStatements(path, logMethodName) {
  if (!enabled) return;
  if (t.isCallExpression(path.node) && !path.node.processed) {
    const callee = path.node.callee;

    if (
      isNonStringLiteralOrTemplateLiteral(path.node.arguments[0]) &&
      t.isIdentifier(callee) &&
      callee.name === logMethodName
    ) {
      // Handle non-string literal or template literal here
      const functionName = path.parent.id ? `.${path.parent.id.name}` : '';
      const filename = path.hub.file.opts.filename || 'unknown';
      const lineNumber = path.node.loc?.start?.line || 'unknown';
      const filenameWithoutPath = pathModule.basename(filename);

      let logMessage = `[TRACE] ${filenameWithoutPath}${functionName}(${
        lineNumber + 2
      })`;

      const logLine = t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('App'), t.identifier('debug')),
            [t.stringLiteral(logMessage)]
          )
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('App'),
              t.identifier('flushLogBuffer')
            ),
            []
          )
        ),
      ]);

      path.insertBefore(logLine);
      path.node.processed = true;
    } else if (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object, { name: 'log' })
    ) {
      // It's log.debug or similar, wrap it with wrapWithLogMethod
      const logMessage = createLogMessage(path, logMethodName);
      path.replaceWith(wrapWithLogMethod(t, logMethodName, logMessage));
      path.node.processed = true;
    } else if (t.isIdentifier(callee) && callee.name === logMethodName) {
      // It's just the specified method, update the argument directly
      path.node.arguments[0].value = createLogMessage(path, logMethodName);
      path.node.processed = true;
    }
  }
}

module.exports = function () {
  let declarationFound = false;

  return {
    pre() {
      if (this.opts && typeof this.opts.default === 'boolean') {
        enabled = globalEnable = this.opts.default;
      }
      enabled = globalEnable;
      declarationFound = false;
    },
    visitor: {
      VariableDeclaration(path, state) {
        const declarations = path.node.declarations;
        const traceDeclaration = declarations.find(
          (declaration) => declaration.id.name === 'TRACE'
        );

        if (!declarationFound) {
          if (traceDeclaration) {
            enabled = traceDeclaration.init
              ? traceDeclaration.init.value
              : false;
            declarationFound = true;
          } else {
            enabled = globalEnable;
          }
        }
      },
      FunctionDeclaration(path, state) {
        path.traverse({
          CallExpression(callPath) {
            //replaceLogStatements(callPath, 'trace');
          },
        });
      },
      FunctionExpression(path, state) {
        path.traverse({
          CallExpression(callPath) {
            replaceLogStatements(callPath, 'debug');
          },
        });
        path.traverse({
          CallExpression(callPath) {
            replaceLogStatements(callPath, 'error');
          },
        });
        path.traverse({
          CallExpression(callPath) {
            replaceLogStatements(callPath, 'info');
          },
        });
        path.traverse({
          CallExpression(callPath) {
            replaceLogStatements(callPath, 'dump');
          },
        });
        path.traverse({
          CallExpression(callPath) {
            replaceLogStatements(callPath, 'trace');
          },
        });
      },
    },
  };
};
