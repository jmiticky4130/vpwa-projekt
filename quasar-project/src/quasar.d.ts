import type { QVueGlobals } from 'quasar';

// Make Quasar's $q available in Vue templates with proper typing
// so vue-tsc/volar recognizes `$q` on component instances
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $q: QVueGlobals;
  }
}

export {};

// Help TS resolve Quasar wrapper types during editor/type checks
declare module 'quasar/wrappers' {
  // Minimal ambient declarations to satisfy IDE/tsc; Quasar generates full types at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function boot<T extends (ctx: Record<string, any>) => void | Promise<void>>(fn: T): T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function defineWrapper(fn: (ctx: Record<string, any>) => any): any
}
