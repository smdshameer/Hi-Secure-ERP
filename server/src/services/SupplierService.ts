import { SupplierRepository } from '../repositories/SupplierRepository';

export class SupplierService {
  private supplierRepo = new SupplierRepository();

  async getSuppliers(query: any) {
    const { search } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { contact_person: { contains: String(search), mode: 'insensitive' } },
        { gstin: { contains: String(search), mode: 'insensitive' } },
        { supplier_code: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    return this.supplierRepo.findMany(where);
  }

  async getSupplierById(id: number) {
    return this.supplierRepo.findById(id);
  }

  async createSupplier(data: any) {
    return this.supplierRepo.create({
      supplier_code: data.supplier_code || `SUP-${Date.now()}`,
      name: data.name,
      contact_person: data.contact_person || null,
      phone: data.phone || null,
      email: data.email || null,
      gstin: data.gstin || null,
      pan: data.pan || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    });
  }

  async updateSupplier(id: number, data: any) {
    return this.supplierRepo.update(id, data);
  }

  async deleteSupplier(id: number) {
    return this.supplierRepo.delete(id);
  }
}