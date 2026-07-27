// Zod schemas for IPC message validation.
//
// Every schema has a .safeParse() that returns { success, data, error }.
// Use validate() below to assert or catch and return safe errors.
//
// Conventions:
//   - `z.string().min(1)` for required strings
//   - `.nullable()` for optional fields (null allowed)
//   - `.optional()` for absent fields (undefined allowed)
//   - Keep schemas here; import across ipc/ modules.

const { z } = require('zod');
const logger = require('../logger');

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Wraps safeParse so IPC handlers get a uniform interface.
 * Returns parsed data on success or throws a ZodError-style object.
 * Prefer this for handler bodies — no try/catch needed inline.
 */
function validate(schema, data, label) {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten(), label }, 'Schema validation failed');
    const err = new Error(`Validation failed for ${label}`);
    err.code = 'ZOD_VALIDATION_ERROR';
    err.zodErrors = result.error.flatten();
    throw err;
  }
  return result.data;
}

/**
 * Validates IPC event arguments — supports both single-object and
 * spread-args patterns by wrapping into an object.
 */
function validateIpcArgs(schema, args, label) {
  if (schema._def?.typeName === 'ZodObject' && args.length === 1 && typeof args[0] === 'object') {
    return validate(schema, args[0], label);
  }
  return validate(schema, args, label);
}

// ── Shared primitives ──────────────────────────────────────────

const projectId = z.string().min(1, 'projectId required');
const sectionId = z.string().min(1, 'sectionId required');
const resourceId = z.union([z.string(), z.number()]).pipe(z.coerce.number().positive());
const timestamp = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

// ── Project ────────────────────────────────────────────────────

const ProjectDataSchema = z.object({
  id: projectId,
  type: z.string().min(1),
  title: z.string().min(1),
  template: z.string().nullable().optional(),
  templateName: z.string().nullable().optional(),
  sections: z.array(z.object({
    id: sectionId,
    title: z.string().optional(),
    content: z.string().optional(),
    order_index: z.number().int().nonnegative().optional(),
    type: z.string().optional(),
  })).optional(),
  designTokens: z.record(z.unknown()).optional(),
  smartRules: z.record(z.unknown()).optional(),
  panelConfig: z.record(z.unknown()).optional(),
  style: z.string().optional(),
}).strict();

// ── Export ──────────────────────────────────────────────────────

const ExportStyleSchema = z.object({
  pageSize: z.string().optional(),
  margins: z.object({
    top: z.string(), bottom: z.string(), left: z.string(), right: z.string(),
  }).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  lineHeight: z.number().positive().optional(),
  chapterStart: z.enum(['newPage', 'samePage']).optional(),
  headerCenter: z.string().optional(),
  headerRight: z.string().optional(),
  showPageNumbers: z.boolean().optional(),
  includeAppendix: z.boolean().optional(),
  includeTableOfContents: z.boolean().optional(),
}).strict().partial();

const ExportParamsSchema = z.object({
  project: ProjectDataSchema,
  sections: z.array(z.object({
    id: sectionId, title: z.string(), content: z.string().optional(),
    order_index: z.number().int().optional(), type: z.string().optional(),
  })),
  style: ExportStyleSchema,
}).strict();

// ── Documents ──────────────────────────────────────────────────

const DocumentSaveSchema = z.object({
  id: z.number().positive().optional(),
  fileName: z.string().min(1),
  filePath: z.string().optional(),
  fileType: z.string().optional(),
  content: z.string().optional(),
  html: z.string().optional(),
}).strict();

const DocumentIdSchema = z.object({
  id: z.union([z.string(), z.number()]).pipe(z.coerce.number().positive()),
});

// ── Backup ────────────────────────────────────────────────────

const BackupRestoreSchema = z.object({
  backupPath: z.string().min(1),
}).strict();

// ── Ollama ─────────────────────────────────────────────────────

const OllamaMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const OllamaChatSchema = z.object({
  model: z.string().min(1),
  messages: z.array(OllamaMessageSchema).min(1),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
}).strict();

const OllamaGenerateSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
}).strict();

// ── AI service ──────────────────────────────────────────────────

const AiQuerySchema = z.object({
  prompt: z.string().min(1),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  }).optional(),
}).strict();

const ExtractReferencesSchema = z.object({
  text: z.string().min(1),
  projectId: projectId,
  options: z.object({
    model: z.string().optional(),
  }).optional(),
}).strict();

const ClassifyResourceSchema = z.object({
  description: z.string().min(1),
  options: z.object({
    model: z.string().optional(),
  }).optional(),
}).strict();

const ConfirmReferenceSchema = z.object({
  refId: z.number().int().positive().optional(),
  projectId: projectId.optional(),
  libro: z.string().min(1).optional(),
  capitulo: z.number().int().positive().optional(),
  versiculo: z.number().int().positive().optional(),
  versiculo_final: z.number().int().positive().nullable().optional(),
}).strict().refine(
  (data) => data.refId || (data.projectId && data.libro && data.capitulo !== undefined && data.versiculo !== undefined),
  { message: 'Either refId or (projectId+libro+capitulo+versiculo) required' }
);

// ── Bible ──────────────────────────────────────────────────────

const BibleVerseSchema = z.object({
  libro: z.string().min(1),
  capitulo: z.number().int().positive(),
  versiculo: z.number().int().positive(),
  versiculoFinal: z.number().int().positive().nullable().optional(),
}).strict();

// ── App / Window state ────────────────────────────────────────

const SaveLastProjectSchema = z.object({
  projectId: projectId,
}).strict();

// ── DB (low-level — minimal validation) ────────────────────────

const DbQuerySchema = z.tuple([
  z.string().min(1),
  z.array(z.unknown()).optional(),
]);

const DbExecuteSchema = z.tuple([
  z.string().min(1),
  z.array(z.unknown()).optional(),
]);

// ── Exports ────────────────────────────────────────────────────

module.exports = {
  validate,
  validateIpcArgs,
  ProjectDataSchema,
  ExportParamsSchema,
  DocumentSaveSchema,
  DocumentIdSchema,
  BackupRestoreSchema,
  OllamaChatSchema,
  OllamaGenerateSchema,
  AiQuerySchema,
  ExtractReferencesSchema,
  ClassifyResourceSchema,
  ConfirmReferenceSchema,
  BibleVerseSchema,
  SaveLastProjectSchema,
  DbQuerySchema,
  DbExecuteSchema,
};
