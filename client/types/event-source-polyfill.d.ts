declare module 'event-source-polyfill' {
  export interface EventSourcePolyfillOptions {
    headers?: Record<string, string>;
    withCredentials?: boolean;
    heartbeatTimeout?: number;
    connectionTimeout?: number;
    lastEventIdQueryParameterName?: string;
    [key: string]: unknown;
  }

  export class EventSourcePolyfill {
    constructor(url: string, options?: EventSourcePolyfillOptions);
    close(): void;
    readonly readyState: number;
    readonly url: string;
    readonly withCredentials: boolean;
    onopen: ((this: EventSourcePolyfill, ev: Event) => unknown) | null;
    onmessage: ((this: EventSourcePolyfill, ev: MessageEvent) => unknown) | null;
    onerror: ((this: EventSourcePolyfill, ev: Event) => unknown) | null;
    addEventListener(
      type: string,
      listener: EventListener | EventListenerObject | ((event: Event | MessageEvent) => void),
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListener | EventListenerObject | ((event: Event | MessageEvent) => void),
      options?: boolean | EventListenerOptions
    ): void;
    dispatchEvent(event: Event): boolean;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSED: number;
  }

  export default EventSourcePolyfill;
}

