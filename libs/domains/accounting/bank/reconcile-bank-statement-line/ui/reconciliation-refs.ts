export function createRefHandlers(getters: Record<string, () => any>, setters: Record<string, (v: any) => void>) {
  return {
    getRef(prop: string) {
      if (prop in getters) return getters[prop]();
      return undefined;
    },
    setRef(prop: string, value: any) {
      if (prop in setters) {
        setters[prop](value);
        return true;
      }
      return false;
    }
  };
}
