export const fieldTypes = [
  "radio",
  "checkbox",
  "select",
  "rating",
  "textarea",
  "text",
  "boolean",
] as const;

export type FormFieldType = (typeof fieldTypes)[number];

export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
};

export type FormPrimitiveValue = string | string[] | number | boolean | undefined;

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  helpText?: string;
  defaultValue?: FormPrimitiveValue;
  options?: string[];
  min?: number;
  max?: number;
  validation?: FieldValidation;
};

export type FormSchema = {
  fields: FormField[];
};

export type FormValue = Record<string, FormPrimitiveValue>;
