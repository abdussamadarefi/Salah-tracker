// Typed errors for the core state machine (spec §4.3, §5.2). Frozen contract (WO-00).
export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export class NotStartedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotStartedError";
  }
}

export class PrayerTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrayerTimeError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
