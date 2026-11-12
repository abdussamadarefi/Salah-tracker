// Injected time and ids so core stays pure and testable (spec §3.2).
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FakeClock implements Clock {
  private current: Date;

  constructor(initial: Date | string) {
    this.current = new Date(initial);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date | string): void {
    this.current = new Date(date);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export type NewId = () => string;

export function defaultNewId(): string {
  // crypto.randomUUID is available in Node 19+ and in React Native via expo-crypto
  // in the mobile layer; core callers pass their own newId in the app.
  return globalThis.crypto.randomUUID();
}
