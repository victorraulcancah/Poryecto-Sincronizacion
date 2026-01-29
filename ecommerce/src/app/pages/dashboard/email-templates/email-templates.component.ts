import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { EmailTemplateService } from '../../../services/email-template.service';
import { EmailTemplate, EmailColors, ProductImage } from '../../../models/email-template.model';
import { ToastrService } from 'ngx-toastr';
import { QuillModule } from 'ngx-quill';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, QuillModule],
  templateUrl: './email-templates.component.html',
  styleUrls: ['./email-templates.component.scss']
})
export class EmailTemplatesComponent implements OnInit {
  templates: EmailTemplate[] = [];
  selectedTemplate: EmailTemplate | null = null;
  templateForm: FormGroup;
  activeTab: string = 'verification';
  isLoading = false;
  isSaving = false;
  previewHtml: SafeHtml = '';
  showPreview = false;
  

  // Configuración del editor Quill
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  };

  constructor(
    private emailTemplateService: EmailTemplateService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {
    this.templateForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  createForm(): FormGroup {
    return this.fb.group({
      subject: [''],
      greeting: [''],
      main_content: [''],
      secondary_content: [''],
      footer_text: [''],
      button_text: [''],
      button_url: [''],
      benefits_list: this.fb.array([]),
      product_images: this.fb.array([]),
      global_colors: this.fb.group({
        primary: ['#667eea'],
        secondary: ['#764ba2'],
        button_hover: ['#5a67d8'],
        background: ['#f4f4f4'],
        content_bg: ['#ffffff']
      }),
      use_default: [false]
    });
  }

  get benefitsList(): FormArray {
    return this.templateForm.get('benefits_list') as FormArray;
  }

  get productImages(): FormArray {
    return this.templateForm.get('product_images') as FormArray;
  }

  loadTemplates(): void {
    this.isLoading = true;
    this.emailTemplateService.getAllTemplates().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.templates = response.data;
          this.selectTemplate(this.activeTab);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.toastr.error('Error al cargar las plantillas');
        this.isLoading = false;
      }
    });
  }

  selectTemplate(templateName: string): void {
    this.activeTab = templateName;
    this.selectedTemplate = this.templates.find(t => t.name === templateName) || null;
    
    if (this.selectedTemplate) {
      this.populateForm(this.selectedTemplate);
    }
  }

  populateForm(template: EmailTemplate): void {
    // Limpiar arrays
    while (this.benefitsList.length !== 0) {
      this.benefitsList.removeAt(0);
    }
    while (this.productImages.length !== 0) {
      this.productImages.removeAt(0);
    }

    // Llenar benefits_list
    if (template.benefits_list) {
      template.benefits_list.forEach(benefit => {
        this.benefitsList.push(this.fb.control(benefit));
      });
    }

    // Llenar product_images
    if (template.product_images) {
      template.product_images.forEach(image => {
        this.productImages.push(this.fb.group({
          url: [image.url],
          text: [image.text]
        }));
      });
    }

    // Llenar el resto del formulario
    this.templateForm.patchValue({
      subject: template.subject || '',
      greeting: template.greeting || '',
      main_content: template.main_content || '',
      secondary_content: template.secondary_content || '',
      footer_text: template.footer_text || '',
      button_text: template.button_text || '',
      button_url: template.button_url || '',
      global_colors: template.global_colors || {
        primary: '#667eea',
        secondary: '#764ba2',
        button_hover: '#5a67d8',
        background: '#f4f4f4',
        content_bg: '#ffffff'
      },
      use_default: template.use_default || false
    });
  }

  addBenefit(): void {
    this.benefitsList.push(this.fb.control(''));
  }

  removeBenefit(index: number): void {
    this.benefitsList.removeAt(index);
  }

  addProductImage(): void {
    this.productImages.push(this.fb.group({
      url: [''],
      text: ['']
    }));
  }

  removeProductImage(index: number): void {
    this.productImages.removeAt(index);
  }

  onImageUpload(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      this.emailTemplateService.uploadImage(file).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            const imageControl = this.productImages.at(index) as FormGroup;
            imageControl.patchValue({ url: response.data.url });
            this.toastr.success('Imagen subida exitosamente');
          }
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          this.toastr.error('Error al subir la imagen');
        }
      });
    }
  }

  saveTemplate(): void {
    if (!this.selectedTemplate) return;

    this.isSaving = true;
    const formData = this.templateForm.value;

    this.emailTemplateService.updateTemplate(this.selectedTemplate.name, formData).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.toastr.success('Plantilla guardada exitosamente');
          this.loadTemplates(); // Recargar para obtener datos actualizados
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error saving template:', error);
        this.toastr.error('Error al guardar la plantilla');
        this.isSaving = false;
      }
    });
  }

  resetToDefault(): void {
    if (!this.selectedTemplate) return;

    if (confirm('¿Estás seguro de que quieres restaurar esta plantilla a sus valores por defecto?')) {
      this.isSaving = true;
      
      this.emailTemplateService.updateTemplate(this.selectedTemplate.name, { use_default: true }).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastr.success('Plantilla restaurada a valores por defecto');
            this.loadTemplates();
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error resetting template:', error);
          this.toastr.error('Error al restaurar la plantilla');
          this.isSaving = false;
        }
      });
    }
  }

  previewTemplate(): void {
    if (!this.selectedTemplate) return;

    this.emailTemplateService.previewTemplate(this.selectedTemplate.name).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(response.data.html);
          this.showPreview = true;
        }
      },
      error: (error) => {
        console.error('Error generating preview:', error);
        this.toastr.error('Error al generar la vista previa');
      }
    });
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewHtml = '';
  }

  getTemplateTitle(templateName: string): string {
    const titles = {
      'verification': 'Verificación de Email',
      'welcome': 'Bienvenida',
      'password_reset': 'Recuperación de Contraseña'
    };
    return titles[templateName as keyof typeof titles] || templateName;
  }
}
