import fs from 'fs';
import path from 'path';
import { getKeyType, getPascalCaseString } from './helper';
import { topLevelInterfaces, createTypedefsMethods } from './util';
import { getSchema } from './schema';
import { getCollectionsWithFields } from './collectionsWithFields';

const schema = getSchema();

let typeSchema = '';
let queryInterfaceKeyValue = '';

const createInterface = (key: string, fields: object) => {
  const keyInPascalCase = getPascalCaseString(key);
  const fieldsEntries = Object.entries(fields);

  let mainInterfaceKeyValue = '';
  let inputInterfaceKeyValue = '';

  fieldsEntries.forEach(fieldEntry => {
    const fieldValue = fieldEntry[1];
    const fieldKey = fieldEntry[0];

    const fieldKeyPascalCase = getPascalCaseString(fieldKey);
    const valueType = getKeyType(fieldValue, fieldKey);

    // Creating interface for embedded objects
    if (typeof fieldValue === 'object') {
      createInterface(fieldKey, fieldValue);

      queryInterfaceKeyValue = queryInterfaceKeyValue.concat(
        `/**\n * @returns This return fqlx methods for the ${fieldKeyPascalCase} \n */ \n ${fieldKeyPascalCase}:  ${fieldKeyPascalCase}Methods;\n`
      );
    }

    // schema key value
    mainInterfaceKeyValue = mainInterfaceKeyValue.concat(
      `/**\n * ${fieldKey} for the ${keyInPascalCase}\n */\n ${fieldKey}: ${valueType};\n`
    );

    const fieldKeyInLowercase = fieldKey.toLowerCase();

    if (!['id', 'ts'].includes(fieldKeyInLowercase)) {
      inputInterfaceKeyValue = inputInterfaceKeyValue.concat(
        `/**\n * ${fieldKey} for the ${keyInPascalCase}\n */\n ${fieldKey}: ${valueType};\n`
      );
    }
  });

  typeSchema = typeSchema.concat(`export interface ${keyInPascalCase} {
    ${mainInterfaceKeyValue}
  }\n\n
  export interface ${keyInPascalCase}Input {
    ${inputInterfaceKeyValue}
  } \n\n
  ${createTypedefsMethods(keyInPascalCase, fieldsEntries)}
  `);
};

const generateTypeDefs = () => {
  const schemaKeys = Object.keys(schema);

  schemaKeys.forEach((key: string) => {
    const keyInPascalCase = getPascalCaseString(key);

    queryInterfaceKeyValue = queryInterfaceKeyValue.concat(
      `/**\n * @returns This return fqlx methods for the ${keyInPascalCase} \n */ \n${keyInPascalCase}: ${keyInPascalCase}Methods;\n`
    );
    createInterface(key, schema[key as keyof typeof schema].fields);
  });

  typeSchema = typeSchema.concat(`export interface Query {
    Set: SetMethods;
    ${queryInterfaceKeyValue}
  }`);
};

generateTypeDefs();

const dir = `${process.env?.PWD}/fqlx-generated`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

fs.writeFileSync(
  path.resolve(process.env?.PWD as string, `fqlx-generated/typedefs.ts`),
  topLevelInterfaces.concat(typeSchema),
  {
    encoding: 'utf-8',
  }
);

fs.writeFileSync(
  path.resolve(
    process.env?.PWD as string,
    `fqlx-generated/collectionsWithFields.ts`
  ),
  `export const collectionsWithFields = ${JSON.stringify(
    getCollectionsWithFields(schema)
  )}`,
  {
    encoding: 'utf-8',
  }
);
