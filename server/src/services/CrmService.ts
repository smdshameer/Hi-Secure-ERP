import { CrmRepository } from '../repositories/CrmRepository';

export class CrmService {
  private crmRepo = new CrmRepository();

  async getContacts(query: any) {
    const where: any = {};
    if (query.status) where.status = String(query.status);
    if (query.source) where.source = String(query.source);
    return this.crmRepo.findMany(where);
  }

  async createContact(data: any) {
    return this.crmRepo.create({
      customer_id: data.customer_id ? Number(data.customer_id) : null,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      company: data.company || null,
      source: data.source || null,
      status: data.status || 'new',
      notes: data.notes || null,
      assigned_to: data.assigned_to || null
    });
  }

  async updateContactStatus(id: number, status: string) {
    return this.crmRepo.update(id, { status });
  }

  async updateContact(id: number, data: any) {
    // Exclude read-only fields
    const { contact_id, created_at, updated_at, ...updateData } = data;
    if (updateData.customer_id !== undefined) {
      updateData.customer_id = updateData.customer_id ? Number(updateData.customer_id) : null;
    }
    return this.crmRepo.update(id, updateData);
  }

  async deleteContact(id: number) {
    return this.crmRepo.delete(id);
  }
}
