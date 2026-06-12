import type { AuthUser, CityItem, ProvinceItem } from '@game-platform/shared';
import { LocationsRepository } from './locations.repository.js';

function ensureAdmin(user: AuthUser): void {
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
}

export class LocationsService {
  private readonly locationsRepository: LocationsRepository;

  constructor(locationsRepository = new LocationsRepository()) {
    this.locationsRepository = locationsRepository;
  }

  async listProvinces(): Promise<ProvinceItem[]> {
    return this.locationsRepository.listProvinces();
  }

  async listCities(provinceId: number): Promise<CityItem[]> {
    if (!Number.isInteger(provinceId) || provinceId <= 0) {
      return [];
    }

    return this.locationsRepository.listCities(provinceId);
  }

  async createCity(user: AuthUser, input: { provinceId: number; name: string }): Promise<CityItem> {
    ensureAdmin(user);

    const provinceId = Number(input.provinceId);
    const name = input.name.trim();

    if (!Number.isInteger(provinceId) || provinceId <= 0) {
      throw new Error('Invalid province');
    }

    if (name.length < 2 || name.length > 128) {
      throw new Error('City name is invalid');
    }

    return this.locationsRepository.createCity({ provinceId, name });
  }

  async updateCity(
    user: AuthUser,
    cityId: number,
    input: { provinceId?: number; name?: string }
  ): Promise<CityItem> {
    ensureAdmin(user);

    if (!Number.isInteger(cityId) || cityId <= 0) {
      throw new Error('Invalid city');
    }

    const nextProvinceId = input.provinceId === undefined ? undefined : Number(input.provinceId);
    const nextName = input.name === undefined ? undefined : input.name.trim();

    if (nextProvinceId !== undefined && (!Number.isInteger(nextProvinceId) || nextProvinceId <= 0)) {
      throw new Error('Invalid province');
    }

    if (nextName !== undefined && (nextName.length < 2 || nextName.length > 128)) {
      throw new Error('City name is invalid');
    }

    const updated = await this.locationsRepository.updateCity(cityId, {
      provinceId: nextProvinceId,
      name: nextName
    });

    if (!updated) {
      throw new Error('City not found');
    }

    return updated;
  }

  async deleteCity(user: AuthUser, cityId: number): Promise<void> {
    ensureAdmin(user);

    if (!Number.isInteger(cityId) || cityId <= 0) {
      throw new Error('Invalid city');
    }

    const deleted = await this.locationsRepository.deleteCity(cityId);
    if (!deleted) {
      throw new Error('City not found');
    }
  }
}
