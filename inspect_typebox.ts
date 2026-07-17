import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const schema = Type.Object({
  name: Type.String()
});

const errors = [...Value.Errors(schema, null)];
console.log('Errors when input is null:', errors);
console.log('Error path types:', errors.map(e => typeof e.path));
console.log('Error properties:', errors.map(e => Object.keys(e)));


