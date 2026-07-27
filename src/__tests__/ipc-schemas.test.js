// Verify Zod IPC schemas validate correct data and reject bad data.
// Schemas are CommonJS (electron-side), so we import via createRequire.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  validate, AiQuerySchema, ExtractReferencesSchema, ClassifyResourceSchema,
  ConfirmReferenceSchema, BibleVerseSchema, OllamaChatSchema,
  DocumentSaveSchema, ProjectDataSchema, BackupRestoreSchema,
} = require('../../electron/schemas/ipc-schemas');

// Helper: expect success and return parsed data
function expectValid(schema, data) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(true);
  return result.data;
}

// Helper: expect failure and return error
function expectInvalid(schema, data) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  return result.error;
}

describe('IPC Schemas', () => {

  describe('AiQuerySchema', () => {
    it('accepts valid prompt with optional options', () => {
      const data = expectValid(AiQuerySchema, { prompt: 'Explain this passage' });
      expect(data.prompt).toBe('Explain this passage');
    });

    it('accepts prompt with model option', () => {
      const data = expectValid(AiQuerySchema, {
        prompt: 'Hello',
        options: { model: 'llama3', temperature: 0.5, maxTokens: 2048 },
      });
      expect(data.options.model).toBe('llama3');
    });

    it('rejects empty prompt', () => {
      expectInvalid(AiQuerySchema, { prompt: '' });
    });

    it('rejects missing prompt', () => {
      expectInvalid(AiQuerySchema, {});
    });
  });

  describe('ExtractReferencesSchema', () => {
    it('accepts text and projectId', () => {
      const data = expectValid(ExtractReferencesSchema, {
        text: 'Romanos 8:28 dice que todo ayuda a bien',
        projectId: 'project-123',
      });
      expect(data.text).toContain('Romanos');
    });

    it('rejects missing projectId', () => {
      expectInvalid(ExtractReferencesSchema, { text: 'some text' });
    });

    it('rejects empty text', () => {
      expectInvalid(ExtractReferencesSchema, { text: '', projectId: 'p-1' });
    });
  });

  describe('ClassifyResourceSchema', () => {
    it('accepts description', () => {
      const data = expectValid(ClassifyResourceSchema, { description: 'Mapa de Israel antiguo' });
      expect(data.description).toBe('Mapa de Israel antiguo');
    });

    it('rejects empty description', () => {
      expectInvalid(ClassifyResourceSchema, { description: '' });
    });
  });

  describe('ConfirmReferenceSchema', () => {
    it('accepts refId alone', () => {
      const data = expectValid(ConfirmReferenceSchema, { refId: 42 });
      expect(data.refId).toBe(42);
    });

    it('accepts (projectId, libro, capitulo, versiculo)', () => {
      const data = expectValid(ConfirmReferenceSchema, {
        projectId: 'p-1',
        libro: 'Romanos',
        capitulo: 8,
        versiculo: 28,
      });
      expect(data.libro).toBe('Romanos');
    });

    it('rejects empty object', () => {
      expectInvalid(ConfirmReferenceSchema, {});
    });

    it('rejects partial fields', () => {
      expectInvalid(ConfirmReferenceSchema, { projectId: 'p-1', libro: 'Romanos' });
    });
  });

  describe('BibleVerseSchema', () => {
    it('accepts valid verse reference', () => {
      const data = expectValid(BibleVerseSchema, {
        libro: 'Romanos',
        capitulo: 8,
        versiculo: 28,
      });
      expect(data.libro).toBe('Romanos');
    });

    it('accepts verse range', () => {
      const data = expectValid(BibleVerseSchema, {
        libro: 'Mateo',
        capitulo: 5,
        versiculo: 1,
        versiculoFinal: 12,
      });
      expect(data.versiculoFinal).toBe(12);
    });

    it('rejects chapter 0', () => {
      expectInvalid(BibleVerseSchema, {
        libro: 'Romanos', capitulo: 0, versiculo: 1,
      });
    });

    it('rejects missing libro', () => {
      expectInvalid(BibleVerseSchema, {
        capitulo: 1, versiculo: 1,
      });
    });
  });

  describe('OllamaChatSchema', () => {
    it('accepts valid chat request', () => {
      const data = expectValid(OllamaChatSchema, {
        model: 'granite4:3b',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(data.messages).toHaveLength(1);
    });

    it('rejects empty messages', () => {
      expectInvalid(OllamaChatSchema, {
        model: 'granite4:3b',
        messages: [],
      });
    });

    it('rejects invalid role', () => {
      expectInvalid(OllamaChatSchema, {
        model: 'granite4:3b',
        messages: [{ role: 'admin', content: 'test' }],
      });
    });

    it('rejects empty model', () => {
      expectInvalid(OllamaChatSchema, {
        model: '',
        messages: [{ role: 'user', content: 'test' }],
      });
    });
  });

  describe('DocumentSaveSchema', () => {
    it('accepts minimal doc (new)', () => {
      const data = expectValid(DocumentSaveSchema, { fileName: 'test.docx' });
      expect(data.fileName).toBe('test.docx');
    });

    it('accepts full doc (update)', () => {
      const data = expectValid(DocumentSaveSchema, {
        id: 1,
        fileName: 'test.docx',
        content: 'hello',
        html: '<p>hello</p>',
      });
      expect(data.id).toBe(1);
    });

    it('rejects missing fileName', () => {
      expectInvalid(DocumentSaveSchema, {});
    });
  });

  describe('ProjectDataSchema', () => {
    it('accepts minimal project', () => {
      const data = expectValid(ProjectDataSchema, {
        id: 'proj-1',
        type: 'libro',
        title: 'Mi libro',
      });
      expect(data.title).toBe('Mi libro');
    });

    it('accepts full project with sections', () => {
      const data = expectValid(ProjectDataSchema, {
        id: 'proj-1',
        type: 'libro',
        title: 'Test',
        template: 'classic-novel',
        sections: [{ id: 'sec-1', title: 'Cap 1', order_index: 0 }],
        style: 'manuscrito_clasico',
      });
      expect(data.sections).toHaveLength(1);
    });

    it('rejects missing id', () => {
      expectInvalid(ProjectDataSchema, { type: 'libro', title: 'Test' });
    });
  });

  describe('BackupRestoreSchema', () => {
    it('accepts valid backupPath', () => {
      const data = expectValid(BackupRestoreSchema, { backupPath: '/tmp/backup.db' });
      expect(data.backupPath).toBe('/tmp/backup.db');
    });

    it('rejects empty path', () => {
      expectInvalid(BackupRestoreSchema, { backupPath: '' });
    });
  });

  describe('validate() wrapper', () => {
    it('returns parsed data on success', () => {
      const data = validate(BibleVerseSchema, { libro: 'Romanos', capitulo: 8, versiculo: 28 }, 'test');
      expect(data.libro).toBe('Romanos');
    });

    it('throws on failure with ZOD_VALIDATION_ERROR code', () => {
      expect(() => {
        validate(BibleVerseSchema, { libro: '' }, 'test');
      }).toThrow(/Validation failed/);

      try {
        validate(BibleVerseSchema, { libro: '' }, 'test');
      } catch (err) {
        expect(err.code).toBe('ZOD_VALIDATION_ERROR');
        expect(err.zodErrors).toBeDefined();
      }
    });
  });

});
