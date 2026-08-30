import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Button } from '../components/Button';
import { FormField } from '../components/form/FormField';
import { Input } from '../components/form/Input';
import { Select } from '../components/form/Select';
import { Textarea } from '../components/form/Textarea';
import { Checkbox } from '../components/form/Checkbox';
import { CorrectiveActionEvidenceUpload, type PendingEvidence } from '../components/corrective-actions/CorrectiveActionEvidenceUpload';
import { createIncident } from '../lib/incidentsApi';
import { listHazards } from '../lib/hazardsApi';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { ApiError } from '../lib/api';
import type { EventType, IncidentCategory, InjurySeverity, Severity } from '../lib/incidentTypes';
import type { HazardReport } from '../lib/hazardTypes';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Incident', label: 'Incident' },
  { value: 'NearMiss', label: 'Near Miss' },
];

const CATEGORIES: IncidentCategory[] = [
  'Injury/Illness',
  'Property Damage',
  'Environmental',
  'Fire',
  'Equipment',
  'Vehicle',
  'Security',
  'Other',
];

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
const INJURY_SEVERITIES: InjurySeverity[] = ['None', 'First Aid', 'Medical Treatment', 'Lost Time', 'Fatality'];

export function NewIncidentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [eventType, setEventType] = useState<EventType>('Incident');
  const [category, setCategory] = useState<IncidentCategory>('Other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [peopleInvolved, setPeopleInvolved] = useState('');
  const [injuryOccurred, setInjuryOccurred] = useState(false);
  const [injurySeverity, setInjurySeverity] = useState<InjurySeverity>('First Aid');
  const [immediateActionTaken, setImmediateActionTaken] = useState('');
  const [actualSeverity, setActualSeverity] = useState<Severity>('Low');
  const [potentialSeverity, setPotentialSeverity] = useState<Severity>('Medium');
  const [hazardId, setHazardId] = useState('');
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [evidence, setEvidence] = useState<PendingEvidence[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listHazards()
      .then((res) => setHazards(res.items))
      .catch(() => {
        // Non-critical — the "link a hazard" dropdown just stays empty.
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrors({});
    setSubmitting(true);

    try {
      const created = await createIncident({
        eventType,
        category,
        title: title.trim(),
        description: description.trim(),
        workplace: user.workplace,
        department: department.trim(),
        location: location.trim(),
        eventDate: new Date(eventDate).toISOString(),
        peopleInvolved: peopleInvolved.trim(),
        injuryOccurred,
        injurySeverity: injuryOccurred ? injurySeverity : null,
        immediateActionTaken: immediateActionTaken.trim(),
        actualSeverity,
        potentialSeverity,
        hazardId: hazardId || null,
        evidence: evidence.map(({ fileName, fileSize, mimeType, dataUrl }) => ({ fileName, fileSize, mimeType, dataUrl })),
      });
      showToast('success', `${created.eventType === 'NearMiss' ? 'Near miss' : 'Incident'} ${created.referenceNumber} reported.`);
      navigate(`/incidents/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      showToast('error', err instanceof Error ? err.message : 'Could not report this.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Report Incident / Near Miss" description="A quick initial report — the investigation is completed separately." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="What happened">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="eventType" required>
              <Select id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="category" required error={errors.category}>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Title" htmlFor="title" required error={errors.title}>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Description" htmlFor="description" required error={errors.description} hint="Describe what happened.">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Where and when">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Department" htmlFor="department" required error={errors.department}>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </FormField>
            <FormField label="Specific Location" htmlFor="location" required error={errors.location}>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </FormField>
            <FormField label="Event Date" htmlFor="eventDate" required error={errors.eventDate}>
              <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </FormField>
          </div>
          {hazards.length > 0 && (
            <div className="mt-4">
              <FormField label="Link to an existing hazard (optional)" htmlFor="hazardId">
                <Select id="hazardId" value={hazardId} onChange={(e) => setHazardId(e.target.value)}>
                  <option value="">None</option>
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.referenceNumber} — {h.title}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}
        </SectionCard>

        <SectionCard title="People and consequences">
          <div className="space-y-4">
            <FormField label="People Involved" htmlFor="peopleInvolved" hint="Who was involved — no medical details.">
              <Input id="peopleInvolved" value={peopleInvolved} onChange={(e) => setPeopleInvolved(e.target.value)} />
            </FormField>
            <Checkbox
              id="injuryOccurred"
              label="An injury or illness occurred"
              checked={injuryOccurred}
              onChange={(e) => setInjuryOccurred(e.target.checked)}
            />
            {injuryOccurred && (
              <FormField label="Injury Severity" htmlFor="injurySeverity" required error={errors.injurySeverity}>
                <Select id="injurySeverity" value={injurySeverity} onChange={(e) => setInjurySeverity(e.target.value as InjurySeverity)}>
                  {INJURY_SEVERITIES.filter((s) => s !== 'None').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Immediate Action Taken" htmlFor="immediateActionTaken">
              <Textarea id="immediateActionTaken" value={immediateActionTaken} onChange={(e) => setImmediateActionTaken(e.target.value)} rows={2} />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Actual Severity" htmlFor="actualSeverity" required error={errors.actualSeverity} hint="What actually happened.">
                <Select id="actualSeverity" value={actualSeverity} onChange={(e) => setActualSeverity(e.target.value as Severity)}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Potential Severity"
                htmlFor="potentialSeverity"
                required
                error={errors.potentialSeverity}
                hint="What could have happened."
              >
                <Select id="potentialSeverity" value={potentialSeverity} onChange={(e) => setPotentialSeverity(e.target.value as Severity)}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Evidence" description="Photos, PDFs, or documents — optional.">
          <CorrectiveActionEvidenceUpload files={evidence} onChange={setEvidence} />
        </SectionCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/incidents')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Submit Report
          </Button>
        </div>
      </form>
    </>
  );
}
