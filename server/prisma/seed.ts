/**
 * One-time database seed. Idempotent — skips entirely if any user already
 * exists, so it's safe to run again by accident. Run with `npx prisma db seed`
 * (or automatically after `prisma migrate dev` on a fresh database).
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

async function seedUsers() {
  const users = [
    { name: 'Admin User', email: 'admin@safetyos.local', role: 'Admin', workplace: 'Head Office', createdAt: '2026-01-05T09:00:00.000Z' },
    { name: 'J. Alonso', email: 'j.alonso@safetyos.local', role: 'Manager', workplace: 'Head Office', createdAt: '2026-01-05T09:00:00.000Z' },
    { name: 'K. Mensah', email: 'k.mensah@safetyos.local', role: 'EHS Officer', workplace: 'Main Plant', createdAt: '2026-01-06T09:00:00.000Z' },
    { name: 'D. Brooks', email: 'd.brooks@safetyos.local', role: 'Supervisor', workplace: 'Main Plant', createdAt: '2026-01-06T09:00:00.000Z' },
    { name: 'L. Chen', email: 'l.chen@safetyos.local', role: 'Supervisor', workplace: 'Main Plant', createdAt: '2026-01-06T09:00:00.000Z' },
    { name: 'R. Ibrahim', email: 'r.ibrahim@safetyos.local', role: 'Worker', workplace: 'Distribution Center', createdAt: '2026-01-06T09:00:00.000Z' },
  ];

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, SALT_ROUNDS);
  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash, isActive: true, createdAt: new Date(u.createdAt) } });
  }
  console.log(`Seeded ${users.length} users (demo password: ${DEMO_PASSWORD}).`);
}

async function seedWorkplaces() {
  const organisation = 'Meridian Manufacturing Ltd.';

  await prisma.workplace.create({
    data: {
      organisation,
      name: 'Head Office',
      code: 'HQ',
      industry: 'Office',
      address: '14 Independence Avenue, Nairobi',
      status: 'Active',
      areas: {
        create: [
          {
            name: 'Administration',
            description: '',
            order: 0,
            locations: { create: [{ name: 'Reception', description: '', order: 0 }, { name: 'Finance Office', description: '', order: 1 }] },
          },
          {
            name: 'IT & Facilities',
            description: '',
            order: 1,
            locations: { create: [{ name: 'Server Room', description: '', order: 0 }, { name: 'Facilities Store', description: '', order: 1 }] },
          },
        ],
      },
    },
  });

  await prisma.workplace.create({
    data: {
      organisation,
      name: 'Main Plant',
      code: 'PLANT-01',
      industry: 'Manufacturing',
      address: 'Industrial Area, Plot 22, Nairobi',
      status: 'Active',
      areas: {
        create: [
          {
            name: 'Production Floor',
            description: '',
            order: 0,
            locations: {
              create: [
                { name: 'Assembly Line 1', description: '', order: 0 },
                { name: 'Assembly Line 2', description: '', order: 1 },
                { name: 'Quality Control Bay', description: '', order: 2 },
              ],
            },
          },
          {
            name: 'Warehouse B',
            description: '',
            order: 1,
            locations: { create: [{ name: 'Raw Materials Rack A', description: '', order: 0 }, { name: 'Finished Goods Dock', description: '', order: 1 }] },
          },
          {
            name: 'Maintenance Workshop',
            description: '',
            order: 2,
            locations: { create: [{ name: 'Tool Crib', description: '', order: 0 }, { name: 'Welding Bay', description: '', order: 1 }] },
          },
        ],
      },
    },
  });

  await prisma.workplace.create({
    data: {
      organisation,
      name: 'Distribution Center',
      code: 'DC-01',
      industry: 'Warehouse',
      address: 'Mombasa Road, Nairobi',
      status: 'Active',
      areas: {
        create: [
          {
            name: 'Loading Bay',
            description: '',
            order: 0,
            locations: { create: [{ name: 'Dock 3', description: '', order: 0 }, { name: 'Dock 4', description: '', order: 1 }] },
          },
          {
            name: 'Cold Storage',
            description: '',
            order: 1,
            locations: { create: [{ name: 'Chiller Room 1', description: '', order: 0 }] },
          },
        ],
      },
    },
  });

  console.log('Seeded 3 workplaces.');
}

async function seedHazards() {
  const hazards = [
    {
      referenceNumber: 'HZ-1042',
      title: 'Blocked emergency exit in Warehouse B',
      description: 'The rear emergency exit door in Warehouse B was found blocked by stacked pallets, preventing it from opening fully during a routine walkthrough.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Fire Safety',
      workplace: 'Main Plant',
      department: 'Warehouse B',
      location: 'Rear emergency exit door, next to bay 3',
      peopleAtRisk: 'All warehouse staff on shift (approx. 15 people) and emergency responders during an evacuation.',
      immediateActionTaken: 'Pallets partially cleared from the doorway; exit route re-opened enough to pass through and the area was cordoned off pending full clearance.',
      riskLevel: 'High',
      status: 'Under Review',
      reportedBy: 'T. Okafor',
      assignedTo: 'K. Mensah',
      reportedAt: '2026-08-15T08:12:00.000Z',
      updatedAt: '2026-08-15T13:45:00.000Z',
      activity: [
        { type: 'created', message: 'Hazard report submitted.', actor: 'T. Okafor', createdAt: '2026-08-15T08:12:00.000Z' },
        { type: 'status_change', message: 'Status changed from New to Under Review.', actor: 'K. Mensah', createdAt: '2026-08-15T13:45:00.000Z' },
      ],
      comments: [{ author: 'K. Mensah', message: 'Reviewing now — requesting facilities clear the remaining pallets by end of day.', createdAt: '2026-08-15T13:47:00.000Z' }],
    },
    {
      referenceNumber: 'HZ-1041',
      title: 'Missing machine guard on Press #3',
      description: 'The fixed guard on the in-feed roller of Press #3 was found missing during shift changeover, exposing the pinch point.',
      reportType: 'Equipment Defect',
      hazardCategory: 'Mechanical',
      workplace: 'Main Plant',
      department: 'Production Floor',
      location: 'Press #3, in-feed roller, Line 2',
      peopleAtRisk: 'Press operators and adjacent line workers (approx. 4 people per shift).',
      immediateActionTaken: 'Machine locked out and tagged out; production on Press #3 halted until the guard is reinstalled.',
      riskLevel: 'Critical',
      status: 'Action Required',
      reportedBy: 'M. Alvarez',
      assignedTo: 'D. Brooks',
      reportedAt: '2026-08-15T09:40:00.000Z',
      updatedAt: '2026-08-15T10:05:00.000Z',
      activity: [
        { type: 'created', message: 'Hazard report submitted.', actor: 'M. Alvarez', createdAt: '2026-08-15T09:40:00.000Z' },
        { type: 'status_change', message: 'Status changed from New to Action Required.', actor: 'D. Brooks', createdAt: '2026-08-15T10:05:00.000Z' },
      ],
      comments: [{ author: 'D. Brooks', message: 'Replacement guard on order. Press #3 remains locked out until installed and verified.', createdAt: '2026-08-15T10:07:00.000Z' }],
    },
    {
      referenceNumber: 'HZ-1039',
      title: 'Expired fire extinguisher service tag',
      description: 'The extinguisher at the loading bay 2 station has a service tag showing an expiry date from last quarter.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Fire Safety',
      workplace: 'Distribution Center',
      department: 'Loading Bay',
      location: 'Extinguisher station near dock door 2',
      peopleAtRisk: 'All personnel in the loading bay area in the event of a fire.',
      immediateActionTaken: 'Expired extinguisher flagged with warning tape; replacement requested from facilities.',
      riskLevel: 'Medium',
      status: 'Action Required',
      reportedBy: 'J. Kowalski',
      assignedTo: 'L. Chen',
      reportedAt: '2026-08-14T14:05:00.000Z',
      updatedAt: '2026-08-14T15:00:00.000Z',
      activity: [
        { type: 'created', message: 'Hazard report submitted.', actor: 'J. Kowalski', createdAt: '2026-08-14T14:05:00.000Z' },
        { type: 'status_change', message: 'Status changed from New to Action Required.', actor: 'L. Chen', createdAt: '2026-08-14T15:00:00.000Z' },
      ],
      comments: [],
    },
    {
      referenceNumber: 'HZ-1037',
      title: 'Oil spill near loading bay',
      description: 'A hydraulic oil spill was found on the forklift lane near loading bay 4, creating a slip hazard.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Slip, Trip & Fall',
      workplace: 'Distribution Center',
      department: 'Loading Bay',
      location: 'Loading bay 4, forklift lane',
      peopleAtRisk: 'Forklift operators and dock workers.',
      immediateActionTaken: 'Spill contained with absorbent granules and warning cones placed; area roped off.',
      riskLevel: 'High',
      status: 'New',
      reportedBy: 'R. Singh',
      assignedTo: '',
      reportedAt: '2026-08-13T11:22:00.000Z',
      updatedAt: '2026-08-13T11:22:00.000Z',
      activity: [{ type: 'created', message: 'Hazard report submitted.', actor: 'R. Singh', createdAt: '2026-08-13T11:22:00.000Z' }],
      comments: [],
    },
    {
      referenceNumber: 'HZ-1035',
      title: 'Damaged electrical socket in workshop',
      description: 'A wall socket near workbench 2 in the maintenance workshop has a cracked faceplate with exposed wiring visible.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Electrical',
      workplace: 'Main Plant',
      department: 'Maintenance Workshop',
      location: 'Socket near workbench 2',
      peopleAtRisk: 'Maintenance technicians using workbench 2 and nearby power tools.',
      immediateActionTaken: 'Socket isolated at the breaker and taped off; portable power strip provided as a temporary alternative.',
      riskLevel: 'Medium',
      status: 'Closed',
      reportedBy: 'A. Novak',
      assignedTo: 'D. Brooks',
      reportedAt: '2026-08-10T09:00:00.000Z',
      updatedAt: '2026-08-11T16:30:00.000Z',
      activity: [
        { type: 'created', message: 'Hazard report submitted.', actor: 'A. Novak', createdAt: '2026-08-10T09:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from New to Under Review.', actor: 'D. Brooks', createdAt: '2026-08-10T11:15:00.000Z' },
        { type: 'status_change', message: 'Status changed from Under Review to Action Required.', actor: 'D. Brooks', createdAt: '2026-08-10T11:16:00.000Z' },
        { type: 'status_change', message: 'Status changed from Action Required to Resolved.', actor: 'D. Brooks', createdAt: '2026-08-11T15:50:00.000Z' },
        { type: 'status_change', message: 'Status changed from Resolved to Closed.', actor: 'A. Novak', createdAt: '2026-08-11T16:30:00.000Z' },
      ],
      comments: [
        { author: 'D. Brooks', message: 'Socket replaced and re-tested. Safe to return to normal use.', createdAt: '2026-08-11T15:52:00.000Z' },
        { author: 'A. Novak', message: 'Confirmed fixed on walkthrough. Closing this out.', createdAt: '2026-08-11T16:30:00.000Z' },
      ],
    },
  ];

  for (const h of hazards) {
    const { activity, comments, ...fields } = h;
    await prisma.hazardReport.create({
      data: {
        ...fields,
        reportedAt: new Date(fields.reportedAt),
        updatedAt: new Date(fields.updatedAt),
        activity: { create: activity.map((a) => ({ ...a, createdAt: new Date(a.createdAt) })) },
        comments: { create: comments.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })) },
      },
    });
  }
  await prisma.counter.create({ data: { name: 'hazard', value: 1042 } });
  console.log(`Seeded ${hazards.length} hazard reports.`);
}

async function seedFindings() {
  const findings = [
    {
      referenceNumber: 'FND-0231',
      title: 'Missing machine guard on Press #3',
      description: 'Confirmed during walkthrough: the fixed guard on the in-feed roller of Press #3 is missing, exposing the pinch point during operation.',
      workplace: 'Main Plant',
      department: 'Production Floor',
      location: 'Press #3, in-feed roller, Line 2',
      riskLevel: 'Critical',
      status: 'In Progress',
      createdBy: 'D. Brooks',
      assignedTo: 'D. Brooks',
      dueDate: '2026-08-19T00:00:00.000Z',
      createdAt: '2026-08-15T10:30:00.000Z',
      updatedAt: '2026-08-16T09:00:00.000Z',
      activity: [
        { type: 'created', message: 'Finding created.', actor: 'D. Brooks', createdAt: '2026-08-15T10:30:00.000Z' },
        { type: 'status_change', message: 'Status changed from Open to In Progress.', actor: 'D. Brooks', createdAt: '2026-08-16T09:00:00.000Z' },
      ],
      comments: [{ author: 'D. Brooks', message: 'Replacement guard on order, expected tomorrow. Press remains locked out.', createdAt: '2026-08-16T09:02:00.000Z' }],
    },
    {
      referenceNumber: 'FND-0229',
      title: 'Blocked emergency exit route in Warehouse B',
      description: 'Rear emergency exit route in Warehouse B was obstructed by stacked pallets. Route has since been cleared; verifying it stays clear going forward.',
      workplace: 'Main Plant',
      department: 'Warehouse B',
      location: 'Rear emergency exit corridor, next to bay 3',
      riskLevel: 'High',
      status: 'Awaiting Verification',
      createdBy: 'K. Mensah',
      assignedTo: 'K. Mensah',
      dueDate: '2026-08-20T00:00:00.000Z',
      createdAt: '2026-08-15T14:00:00.000Z',
      updatedAt: '2026-08-16T15:00:00.000Z',
      activity: [
        { type: 'created', message: 'Finding created.', actor: 'K. Mensah', createdAt: '2026-08-15T14:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Open to In Progress.', actor: 'K. Mensah', createdAt: '2026-08-15T16:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from In Progress to Awaiting Verification.', actor: 'K. Mensah', createdAt: '2026-08-16T15:00:00.000Z' },
      ],
      comments: [],
    },
    {
      referenceNumber: 'FND-0225',
      title: 'Unlabeled chemical storage containers',
      description: 'Several containers in the chemical store have missing or illegible hazard labels, making contents difficult to identify safely.',
      workplace: 'Distribution Center',
      department: 'Chemical Store',
      location: 'Chemical store, shelving row 2',
      riskLevel: 'High',
      status: 'Open',
      createdBy: 'L. Chen',
      assignedTo: 'L. Chen',
      dueDate: '2026-08-22T00:00:00.000Z',
      createdAt: '2026-08-14T11:00:00.000Z',
      updatedAt: '2026-08-14T11:00:00.000Z',
      activity: [{ type: 'created', message: 'Finding created.', actor: 'L. Chen', createdAt: '2026-08-14T11:00:00.000Z' }],
      comments: [],
    },
    {
      referenceNumber: 'FND-0221',
      title: 'Frayed lifting sling on overhead crane',
      description: 'The nylon lifting sling on the Fabrication Bay overhead crane shows visible fraying along one edge and should be taken out of service.',
      workplace: 'Main Plant',
      department: 'Fabrication Bay',
      location: 'Overhead crane, bay 2',
      riskLevel: 'Critical',
      status: 'Open',
      createdBy: 'D. Brooks',
      assignedTo: '',
      dueDate: '2026-08-18T00:00:00.000Z',
      createdAt: '2026-08-13T08:30:00.000Z',
      updatedAt: '2026-08-13T08:30:00.000Z',
      activity: [{ type: 'created', message: 'Finding created.', actor: 'D. Brooks', createdAt: '2026-08-13T08:30:00.000Z' }],
      comments: [],
    },
  ];

  for (const f of findings) {
    const { activity, comments, ...fields } = f;
    await prisma.finding.create({
      data: {
        ...fields,
        hazardId: null,
        hazardReferenceNumber: null,
        inspectionId: null,
        inspectionReferenceNumber: null,
        dueDate: new Date(fields.dueDate),
        createdAt: new Date(fields.createdAt),
        updatedAt: new Date(fields.updatedAt),
        activity: { create: activity.map((a) => ({ ...a, createdAt: new Date(a.createdAt) })) },
        comments: { create: comments.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })) },
      },
    });
  }
  await prisma.counter.create({ data: { name: 'finding', value: 231 } });
  console.log(`Seeded ${findings.length} findings.`);
}

async function seedCorrectiveActions() {
  const findingByRef = new Map(
    (await prisma.finding.findMany({ select: { id: true, referenceNumber: true } })).map((f) => [f.referenceNumber, f.id]),
  );

  const actions = [
    {
      referenceNumber: 'CA-0511',
      title: 'Install fixed guard on Press #3 in-feed roller',
      description: 'Reinstall and secure an appropriate fixed guard on the in-feed roller of Press #3 before the machine returns to service.',
      workplace: 'Main Plant',
      department: 'Production Floor',
      location: 'Press #3, in-feed roller, Line 2',
      priority: 'Critical',
      status: 'In Progress',
      sourceType: 'Finding',
      findingRef: 'FND-0231',
      createdBy: 'D. Brooks',
      assignedTo: 'D. Brooks',
      dueDate: '2026-08-19T00:00:00.000Z',
      responseNote: '',
      respondedAt: null as string | null,
      evidenceNote: '',
      verifiedBy: '',
      verifiedAt: null as string | null,
      createdAt: '2026-08-15T11:00:00.000Z',
      updatedAt: '2026-08-16T09:00:00.000Z',
      closedAt: null as string | null,
      activity: [
        { type: 'created', message: 'Corrective action created.', actor: 'D. Brooks', createdAt: '2026-08-15T11:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Assigned to In Progress.', actor: 'D. Brooks', createdAt: '2026-08-16T09:00:00.000Z' },
      ],
      comments: [{ author: 'D. Brooks', message: 'Replacement guard on order, expected tomorrow.', createdAt: '2026-08-16T09:02:00.000Z' }],
    },
    {
      referenceNumber: 'CA-0508',
      title: 'Clear and re-mark emergency exit route, Warehouse B',
      description: 'Clear the rear emergency exit corridor of stored pallets and re-mark the floor route markings.',
      workplace: 'Main Plant',
      department: 'Warehouse B',
      location: 'Rear emergency exit corridor, next to bay 3',
      priority: 'High',
      status: 'Awaiting Verification',
      sourceType: 'Finding',
      findingRef: 'FND-0229',
      createdBy: 'K. Mensah',
      assignedTo: 'L. Chen',
      dueDate: '2026-08-20T00:00:00.000Z',
      responseNote: 'Pallets relocated to designated storage racking. Floor markings repainted.',
      respondedAt: '2026-08-16T14:00:00.000Z',
      evidenceNote: 'Photos of cleared route and fresh floor markings taken.',
      verifiedBy: '',
      verifiedAt: null as string | null,
      createdAt: '2026-08-15T14:30:00.000Z',
      updatedAt: '2026-08-16T14:00:00.000Z',
      closedAt: null as string | null,
      activity: [
        { type: 'created', message: 'Corrective action created.', actor: 'K. Mensah', createdAt: '2026-08-15T14:30:00.000Z' },
        { type: 'status_change', message: 'Status changed from Assigned to In Progress.', actor: 'L. Chen', createdAt: '2026-08-15T16:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from In Progress to Awaiting Verification.', actor: 'L. Chen', createdAt: '2026-08-16T14:00:00.000Z' },
      ],
      comments: [],
    },
    {
      referenceNumber: 'CA-0503',
      title: 'Label all chemical containers in chemical store',
      description: 'Apply correct hazard labels to all unlabeled or illegibly labeled containers in the chemical store.',
      workplace: 'Distribution Center',
      department: 'Chemical Store',
      location: 'Chemical store, shelving row 2',
      priority: 'High',
      status: 'Assigned',
      sourceType: 'Finding',
      findingRef: 'FND-0225',
      createdBy: 'L. Chen',
      assignedTo: 'R. Ibrahim',
      dueDate: '2026-08-22T00:00:00.000Z',
      responseNote: '',
      respondedAt: null as string | null,
      evidenceNote: '',
      verifiedBy: '',
      verifiedAt: null as string | null,
      createdAt: '2026-08-14T12:00:00.000Z',
      updatedAt: '2026-08-14T12:00:00.000Z',
      closedAt: null as string | null,
      activity: [{ type: 'created', message: 'Corrective action created.', actor: 'L. Chen', createdAt: '2026-08-14T12:00:00.000Z' }],
      comments: [],
    },
    {
      referenceNumber: 'CA-0499',
      title: 'Replace frayed lifting sling on overhead crane',
      description: 'Take the damaged sling out of service and replace with a certified lifting sling rated for the required load.',
      workplace: 'Main Plant',
      department: 'Fabrication Bay',
      location: 'Overhead crane, bay 2',
      priority: 'Critical',
      status: 'Verified',
      sourceType: 'Finding',
      findingRef: 'FND-0221',
      createdBy: 'D. Brooks',
      assignedTo: 'D. Brooks',
      dueDate: '2026-08-15T00:00:00.000Z',
      responseNote: 'Old sling removed from service and destroyed. New certified sling installed and load-tested.',
      respondedAt: '2026-08-14T10:00:00.000Z',
      evidenceNote: 'Certification tag photo and load test record attached.',
      verifiedBy: 'K. Mensah',
      verifiedAt: '2026-08-14T15:30:00.000Z',
      createdAt: '2026-08-13T09:00:00.000Z',
      updatedAt: '2026-08-14T15:30:00.000Z',
      closedAt: null as string | null,
      activity: [
        { type: 'created', message: 'Corrective action created.', actor: 'D. Brooks', createdAt: '2026-08-13T09:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Assigned to In Progress.', actor: 'D. Brooks', createdAt: '2026-08-13T13:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from In Progress to Awaiting Verification.', actor: 'D. Brooks', createdAt: '2026-08-14T10:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Awaiting Verification to Verified.', actor: 'K. Mensah', createdAt: '2026-08-14T15:30:00.000Z' },
      ],
      comments: [{ author: 'K. Mensah', message: 'Verified load test record and certification. Approved.', createdAt: '2026-08-14T15:30:00.000Z' }],
    },
    {
      referenceNumber: 'CA-0487',
      title: 'Repair damaged loading dock leveler',
      description: 'The hydraulic dock leveler at bay 1 was sticking and posed a trip/crush hazard. Repaired and load-tested.',
      workplace: 'Main Plant',
      department: 'Loading Dock',
      location: 'Bay 1 dock leveler',
      priority: 'Medium',
      status: 'Closed',
      sourceType: 'Manual Entry',
      findingRef: null as string | null,
      createdBy: 'K. Mensah',
      assignedTo: 'R. Ibrahim',
      dueDate: '2026-07-25T00:00:00.000Z',
      responseNote: 'Hydraulic cylinder reseated and leveler serviced by contractor.',
      respondedAt: '2026-07-20T10:00:00.000Z',
      evidenceNote: 'Service report attached.',
      verifiedBy: 'K. Mensah',
      verifiedAt: '2026-07-21T09:00:00.000Z',
      createdAt: '2026-07-16T08:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
      closedAt: '2026-07-22T10:00:00.000Z',
      activity: [
        { type: 'created', message: 'Corrective action created.', actor: 'K. Mensah', createdAt: '2026-07-16T08:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Assigned to Closed.', actor: 'K. Mensah', createdAt: '2026-07-22T10:00:00.000Z' },
      ],
      comments: [],
    },
  ];

  for (const a of actions) {
    const { activity, comments, findingRef, respondedAt, verifiedAt, closedAt, ...fields } = a;
    await prisma.correctiveAction.create({
      data: {
        ...fields,
        findingId: findingRef ? findingByRef.get(findingRef) ?? null : null,
        findingReferenceNumber: findingRef,
        hazardId: null,
        hazardReferenceNumber: null,
        inspectionId: null,
        inspectionReferenceNumber: null,
        externalSourceReference: null,
        dueDate: new Date(fields.dueDate),
        respondedAt: respondedAt ? new Date(respondedAt) : null,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
        closedAt: closedAt ? new Date(closedAt) : null,
        createdAt: new Date(fields.createdAt),
        updatedAt: new Date(fields.updatedAt),
        activity: { create: activity.map((act) => ({ ...act, createdAt: new Date(act.createdAt) })) },
        comments: { create: comments.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })) },
      },
    });
  }
  await prisma.counter.create({ data: { name: 'correctiveAction', value: 511 } });
  console.log(`Seeded ${actions.length} corrective actions.`);
}

async function seedInspectionTemplate() {
  const template = await prisma.inspectionTemplate.create({
    data: {
      name: 'General Workplace Safety Inspection',
      code: 'GWS-01',
      description: 'A broad, industry-neutral inspection covering the fundamentals every workplace should have in place, regardless of sector.',
      category: 'General Workplace Safety',
      applicableIndustries: ['Office', 'Retail', 'Warehouse', 'SME', 'NGO', 'Government', 'Hospitality', 'School'],
      version: 1,
      status: 'Active',
      sections: {
        create: [
          {
            title: 'General Conditions',
            description: 'Overall condition and organisation of the workplace.',
            order: 0,
            questions: {
              create: [
                { text: 'Is the workplace generally clean, tidy, and well organised?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 0 },
                { text: 'Are floors, walls, and ceilings in good condition and free of damage?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 1 },
                { text: 'Is lighting adequate throughout the workplace?', guidance: 'Check for flickering, dim, or unlit areas, including stairwells.', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 2 },
              ],
            },
          },
          {
            title: 'Fire and Emergency Preparedness',
            description: 'Readiness to detect, respond to, and evacuate during a fire or other emergency.',
            order: 1,
            questions: {
              create: [
                { text: 'Are fire extinguishers present, accessible, and in date?', guidance: '', referenceNote: 'Confirm annual service tag is current.', responseType: 'compliance', options: [], required: true, evidenceRequired: true, allowFindingCreation: true, order: 0 },
                { text: 'Are emergency exits clearly marked and unobstructed?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 1 },
                { text: 'Is there a current, visibly posted evacuation plan?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 2 },
              ],
            },
          },
          {
            title: 'Electrical Safety',
            description: 'General condition of electrical installations and equipment.',
            order: 2,
            questions: {
              create: [
                { text: 'Are electrical panels accessible and free of obstruction?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 0 },
                { text: 'Are cables, plugs, and sockets free of visible damage?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: true, allowFindingCreation: true, order: 1 },
              ],
            },
          },
          {
            title: 'First Aid',
            description: 'Availability of first aid provisions and trained personnel.',
            order: 3,
            questions: {
              create: [
                { text: 'Is a first aid kit available, accessible, and adequately stocked?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: true, allowFindingCreation: true, order: 0 },
                { text: 'Is at least one trained first aider available during working hours?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 1 },
              ],
            },
          },
          {
            title: 'PPE',
            description: 'Availability, condition, and use of personal protective equipment where required.',
            order: 4,
            questions: {
              create: [
                { text: 'Is appropriate PPE available for tasks that require it?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: false, allowFindingCreation: true, order: 0 },
                { text: 'Is PPE being worn correctly where required?', guidance: '', referenceNote: '', responseType: 'compliance', options: [], required: true, evidenceRequired: true, allowFindingCreation: true, order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded 1 inspection template (${template.code}). Create more from the app's Template Builder.`);
}

async function seedRiskAssessments() {
  const assessments = [
    {
      title: 'Press #3 Guarding and Pinch-Point Risk Assessment',
      assessmentType: 'Post-Incident',
      description: 'Follow-up assessment after a missing in-feed guard was found on Press #3, covering pinch-point and entanglement risks on the production line.',
      workplace: 'Main Plant',
      department: 'Production Floor',
      location: 'Press #3, in-feed roller, Line 2',
      status: 'Approved',
      assessedBy: 'D. Brooks',
      approvedBy: 'K. Mensah',
      assessmentDate: '2026-08-16',
      nextReviewDate: '2027-02-16',
      items: [
        {
          hazard: 'Entanglement/crushing at the in-feed roller pinch point if the fixed guard is missing or defeated.',
          whoMightBeHarmed: 'Press operators and adjacent line workers (approx. 4 people per shift).',
          existingControls: 'Fixed guard normally in place; lockout/tagout procedure for maintenance.',
          likelihood: 3,
          severity: 5,
          additionalControls: 'Interlock switch added so the press cannot cycle with the guard removed; daily pre-shift guard check added to the checklist.',
          residualLikelihood: 1,
          residualSeverity: 5,
        },
        {
          hazard: 'Noise exposure from press operation over a full shift.',
          whoMightBeHarmed: 'Press operators.',
          existingControls: 'Hearing protection available at the PPE station.',
          likelihood: 3,
          severity: 2,
          additionalControls: 'Mandatory hearing protection signage at the press; annual hearing checks for operators.',
          residualLikelihood: 2,
          residualSeverity: 2,
        },
      ],
      activity: [
        { type: 'created', message: 'Risk assessment created following hazard report HZ-1041.', actor: 'D. Brooks', createdAt: '2026-08-16T09:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Draft to Under Review.', actor: 'D. Brooks', createdAt: '2026-08-16T09:30:00.000Z' },
        { type: 'status_change', message: 'Status changed from Under Review to Approved.', actor: 'K. Mensah', createdAt: '2026-08-16T14:10:00.000Z' },
      ],
    },
    {
      title: 'Warehouse B Manual Handling and Forklift Interaction',
      assessmentType: 'Routine',
      description: 'Annual review of manual handling and pedestrian/forklift interaction risks in Warehouse B.',
      workplace: 'Main Plant',
      department: 'Warehouse B',
      location: 'Racking aisles and forklift lanes, Warehouse B',
      status: 'Under Review',
      assessedBy: 'L. Chen',
      approvedBy: '',
      assessmentDate: '2026-08-10',
      nextReviewDate: '2027-08-10',
      items: [
        {
          hazard: 'Pedestrian struck by forklift at aisle crossing points.',
          whoMightBeHarmed: 'Warehouse staff walking between racking aisles.',
          existingControls: 'Painted pedestrian walkways; forklift operators certified.',
          likelihood: 3,
          severity: 4,
          additionalControls: 'Convex mirrors at blind crossings; audible reverse alarm check added to forklift pre-use inspection.',
          residualLikelihood: 2,
          residualSeverity: 4,
        },
        {
          hazard: 'Manual handling strain from lifting boxes onto upper racking without aids.',
          whoMightBeHarmed: 'Warehouse pickers and stockers.',
          existingControls: 'Manual handling training on induction.',
          likelihood: 3,
          severity: 3,
          additionalControls: 'Step stools and pallet lifters provided at each aisle; refresher manual handling training scheduled.',
          residualLikelihood: 2,
          residualSeverity: 2,
        },
      ],
      activity: [
        { type: 'created', message: 'Risk assessment created as part of the annual review cycle.', actor: 'L. Chen', createdAt: '2026-08-10T10:00:00.000Z' },
        { type: 'status_change', message: 'Status changed from Draft to Under Review.', actor: 'L. Chen', createdAt: '2026-08-10T10:20:00.000Z' },
      ],
    },
    {
      title: 'Head Office Fire Evacuation Risk Assessment',
      assessmentType: 'Legal / Statutory',
      description: 'Baseline fire risk assessment for Head Office, covering means of escape and evacuation arrangements for office staff.',
      workplace: 'Head Office',
      department: 'Administration',
      location: 'All floors, Head Office',
      status: 'Draft',
      assessedBy: 'J. Alonso',
      approvedBy: '',
      assessmentDate: '2026-08-19',
      nextReviewDate: '2027-08-19',
      items: [
        {
          hazard: 'Delayed evacuation due to unfamiliarity with escape routes among office staff.',
          whoMightBeHarmed: 'All Head Office staff and visitors.',
          existingControls: 'Fire exit signage and posted evacuation plan.',
          likelihood: 2,
          severity: 4,
          additionalControls: 'Biannual fire drill and fire warden refresher training.',
          residualLikelihood: 1,
          residualSeverity: 4,
        },
      ],
      activity: [{ type: 'created', message: 'Risk assessment drafted.', actor: 'J. Alonso', createdAt: '2026-08-19T11:00:00.000Z' }],
    },
  ];

  function score(l: number, s: number) {
    return l * s;
  }
  function level(sc: number) {
    if (sc >= 16) return 'Critical';
    if (sc >= 10) return 'High';
    if (sc >= 5) return 'Medium';
    return 'Low';
  }

  let refCounter = 0;
  for (const ra of assessments) {
    refCounter += 1;
    const { items, activity, ...fields } = ra;
    await prisma.riskAssessment.create({
      data: {
        ...fields,
        referenceNumber: `RA-${String(refCounter).padStart(4, '0')}`,
        assessmentDate: new Date(fields.assessmentDate),
        nextReviewDate: new Date(fields.nextReviewDate),
        createdAt: new Date(activity[0]!.createdAt),
        updatedAt: new Date(activity[activity.length - 1]!.createdAt),
        items: {
          create: items.map((item, index) => {
            const riskScore = score(item.likelihood, item.severity);
            const hasResidual = item.residualLikelihood !== undefined && item.residualSeverity !== undefined;
            const residualRiskScore = hasResidual ? score(item.residualLikelihood, item.residualSeverity) : null;
            return {
              ...item,
              riskScore,
              riskLevel: level(riskScore),
              residualRiskScore,
              residualRiskLevel: residualRiskScore !== null ? level(residualRiskScore) : null,
              order: index,
            };
          }),
        },
        activity: { create: activity.map((a) => ({ ...a, createdAt: new Date(a.createdAt) })) },
      },
    });
  }
  await prisma.counter.create({ data: { name: 'riskAssessment', value: refCounter } });
  console.log(`Seeded ${assessments.length} risk assessments.`);
}

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already has users — skipping seed (safe to run again once it is empty).');
    return;
  }

  await seedUsers();
  await seedWorkplaces();
  await seedHazards();
  await seedFindings();
  await seedCorrectiveActions();
  await seedInspectionTemplate();
  await seedRiskAssessments();
  // Inspections and notifications start empty by design — inspections need an
  // active template selected by a real user, and notifications are generated
  // by the app's own actions (e.g. assigning a corrective action).

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
