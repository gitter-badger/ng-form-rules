export type RuleFunc<T, R> = (value: T, rootValue?: R) => boolean;