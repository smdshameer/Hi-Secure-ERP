import { CustomerRepository } from '../repositories/CustomerRepository';

export class CustomerService {
  private customerRepo = new CustomerRepository();

  async getCustomers(query: any) {
    const { search, limit } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
        { gstin: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    const take = limit ? Number(limit) : 100;
    return this.customerRepo.findMany(where, take);
  }

  async getCustomerById(id: number) {
    return this.customerRepo.findById(id);
  }

  async createCustomer(data: any) {
    if (!data.name || !data.phone) {
      throw new Error('Name and phone are required fields');
    }
    return this.customerRepo.create({
      customer_code: data.customer_code || `CUST-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      contact_person: data.contact_person || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      gstin: data.gstin || null,
      customer_type: data.customer_type || 'retail',
      credit_limit: Number(data.credit_limit || 0),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    });
  }

  async updateCustomer(id: number, data: any) {
    return this.customerRepo.update(id, data);
  }

  async deleteCustomer(id: number, userId?: number) {
    return this.customerRepo.delete(id, userId);
  }

  async getCustomerDetailById(id: number) {
    return this.customerRepo.findDetailById(id);
  }

  async getCustomerByGstin(gstin: string) {
    return this.customerRepo.findByGstin(gstin);
  }
}