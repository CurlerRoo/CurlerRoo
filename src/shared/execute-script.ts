// import acron from 'acorn'; will not work on production
import * as acorn from 'acorn';
import { getQuickJS } from 'quickjs-emscripten';
import { getValueByPath } from './get-value-by-path';
import { Variable } from './types';
import { ExecuteScriptArgs } from './services-interface';

const _executeScript = async (scriptText: string) => {
  const vm = (await getQuickJS()).newContext();
  const result = vm.evalCode(scriptText);
  if (result.error) {
    const error = vm.dump(result.error);
    throw new Error(error.message);
  }
  const value = vm.dump(result.value);
  return value;
};

const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

export const executeScript = async ({
  resBody,
  postScript,
  existingVariables,
}: ExecuteScriptArgs): Promise<{
  variables: Variable[];
}> => {
  const preScript = `
    const getByPath = ${getValueByPath.toString()}
    const json_body = (path) => {
      const json = ${resBody && isValidJSON(resBody) ? resBody : null};
      return getByPath(json, path);
    };
    ${(existingVariables || ([] as Variable[]))
      ?.map(({ key, value }) => {
        return `var ${key} = ${JSON.stringify(value)};`;
      })
      .join('\n')}
  `;

  const ast = acorn.parse(postScript, {
    ecmaVersion: 2021,
  });

  const declarations = ast.body
    .filter((m) => m.type === 'VariableDeclaration')
    // @ts-ignore
    .flatMap((m) => m.declarations)
    .map((m) => m.id.name);

  const appendScripts = `JSON.stringify({
    ${declarations.join(',')}
  });`;
  const finalScript = `${preScript};\n${postScript};\n${appendScripts}`;
  const variables = await _executeScript(finalScript).then((m) =>
    JSON.parse(m),
  );

  return {
    variables: Object.entries(variables).map(([key, value]) => ({
      key,
      value,
      source: 'manual',
    })),
  };
};
