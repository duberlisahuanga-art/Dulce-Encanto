export interface DeliveryZone { latitude?: number | null; longitude?: number | null; radius_km?: number | null; id: number; name: string; fee: string; is_active: boolean; }
export interface BlockedDate { id: number; date: string; reason: string | null; }
export interface DeliverySettings { max_units_per_product: number; max_units_per_order: number; minimum_lead_days: number; daily_capacity: number; opening_time: string; closing_time: string; }
export interface StoreCoverage { latitude: number; longitude: number; maximum_distance_km: number; }
export interface DeliveryConfiguration { settings: DeliverySettings; store: StoreCoverage; zones: DeliveryZone[]; blocked_dates: BlockedDate[]; }
export interface DeliveryConfigurationResponse { data: DeliveryConfiguration; }
