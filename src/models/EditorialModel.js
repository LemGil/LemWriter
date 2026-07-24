export class EditorialModel {
  constructor(config) {
    this.id = config.id || `model_${Date.now()}`;
    this.name = config.name || 'Nuevo Modelo';
    this.description = config.description || '';
    this.baseType = config.baseType; // 'book' | 'teaching' | 'devotional'
    this.isSystem = config.isSystem || false;
    
    // 4 Dimensions
    this.structure = config.structure || {
      requiredSections: [],
      optionalSections: [],
      maxDepth: 3,
      sectionRules: {}
    };
    
    this.design = config.design || {
      tokens: {},
      typography: {},
      colors: {},
      spacing: {},
      responsive: {},
      defaultContent: {}
    };
    
    this.rules = config.rules || {
      writingRules: [],
      validationRules: [],
      assistantRules: []
    };
    
    this.export = config.export || {
      defaults: {},
      formats: ['pdf', 'docx'],
      pageSize: 'A4',
      margin: 'standard'
    };

    this.metadata = config.metadata || {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0',
      author: 'Sistema'
    };
  }

  validate() {
    if (!this.name) return { valid: false, error: 'El nombre es obligatorio' };
    if (!this.baseType) return { valid: false, error: 'El tipo de proyecto es obligatorio' };
    if (this.structure.requiredSections.length === 0) return { valid: false, error: 'Debe tener al menos una sección requerida' };
    return { valid: true };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      baseType: this.baseType,
      isSystem: this.isSystem,
      structure: this.structure,
      design: this.design,
      rules: this.rules,
      export: this.export,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    return new EditorialModel(json);
  }
}
