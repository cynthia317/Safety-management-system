import { prisma } from '../../lib/prisma';
import type {
  Area as PrismaArea,
  Location as PrismaLocation,
  Workplace as PrismaWorkplace,
  WorkplaceActivityEntry as PrismaWorkplaceActivityEntry,
} from '@prisma/client';
import type {
  Area,
  AreaInput,
  CreateWorkplaceInput,
  Location,
  UpdateWorkplaceInput,
  Workplace,
  WorkplaceActivityEntry,
  WorkplaceActivityType,
  WorkplaceDetail,
  WorkplaceStatus,
} from './types';

type WorkplaceRow = PrismaWorkplace & { areas: (PrismaArea & { locations: PrismaLocation[] })[] };

function fromRow(row: WorkplaceRow): Workplace {
  return {
    id: row.id,
    organisation: row.organisation,
    name: row.name,
    code: row.code,
    industry: row.industry,
    address: row.address,
    status: row.status as WorkplaceStatus,
    areas: row.areas.map(
      (area): Area => ({
        id: area.id,
        name: area.name,
        description: area.description,
        order: area.order,
        locations: area.locations.map(
          (loc): Location => ({ id: loc.id, name: loc.name, description: loc.description, order: loc.order }),
        ),
      }),
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function activityFromRow(row: PrismaWorkplaceActivityEntry): WorkplaceActivityEntry {
  return {
    id: row.id,
    workplaceId: row.workplaceId,
    type: row.type as WorkplaceActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listWorkplaces(): Promise<Workplace[]> {
  const rows = await prisma.workplace.findMany({
    orderBy: { name: 'asc' },
    include: { areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } } },
  });
  return rows.map(fromRow);
}

export async function getWorkplace(id: string): Promise<WorkplaceDetail | undefined> {
  const row = await prisma.workplace.findUnique({
    where: { id },
    include: {
      areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } },
      activity: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!row) return undefined;
  return { ...fromRow(row), activity: row.activity.map(activityFromRow) };
}

function areaCreateData(inputs: AreaInput[]) {
  return inputs.map((area, index) => ({
    name: area.name,
    description: area.description,
    order: area.order ?? index,
    locations: {
      create: area.locations.map((loc, locIndex) => ({
        name: loc.name,
        description: loc.description,
        order: loc.order ?? locIndex,
      })),
    },
  }));
}

export async function createWorkplace(input: CreateWorkplaceInput, actor: string): Promise<WorkplaceDetail> {
  const now = new Date();
  const row = await prisma.workplace.create({
    data: {
      organisation: input.organisation,
      name: input.name,
      code: input.code,
      industry: input.industry,
      address: input.address,
      status: 'Active',
      areas: { create: areaCreateData(input.areas) },
      activity: { create: { type: 'created', message: 'Workplace created.', actor, createdAt: now } },
    },
    include: {
      areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } },
      activity: { orderBy: { createdAt: 'asc' } },
    },
  });
  return { ...fromRow(row), activity: row.activity.map(activityFromRow) };
}

/** Replaces the whole area/location tree — simplest way to keep it in sync with a
 * builder UI that freely adds/removes/reorders both levels in one save. */
async function replaceAreas(workplaceId: string, areas: AreaInput[]): Promise<void> {
  await prisma.area.deleteMany({ where: { workplaceId } });
  for (const [index, area] of areas.entries()) {
    await prisma.area.create({
      data: {
        workplaceId,
        name: area.name,
        description: area.description,
        order: area.order ?? index,
        locations: {
          create: area.locations.map((loc, locIndex) => ({
            name: loc.name,
            description: loc.description,
            order: loc.order ?? locIndex,
          })),
        },
      },
    });
  }
}

export async function updateWorkplace(
  id: string,
  input: UpdateWorkplaceInput,
  actor: string,
): Promise<WorkplaceDetail | undefined> {
  const existing = await prisma.workplace.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  const nextStatus = input.status;

  if (input.areas) {
    await replaceAreas(id, input.areas);
  }

  await prisma.workplace.update({
    where: { id },
    data: {
      organisation: input.organisation ?? existing.organisation,
      name: input.name ?? existing.name,
      code: input.code ?? existing.code,
      industry: input.industry ?? existing.industry,
      address: input.address ?? existing.address,
      status: nextStatus ?? existing.status,
    },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.workplaceActivityEntry.create({
      data: {
        workplaceId: id,
        type: 'status_change',
        message: `Status changed from ${existing.status} to ${nextStatus}.`,
        actor,
        createdAt: now,
      },
    });
  }

  const changedFieldNames = (['organisation', 'name', 'code', 'industry', 'address', 'areas'] as const).filter(
    (key) => input[key] !== undefined,
  );
  if (changedFieldNames.length > 0) {
    await prisma.workplaceActivityEntry.create({
      data: {
        workplaceId: id,
        type: 'updated',
        message: `Workplace updated (${changedFieldNames.join(', ')}).`,
        actor,
        createdAt: now,
      },
    });
  }

  return getWorkplace(id);
}
