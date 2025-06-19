import posthog from "posthog-js";

// Event categories
export const EventCategory = {
  NAVIGATION: "navigation",
  ACTION: "action",
  PERFORMANCE: "performance",
  ERROR: "error",
} as const;

// Event names
export const EventName = {
  PAGE_VIEW: "page_view",
  ACTION_START: "action_start",
  ACTION_COMPLETE: "action_complete",
  ERROR_OCCURRED: "error_occurred",
} as const;

type TimingEvent = {
  category: string;
  name: string;
  startTime: number;
  metadata?: Record<string, any>;
};

const activeTimings = new Map<string, TimingEvent>();

/**
 * Generate a unique ID for timing events
 */
const generateTimingId = (category: string, name: string) =>
  `${category}:${name}:${Date.now()}`;

/**
 * Track a simple event
 */
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Start timing an action
 */
export const startTiming = (
  category: string,
  name: string,
  metadata?: Record<string, any>
): string => {
  const id = generateTimingId(category, name);
  activeTimings.set(id, {
    category,
    name,
    startTime: performance.now(),
    metadata,
  });

  trackEvent(EventName.ACTION_START, {
    category,
    name,
    ...metadata,
  });

  return id;
};

/**
 * End timing an action and track the duration
 */
export const endTiming = (timingId: string) => {
  const timing = activeTimings.get(timingId);
  if (!timing) {
    console.warn(`No active timing found for ID: ${timingId}`);
    return;
  }

  const duration = performance.now() - timing.startTime;
  activeTimings.delete(timingId);

  trackEvent(EventName.ACTION_COMPLETE, {
    category: timing.category,
    name: timing.name,
    duration_ms: Math.round(duration),
    ...timing.metadata,
  });

  return duration;
};

/**
 * Track an error event
 */
export const trackError = (error: Error, metadata?: Record<string, any>) => {
  trackEvent(EventName.ERROR_OCCURRED, {
    error_name: error.name,
    error_message: error.message,
    error_stack: error.stack,
    ...metadata,
  });
};

/**
 * Create a higher-order function that wraps an async function with timing
 */
export const withTiming = <T extends (...args: any[]) => Promise<any>>(
  category: string,
  name: string,
  fn: T
): T => {
  return (async (...args: Parameters<T>) => {
    const timingId = startTiming(category, name);
    try {
      const result = await fn(...args);
      endTiming(timingId);
      return result;
    } catch (error) {
      endTiming(timingId);
      trackError(error as Error, { category, name });
      throw error;
    }
  }) as T;
};
