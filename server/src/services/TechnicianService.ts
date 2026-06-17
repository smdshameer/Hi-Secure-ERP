import { TechnicianRepository } from '../repositories/TechnicianRepository';

export class TechnicianService {
  private techRepo = new TechnicianRepository();

  async getTechnicians() {
    return this.techRepo.findMany({ is_active: true });
  }

  async createTechnician(data: any) {
    return this.techRepo.create({
      name: data.name,
      phone: data.phone || null,
      specialization: data.specialization || null
    });
  }

  async updateTechnician(id: number, data: any) {
    return this.techRepo.update(id, {
      name: data.name,
      phone: data.phone || null,
      specialization: data.specialization || null,
      is_active: data.is_active
    });
  }

  async deleteTechnician(id: number, userId?: number) {
    return this.techRepo.delete(id, userId);
  }
}
