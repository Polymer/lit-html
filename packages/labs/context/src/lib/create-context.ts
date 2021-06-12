export type Context<T> = {
  name: string;
  _type?: T;
};

export type AnyContext = Context<unknown>;

export type ContextType<T extends AnyContext> = T extends Context<infer Y>
  ? Y
  : never;

export function createContext<T>(name: string): Context<T> {
  return {
    name,
  };
}
