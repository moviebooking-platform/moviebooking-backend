import { ShowSeatStatus } from '@moviebooking/database';

/** One seat in the availability map with its derived status and snapshot price. */
export interface AvailabilitySeat {
  seatId: string;
  seatCode: string;
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  status: ShowSeatStatus;
  priceCents: number;
  currency: string;
}

export interface AvailabilitySummary {
  total: number;
  available: number;
  held: number;
  sold: number;
}

export interface AvailabilityResponse {
  showId: string;
  screenId: string;
  seats: AvailabilitySeat[];
  summary: AvailabilitySummary;
}
