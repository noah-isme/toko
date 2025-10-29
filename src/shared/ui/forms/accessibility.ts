export interface FieldA11yAttributes {
  id: string;
  name: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}

export function fieldA11y(name: string, errorId?: string | null): FieldA11yAttributes {
  return {
    id: name,
    name,
    'aria-invalid': Boolean(errorId),
    'aria-describedby': errorId ?? undefined,
  };
}
