// --------- CLIENTES ----------
export interface Client {
  id: number;
  name: string;
  doc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateClientRequest {
  name: string;
  doc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

// --------- PRODUTOS ----------
export interface Product {
  id: number;
  name: string;
  unit: string;
  min_quantity: number;
  current_quantity: number;
  is_critical?: boolean;
  created_at: string;
  updated_at?: string;

  // extras suportados no backend
  registration_ms?: string | null;
  group_chemical?: string | null;
  composition?: string | null;
  antidote?: string | null;
  toxicity_action?: string | null;
  recommended_dilution?: string | null;
  emergency_phone?: string | null;

  // novos padrões para preencher FAES/certificado
  default_diluent?: string | null;
  application_rate?: string | null;
  target_pests?: string | null;
  default_equipment?: string | null;

  // ⬇️ calculados pelo backend (sem persistir)
  urgency_number?: number; // 0..100 (% de déficit)
  urgency_label?: "OK" | "Baixa" | "Média" | "Alta" | "Crítica";
}

export interface CreateProductRequest {
  name: string;
  unit: string;
  min_quantity: number;
  current_quantity: number;

  registration_ms?: string | null;
  group_chemical?: string | null;
  composition?: string | null;
  antidote?: string | null;
  toxicity_action?: string | null;
  recommended_dilution?: string | null;
  emergency_phone?: string | null;

  default_diluent?: string | null;
  application_rate?: string | null;
  target_pests?: string | null;
  default_equipment?: string | null;
}

export interface QuantityUpdateRequest {
  delta?: number;
  absolute?: number;
}

// --------- TÉCNICOS ----------
export interface Technician {
  id: number;
  name: string;
  role?: string | null;
  registry?: string | null;
  phone?: string | null;
  email?: string | null;
  signature_path?: string | null;
  created_at: string;
  updated_at?: string;
}
export interface CreateTechnicianRequest {
  name: string;
  role?: string | null;
  registry?: string | null;
  phone?: string | null;
  email?: string | null;
  signature_path?: string | null;
}

// --------- ORDENS DE SERVIÇO ----------
export interface ServiceOrderLine {
  praga: string;
  product_id: number;
  aplicacao?: string | null;
  diluicao?: string | null;
  quantidade: number;
  garantia?: string | null;
  product?: Product;
}

export type ServiceOrderStatusEN =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface ServiceOrder {
  id: number;
  public_code: string;
  client_id: number;
  client?: Client;
  scheduled_at?: string | null;
  status: ServiceOrderStatusEN | string;
  notes?: string | null;
  lines: ServiceOrderLine[];
  technicians?: Technician[];
  created_at: string;
  updated_at?: string;
}

export interface CreateServiceOrderRequest {
  client_id: number;
  scheduled_at?: string;
  notes?: string;
  technician_ids?: number[];
  lines: Array<{
    praga: string;
    product_id: number;
    aplicacao?: string;
    diluicao?: string;
    quantidade: number;
    garantia?: string;
  }>;
}

// --------- FAES (ServiceEvaluation) ----------
export interface ServiceEvaluationLine {
  id?: number;
  product_id: number;
  group_chemical?: string | null;
  registration_ms?: string | null;
  concentration?: string | null;
  diluent?: string | null;
  volume_applied?: string | null;
  presentation_form?: string | null;
  equipment_used?: string | null;
  epi?: string | null;
  toxicity_action?: string | null;
  antidote_index?: string | null;
  medical_indication?: string | null;
  product?: Product;
}

export interface ServiceEvaluation {
  id: number;
  service_order_id: number;
  evaluation_date?: string | null;
  branch_activity?: string | null;
  complaints?: string | null;
  arthropods?: string | null;
  rodents?: string | null;
  other_species?: string | null;
  internal_area_desc?: string | null;
  internal_area_size?: number | null;
  external_area_desc?: string | null;
  external_area_size?: number | null;
  vicinal_characteristics?: string | null;
  found_vectors?: string | null;
  infestation_degree_internal?: string | null;
  infestation_degree_external?: string | null;
  preliminary_responsible_id?: number | null;
  preliminary_opinion?: string | null;
  created_at: string;
  updated_at?: string;
  lines: ServiceEvaluationLine[];
}

export interface CreateServiceEvaluationRequest {
  service_order_id: number;
  evaluation_date?: string;
  branch_activity?: string;
  complaints?: string;
  arthropods?: string;
  rodents?: string;
  other_species?: string;
  internal_area_desc?: string;
  internal_area_size?: number;
  external_area_desc?: string;
  external_area_size?: number;
  vicinal_characteristics?: string;
  found_vectors?: string;
  infestation_degree_internal?: string;
  infestation_degree_external?: string;
  preliminary_responsible_id?: number;
  preliminary_opinion?: string;
  lines?: ServiceEvaluationLine[];
}

// --------- GENÉRICOS ----------
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string | null;
}

export interface CalendarEvent {
  id: string | number;
  title: string;
  start: string;
  end?: string | null;
  all_day?: boolean;
  service_order_id?: number | null;
}

// (opcional) auth
export interface AuthLoginRequest {
  email: string;
  password: string;
}
export interface AuthLoginResponse {
  access_token: string;
}
