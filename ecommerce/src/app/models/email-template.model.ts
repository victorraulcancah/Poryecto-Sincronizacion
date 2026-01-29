export interface EmailTemplate {
  id: number;
  name: 'verification' | 'welcome' | 'password_reset';
  subject?: string;
  greeting?: string;
  main_content?: string;
  secondary_content?: string;
  footer_text?: string;
  benefits_list?: string[];
  product_images?: ProductImage[];
  button_text?: string;
  button_url?: string;
  global_colors?: EmailColors;
  is_active: boolean;
  use_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  url: string;
  text: string;
}

export interface EmailColors {
  primary: string;
  secondary: string;
  button_hover: string;
  background: string;
  content_bg: string;
}

export interface EmailTemplateUpdate {
  subject?: string;
  greeting?: string;
  main_content?: string;
  secondary_content?: string;
  footer_text?: string;
  benefits_list?: string[];
  product_images?: ProductImage[];
  button_text?: string;
  button_url?: string;
  global_colors?: EmailColors;
  use_default?: boolean;
}
