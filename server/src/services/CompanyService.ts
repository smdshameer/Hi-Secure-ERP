import { CompanyRepository } from '../repositories/CompanyRepository';

export class CompanyService {
  private companyRepo = new CompanyRepository();

  async getCompanies() {
    return this.companyRepo.findMany();
  }

  async createCompany(data: any) {
    return this.companyRepo.create({
      name: data.name,
      code: data.code || `CO-${Date.now()}`,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      gstin: data.gstin || null,
      pan: data.pan || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      ifsc_code: data.ifsc_code || null
    });
  }

  async updateCompany(id: number, data: any) {
    const { company_id, created_at, updated_at, ...updateData } = data;
    return this.companyRepo.update(id, updateData);
  }

  async deleteCompany(id: number) {
    return this.companyRepo.delete(id);
  }
}
