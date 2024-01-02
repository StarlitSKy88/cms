import type { Attribute, Common, Utils } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace OrderKind {
  export type Asc = 'asc';
  export type Desc = 'desc';

  export type Any = Asc | Desc;
}

/**
 * Single non-populatable attribute representation
 *
 * @example
 * type A = 'title'; // ✅
 * type B = 'description'; // ✅
 * type C = 'title:asc'; // ❌
 * type D = 'title,description'; // ❌
 */
type SingleAttribute<TSchemaUID extends Common.UID.Schema> =
  | 'id'
  | Utils.Guard.Never<string & Attribute.GetNonPopulatableKeys<TSchemaUID>, string>;

/**
 * Ordered single non-populatable attribute representation
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ❌
 * type D = 'title,description'; // ❌
 */
type OrderedSingleAttribute<TSchemaUID extends Common.UID.Schema> =
  `${SingleAttribute<TSchemaUID>}:${OrderKind.Any}`;

/**
 * Union of all possible string representation for a sort
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ✅
 * type D = 'title,description:asc'; // ✅
 * type E = [42]; // ❌
 * type F = { title: 'asc' }; // ❌
 */
export type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | SingleAttribute<TSchemaUID>
  | OrderedSingleAttribute<TSchemaUID>
  // TODO: Loose type checking to avoid circular dependencies & infinite recursion
  | `${string},${string}`;

/**
 * Array notation for a sort
 *
 * @example
 * type A = ['title:asc', 'description']; // ✅
 * type B = ['title']; // ✅
 * type C = ['count', 'title,description:asc']; // ✅
 * type D = { title: 'asc' }; // ❌
 * type E = [42]; // ❌
 * type F = 'title'; // ❌
 */
export type ArrayNotation<TSchemaUID extends Common.UID.Schema> = Any<TSchemaUID>[];

/**
 * Object notation for a sort
 *
 * @example
 * type A = { title: 'asc' }; // ✅
 * type B = { title: 'asc', description: 'desc' }; // ✅
 * type C = { title: 'asc', author: { name: 'asc' } }; // ✅
 * type D = { author: { email: 'asc', role: { name: 'desc' } } }; // ✅
 * type E = ['title']; // ❌
 * type F = 'title'; // ❌
 */
export type ObjectNotation<TSchemaUID extends Common.UID.Schema> = {
  [TKey in ObjectNotationKeys<TSchemaUID>]?: TKey extends SingleAttribute<TSchemaUID>
    ? // First level sort (scalar attributes, id, ...)
      OrderKind.Any
    : TKey extends Attribute.GetKeysWithTarget<TSchemaUID>
    ? // Deep sort (relations with a target, components, media, ...)
      ObjectNotation<Attribute.GetTarget<TSchemaUID, TKey>>
    : never;
};

/**
 * Represents the keys of an object notation for a sort
 * - SingleAttribute<TSchemaUID> represents a union of every non-populatable attribute based on the passed schema UID
 * - Attribute.GetKeysWithTarget<TSchemaUID> provides keys with a target from the passed schema UID.
 *
 * This means that every member of ObjectNotationKeys can represent either a single non-populatable attribute or an attribute with a target.
 */
type ObjectNotationKeys<TSchemaUID extends Common.UID.Schema> =
  | SingleAttribute<TSchemaUID>
  | Attribute.GetKeysWithTarget<TSchemaUID>;

/**
 * Represents any notation for a sort (string, array, object)
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ✅
 * type D = 'title,description:asc'; // ✅
 * type E = ['title:asc', 'description']; // ✅
 * type F = ['title']; // ✅
 * type G = ['count', 'title,description:asc']; // ✅
 * type H = { title: 'asc' }; // ✅
 * type I = { title: 'asc', description: 'desc' }; // ✅
 * type J = { title: 'asc', author: { name: 'asc' } }; // ✅
 * type K = { author: { email: 'asc', role: { name: 'desc' } } }; // ✅
 */
export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>
  | ObjectNotation<TSchemaUID>;
