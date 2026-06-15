import bcrypt from 'bcrypt';
import { prisma } from '../index';
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  private userRepo = new UserRepository();

  async getUsers() {
    return this.userRepo.findMany({ is_active: true });
  }

  async getUserById(id: number) {
    return this.userRepo.findById(id);
  }

  async createUser(data: any) {
    const { username, email, password, full_name, role, phone } = data;
    const password_hash = await bcrypt.hash(password, 12);

    return prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { username, email, password_hash, full_name, role, phone }
      });

      const roleName = (role || 'sales').toLowerCase();
      const roleRecord = await tx.role.findUnique({ where: { name: roleName } });
      if (roleRecord) {
        await tx.userRole.create({
          data: { user_id: newUser.user_id, role_id: roleRecord.role_id }
        });
      }
      return newUser;
    });
  }

  async updateUser(id: number, data: any) {
    const updateData: any = {
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      is_active: data.is_active
    };
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 12);
    }

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { user_id: id },
        data: updateData
      });

      if (data.role) {
        const roleName = data.role.toLowerCase();
        const roleRecord = await tx.role.findUnique({ where: { name: roleName } });
        if (roleRecord) {
          // Clear old user roles
          await tx.userRole.deleteMany({ where: { user_id: id } });
          // Link new role
          await tx.userRole.create({
            data: { user_id: id, role_id: roleRecord.role_id }
          });
        }
      }
      return updatedUser;
    });
  }

  async deleteUser(id: number) {
    return prisma.$transaction(async (tx) => {
      return tx.user.update({
        where: { user_id: id },
        data: { is_active: false }
      });
    });
  }

  async getUserByUsername(username: string) {
    return this.userRepo.findByUsername(username);
  }

  async updateLastLogin(userId: number) {
    return this.userRepo.update(userId, { last_login: new Date() });
  }

  async checkUserExists(username: string, email: string) {
    return this.userRepo.findFirst({
      OR: [
        { username },
        { email }
      ]
    });
  }
}
