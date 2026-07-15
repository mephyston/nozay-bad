declare module "*.svelte" {
  import type { Component } from "svelte";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: Component<any, any, any>;
  export default component;

  // Named exports for components with variants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const buttonVariants: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ButtonVariant = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ButtonSize = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ButtonProps = any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const badgeVariants: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type BadgeVariant = any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const alertVariants: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type AlertVariant = any;
}
