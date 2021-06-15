/**
 * A Context object defines an optional initial value for a Context, as well as a name identifier for debugging purposes.
 */
export type Context<T> = {
  name: string;
  initialValue?: T;
};

/**
 * An unknown context type
 */
export type UnknownContext = Context<unknown>;

/**
 * A helper type which can extract a Context value type from a Context type
 */
export type ContextType<T extends UnknownContext> = T extends Context<infer Y>
  ? Y
  : never;

/**
 * A function which creates a Context value object
 */
export function createContext<T>(
  name: string,
  initialValue?: T
): Readonly<Context<T>> {
  return {
    name,
    initialValue,
  };
}
