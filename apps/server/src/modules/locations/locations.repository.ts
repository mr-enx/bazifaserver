import { asc, eq, sql } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import { cities, provinces } from '../../db/schema.js';

export class LocationsRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async listProvinces() {
    return this.db
      .select({
        id: provinces.id,
        name: provinces.name
      })
      .from(provinces)
      .orderBy(asc(provinces.name));
  }

  async listCities(provinceId: number) {
    return this.db
      .select({
        id: cities.id,
        provinceId: cities.provinceId,
        name: cities.name
      })
      .from(cities)
      .where(eq(cities.provinceId, provinceId))
      .orderBy(asc(cities.name));
  }

  async createCity(input: { provinceId: number; name: string }) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select({ maxId: sql<number | null>`max(${cities.id})` }).from(cities).limit(1);
      const nextId = (row?.maxId ?? 0) + 1;

      const [createdCity] = await tx
        .insert(cities)
        .values({
          id: nextId,
          provinceId: input.provinceId,
          name: input.name
        })
        .returning({
          id: cities.id,
          provinceId: cities.provinceId,
          name: cities.name
        });

      if (!createdCity) {
        throw new Error('Failed to create city');
      }

      return createdCity;
    });
  }

  async updateCity(cityId: number, input: { provinceId?: number; name?: string }) {
    const [updatedCity] = await this.db
      .update(cities)
      .set({
        ...(input.provinceId !== undefined ? { provinceId: input.provinceId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {})
      })
      .where(eq(cities.id, cityId))
      .returning({
        id: cities.id,
        provinceId: cities.provinceId,
        name: cities.name
      });

    return updatedCity;
  }

  async deleteCity(cityId: number): Promise<boolean> {
    const deleted = await this.db.delete(cities).where(eq(cities.id, cityId)).returning({ id: cities.id });
    return deleted.length > 0;
  }
}
