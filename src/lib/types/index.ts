export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: {
    address: string;
    coordinates: [number, number];
  };
  images: string[];
  organizer: UserProfile;
  tags: string[];
  capacity?: number;
  attendees?: string[];
}

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: string;
  tags?: string[];
  query?: string;
}

export type LoadingState = 'idle' | 'loading' | 'error' | 'success';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
