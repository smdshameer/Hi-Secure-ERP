import { LocationRepository } from '../repositories/LocationRepository';

export class LocationService {
  private locationRepo = new LocationRepository();

  async getLocations() {
    return this.locationRepo.findMany();
  }

  async getLocationById(id: number) {
    return this.locationRepo.findById(id);
  }

  async createLocation(data: any) {
    return this.locationRepo.create({
      location_code: data.location_code || `LOC-${Date.now()}`,
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      gstin: data.gstin || null,
      is_main: data.is_main || false
    });
  }

  async updateLocation(id: number, data: any) {
    const { location_id, created_at, updated_at, ...updateData } = data;
    return this.locationRepo.update(id, updateData);
  }

  async deleteLocation(id: number) {
    return this.locationRepo.delete(id);
  }
}
