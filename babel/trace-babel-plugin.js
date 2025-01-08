const t = require('@babel/types');
const path = require('path');
let globalEnable = true;
let enabled = false;

function isTraceDecorator(node) {
  return false; // Your existing isTraceDecorator logic
}

function isTraceComment(node) {
  return false; // Your existing isTraceComment logic
}

function createConsoleLogStatement(
  location,
  filename,
  lineNumber,
  functionName,
  parameters
) {
  const filenameWithoutPath = path.basename(filename);
  let logMessage = `[TRACE] ${location}: ${filenameWithoutPath}(${lineNumber}): ${functionName}`;

  if (parameters.length > 0) {
    logMessage += `(${parameters.join(', ')})`;
  } else {
    logMessage += '()';
  }

  return t.blockStatement([
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('App'), t.identifier('debug')),
        [t.stringLiteral(logMessage)]
      )
    ),
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('App'), t.identifier('flushLogBuffer')),
        []
      )
    ),
  ]);
}

function processFunction(enabled, path, state) {
  const filename = state.file.opts.filename || 'unknown';
  const lineNumber = path.node.loc?.start?.line || 'unknown';
  const functionName = path.node.id ? path.node.id.name : 'anonymous';
  const parameters = path.node.params.map((param) => param.name);

  if (!enabled || functionName === 'anonymous' || lineNumber === 'unknown')
    return;

  const enteringLogStatement = createConsoleLogStatement(
    'Entering',
    filename,
    lineNumber,
    functionName,
    parameters
  );
  const exitingLogStatement = createConsoleLogStatement(
    'Exiting',
    filename,
    lineNumber,
    functionName,
    parameters
  );

  // Process the return statements within the function body
  path.get('body').traverse({
    ReturnStatement(returnPath) {
      returnPath.insertBefore(exitingLogStatement);
    },
  });

  if (enteringLogStatement) {
    if (t.isBlockStatement(path.node.body)) {
      path.node.body.body.unshift(enteringLogStatement);
    } else {
      path.node.body = t.blockStatement([enteringLogStatement, path.node.body]);
    }
  }
}

function processAssignmentExpression(path, state) {
  const filename = state.file.opts.filename || 'unknown';
  const lineNumber = path.node.loc?.start?.line || 'unknown';
  let functionName = 'anonymous'; // Default value for function name
  const parameters = [];

  if (!enabled || lineNumber === 'unknown') return;

  if (t.isMemberExpression(path.node.left)) {
    functionName = path.node.left.property.name;
  }

  const enteringLogStatement = createConsoleLogStatement(
    'Entering',
    filename,
    lineNumber,
    functionName,
    parameters
  );
  const exitingLogStatement = createConsoleLogStatement(
    'Exiting',
    filename,
    lineNumber,
    functionName,
    parameters
  );

  // Process the return statements within the function body
  path.get('right').traverse({
    ReturnStatement(returnPath) {
      returnPath.insertBefore(exitingLogStatement);
    },
  });

  if (
    t.isFunctionExpression(path.node.right) ||
    t.isArrowFunctionExpression(path.node.right)
  ) {
    // Handle the case where the right-hand side is a function expression or arrow function expression
    if (t.isBlockStatement(path.node.right.body)) {
      path.node.right.body.body.unshift(enteringLogStatement);
      path.node.right.body.body.push(exitingLogStatement);
    } else {
      path.node.right.body = t.blockStatement([
        enteringLogStatement,
        t.returnStatement(path.node.right.body),
        exitingLogStatement,
      ]);
    }
  }
}

function processVariableDeclaration(path, state) {
  const filename = state.file.opts.filename || 'unknown';
  const lineNumber = path.node.loc?.start?.line || 'unknown';

  path.node.declarations.forEach((declarator) => {
    if (
      t.isFunctionExpression(declarator.init) ||
      t.isArrowFunctionExpression(declarator.init)
    ) {
      const functionName = declarator.id.name;
      const parameters = declarator.init.params.map((param) => param.name);

      if (!enabled || lineNumber === 'unknown') return;

      const enteringLogStatement = createConsoleLogStatement(
        'Entering',
        filename,
        lineNumber,
        functionName,
        parameters
      );
      const exitingLogStatement = createConsoleLogStatement(
        'Exiting',
        filename,
        lineNumber,
        functionName,
        parameters
      );

      // Ensure the Exiting statement is added to the end of the function body
      if (t.isBlockStatement(declarator.init.body)) {
        declarator.init.body.body.push(exitingLogStatement);
      } else {
        declarator.init.body = t.blockStatement([
          declarator.init.body,
          exitingLogStatement,
        ]);
      }

      // Process the return statements within the function body
      declarator.init.body.body.forEach((statement, index) => {
        if (t.isReturnStatement(statement)) {
          // Add Exiting statement before the return statement
          declarator.init.body.body.splice(index, 0, exitingLogStatement);
        }
      });

      // Add the Entering statement at the beginning of the function body
      if (t.isBlockStatement(declarator.init.body)) {
        declarator.init.body.body.unshift(enteringLogStatement);
      } else {
        declarator.init.body = t.blockStatement([
          enteringLogStatement,
          t.returnStatement(declarator.init.body),
        ]);
      }
    }
  });
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

        processVariableDeclaration(path, state);
      },
      FunctionDeclaration(path, state) {
        //processFunction(path, state);
      },
      FunctionExpression(path, state) {
        processFunction(enabled, path, state);
      },
      ArrowFunctionExpression(path, state) {
        //processFunction(path, state);
      },
      AssignmentExpression(path, state) {
        processAssignmentExpression(path, state);
      },
    },
  };
};
