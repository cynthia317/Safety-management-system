import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Button } from '../Button';
import { QuestionEditor } from './QuestionEditor';
import type { QuestionInput, SectionInput } from '../../lib/inspectionTemplateTypes';

function newQuestion(order: number): QuestionInput {
  return {
    text: '',
    guidance: '',
    referenceNote: '',
    responseType: 'compliance',
    options: [],
    required: true,
    evidenceRequired: false,
    allowFindingCreation: true,
    order,
  };
}

interface SectionEditorProps {
  section: SectionInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (section: SectionInput) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function SectionEditor({ section, index, canMoveUp, canMoveDown, onChange, onMoveUp, onMoveDown, onDelete }: SectionEditorProps) {
  function updateQuestions(questions: QuestionInput[]) {
    onChange({ ...section, questions });
  }

  function addQuestion() {
    updateQuestions([...section.questions, newQuestion(section.questions.length)]);
  }

  function updateQuestion(qIndex: number, question: QuestionInput) {
    updateQuestions(section.questions.map((q, i) => (i === qIndex ? question : q)));
  }

  function moveQuestion(qIndex: number, direction: -1 | 1) {
    const next = [...section.questions];
    const target = qIndex + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[qIndex];
    const b = next[target];
    if (!a || !b) return;
    next[qIndex] = b;
    next[target] = a;
    updateQuestions(next);
  }

  function deleteQuestion(qIndex: number) {
    updateQuestions(section.questions.filter((_, i) => i !== qIndex));
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <FormField label="Section Title" htmlFor={`s-${index}-title`} required>
            <Input
              id={`s-${index}-title`}
              value={section.title}
              placeholder="e.g. Fire and Emergency Preparedness"
              onChange={(e) => onChange({ ...section, title: e.target.value })}
            />
          </FormField>
          <FormField label="Description" htmlFor={`s-${index}-description`} hint="Optional — shown to inspectors above the questions.">
            <Textarea
              id={`s-${index}-description`}
              rows={2}
              value={section.description}
              onChange={(e) => onChange({ ...section, description: e.target.value })}
            />
          </FormField>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move section up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move section down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={onDelete} aria-label="Delete section">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {section.questions.length === 0 ? (
          <p className="text-xs italic text-muted">No questions in this section yet.</p>
        ) : (
          section.questions.map((question, qIndex) => (
            <QuestionEditor
              key={qIndex}
              question={question}
              index={qIndex}
              canMoveUp={qIndex > 0}
              canMoveDown={qIndex < section.questions.length - 1}
              onChange={(q) => updateQuestion(qIndex, q)}
              onMoveUp={() => moveQuestion(qIndex, -1)}
              onMoveDown={() => moveQuestion(qIndex, 1)}
              onDelete={() => deleteQuestion(qIndex)}
            />
          ))
        )}
        <Button variant="secondary" className="text-xs" onClick={addQuestion}>
          <Plus className="h-3.5 w-3.5" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
