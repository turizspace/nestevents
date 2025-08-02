import type { NDKEvent } from "@nostr-dev-kit/ndk";

export interface EventDetails {
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  start: Date;
  end: Date;
  location?: string;
  address?: string;
}

export interface EditFormData {
  title: string;
  content: string;
  summary: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  image: string;
}

declare global {
  interface Window {
    webln: {
      enable: () => Promise<void>;
      sendPayment: (invoice: string) => Promise<any>;
    }
  }
}
