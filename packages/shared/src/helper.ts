export type Brand<T, Id extends string> = T & { readonly __brand: Id };
