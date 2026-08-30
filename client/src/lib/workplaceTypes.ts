export type WorkplaceStatus = 'Active' | 'Inactive';

export interface Location {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Area {
  id: string;
  name: string;
  description: string;
  order: number;
  locations: Location[];
}

export interface Workplace {
  id: string;
  organisation: string;
  name: string;
  code: string;
  industry: string;
  address: string;
  status: WorkplaceStatus;
  areas: Area[];
  createdAt: string;
  updatedAt: string;
}

export type WorkplaceActivityType = 'created' | 'status_change' | 'updated';

export interface WorkplaceActivityEntry {
  id: string;
  workplaceId: string;
  type: WorkplaceActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface WorkplaceDetail extends Workplace {
  activity: WorkplaceActivityEntry[];
}

export interface LocationInput {
  id?: string;
  name: string;
  description: string;
  order: number;
}

export interface AreaInput {
  id?: string;
  name: string;
  description: string;
  order: number;
  locations: LocationInput[];
}

export interface CreateWorkplacePayload {
  organisation: string;
  name: string;
  code: string;
  industry: string;
  address: string;
  areas: AreaInput[];
}

export interface UpdateWorkplacePayload {
  organisation?: string;
  name?: string;
  code?: string;
  industry?: string;
  address?: string;
  status?: WorkplaceStatus;
  areas?: AreaInput[];
}
