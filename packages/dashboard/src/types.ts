export type Flag = {
  key: string;
  value: string;
  type: 'build-time' | 'runtime';
  environment: string;
  description: string;
  variants: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
};

export type Environment = 'production' | 'staging' | 'development';

export type CreateFlagInput = {
  key: string;
  value: string;
  type: 'build-time' | 'runtime';
  environment?: string;
  description?: string;
  variants?: string;
};

export type UpdateFlagInput = {
  value?: string;
  description?: string;
  variants?: string;
};

export type AuditLogEntry = {
  id: number;
  flag_key: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
};
