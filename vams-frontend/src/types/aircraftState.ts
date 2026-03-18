export type AircraftState =
  | 'APPROACH'
  | 'LANDING_QUEUE'
  | 'LANDING'
  | 'LANDED'
  | 'TAXI_TO_CHARGING'
  | 'CHARGING'
  | 'READY_FOR_DEPARTURE'
  | 'TAXI_TO_PAD'
  | 'DEPARTURE';