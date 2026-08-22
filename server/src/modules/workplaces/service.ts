import { prisma } from '../../lib/prisma';
import type { Area as PrismaArea, Location as PrismaLocation, Workplace as PrismaWorkplace } from '@prisma/client';
import type {
  Area,
  AreaInput,
  CreateWorkplaceInput,
  Location,
  UpdateWorkplaceInput,
  Workplace,
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

export async function listWorkplaces(): Promise<Workplace[]> {
  const rows = await prisma.workplace.findMany({
    orderBy: { name: 'asc' },
    include: { areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } } },
  });
  return rows.map(fromRow);
}

export async function getWorkplace(id: string): Promise<Workplace | undefined> {
  const row = await prisma.workplace.findUnique({
    where: { id },
    include: { areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } } },
  });
  return row ? fromRow(row) : undefined;
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

export async function createWorkplace(input: CreateWorkplaceInput): Promise<Workplace> {
  const row = await prisma.workplace.create({
    data: {
      organisation: input.organisation,
      name: input.name,
      code: input.code,
      industry: input.industry,
      address: input.address,
      status: 'Active',
      areas: { create: areaCreateData(input.areas) },
    },
    include: { areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } } },
  });
  return fromRow(row);
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

export async function updateWorkplace(id: string, input: UpdateWorkplaceInput): Promise<Workplace | undefined> {
  const existing = await prisma.workplace.findUnique({ where: { id } });
  if (!existing) return undefined;

  if (input.areas) {
    await replaceAreas(id, input.areas);
  }

  const row = await prisma.workplace.update({
    where: { id },
    data: {
      organisation: input.organisation ?? existing.organisation,
      name: input.name ?? existing.name,
      code: input.code ?? existing.code,
      industry: input.industry ?? existing.industry,
      address: input.address ?? existing.address,
      status: input.status ?? existing.status,
    },
    include: { areas: { orderBy: { order: 'asc' }, include: { locations: { orderBy: { order: 'asc' } } } } },
  });
  return fromRow(row);
}
