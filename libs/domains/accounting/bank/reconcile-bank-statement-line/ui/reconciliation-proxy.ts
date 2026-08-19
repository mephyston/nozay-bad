export function createReconciliationProxy(actions: any, getRef: (prop: string) => any, setRef: (prop: string, val: any) => boolean) {
  return new Proxy(actions, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      return getRef(prop);
    },
    set(target: any, prop: string, value: any) {
      return setRef(prop, value);
    }
  });
}
