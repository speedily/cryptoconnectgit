import { GroupMember, Group } from '@xmtp/node-sdk';
import { config } from '../config/config';

export type Role = 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';

export interface MemberPermission {
  canInvite: boolean;
  canRemove: boolean;
  canEditGroup: boolean;
  canPinMessages: boolean;
  canMuteMembers: boolean;
  canBanMembers: boolean;
  canPostMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
}

export interface MemberRole {
  name: Role;
  permissions: MemberPermission;
  priority: number; // Higher number = higher permissions
}

// Define default roles and their permissions
const DEFAULT_ROLES: Record<Role, MemberRole> = {
  owner: {
    name: 'owner',
    priority: 100,
    permissions: {
      canInvite: true,
      canRemove: true,
      canEditGroup: true,
      canPinMessages: true,
      canMuteMembers: true,
      canBanMembers: true,
      canPostMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
    },
  },
  admin: {
    name: 'admin',
    priority: 80,
    permissions: {
      canInvite: true,
      canRemove: true,
      canEditGroup: true,
      canPinMessages: true,
      canMuteMembers: true,
      canBanMembers: false,
      canPostMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
    },
  },
  moderator: {
    name: 'moderator',
    priority: 60,
    permissions: {
      canInvite: false,
      canRemove: false,
      canEditGroup: false,
      canPinMessages: true,
      canMuteMembers: true,
      canBanMembers: false,
      canPostMessages: true,
      canEditMessages: false,
      canDeleteMessages: true,
    },
  },
  member: {
    name: 'member',
    priority: 40,
    permissions: {
      canInvite: false,
      canRemove: false,
      canEditGroup: false,
      canPinMessages: false,
      canMuteMembers: false,
      canBanMembers: false,
      canPostMessages: true,
      canEditMessages: false,
      canDeleteMessages: false,
    },
  },
  viewer: {
    name: 'viewer',
    priority: 20,
    permissions: {
      canInvite: false,
      canRemove: false,
      canEditGroup: false,
      canPinMessages: false,
      canMuteMembers: false,
      canBanMembers: false,
      canPostMessages: false,
      canEditMessages: false,
      canDeleteMessages: false,
    },
  },
};

export class MemberRoleManager {
  private static instance: MemberRoleManager;
  private roles: Record<Role, MemberRole>;
  private customRoles: Map<string, MemberRole>;

  private constructor() {
    this.roles = { ...DEFAULT_ROLES };
    this.customRoles = new Map();
  }

  public static getInstance(): MemberRoleManager {
    if (!MemberRoleManager.instance) {
      MemberRoleManager.instance = new MemberRoleManager();
    }
    return MemberRoleManager.instance;
  }

  public getRole(roleName: string): MemberRole | undefined {
    // Check default roles first
    if (roleName in this.roles) {
      return this.roles[roleName as Role];
    }
    // Then check custom roles
    return this.customRoles.get(roleName);
  }

  public getDefaultRole(roleName: Role): MemberRole | undefined {
    return this.roles[roleName];
  }

  public createCustomRole(
    name: string,
    baseRole: Role,
    permissions: Partial<MemberPermission>,
    priority?: number
  ): MemberRole {
    if (this.getRole(name)) {
      throw new Error(`Role '${name}' already exists`);
    }

    const base = this.getDefaultRole(baseRole);
    if (!base) {
      throw new Error(`Base role '${baseRole}' not found`);
    }

    const newRole: MemberRole = {
      name: name as Role,
      priority: priority ?? base.priority,
      permissions: {
        ...base.permissions,
        ...permissions,
      },
    };

    this.customRoles.set(name, newRole);
    return newRole;
  }

  public updateRole(
    roleName: string,
    updates: Partial<Omit<MemberRole, 'name'>>
  ): MemberRole | undefined {
    const role = this.getRole(roleName);
    if (!role) return undefined;

    const updatedRole = {
      ...role,
      ...updates,
      permissions: {
        ...role.permissions,
        ...(updates.permissions || {}),
      },
    };

    if (roleName in this.roles) {
      this.roles[roleName as Role] = updatedRole as MemberRole;
    } else {
      this.customRoles.set(roleName, updatedRole as MemberRole);
    }

    return updatedRole;
  }

  public deleteRole(roleName: string): boolean {
    if (roleName in this.roles) {
      throw new Error(`Cannot delete default role: ${roleName}`);
    }
    return this.customRoles.delete(roleName);
  }

  public hasPermission(roleName: string, permission: keyof MemberPermission): boolean {
    const role = this.getRole(roleName);
    if (!role) return false;
    return role.permissions[permission] === true;
  }

  public canPerformAction(
    memberRole: string,
    action: keyof MemberPermission,
    targetRole?: string
  ): boolean {
    const role = this.getRole(memberRole);
    if (!role) return false;

    // Check if the role has the specific permission
    if (!role.permissions[action]) return false;

    // If there's a target role, check role hierarchy
    if (targetRole) {
      const target = this.getRole(targetRole);
      if (!target) return true; // If target role doesn't exist, allow
      
      // Only allow if member's role has higher priority than target's role
      return role.priority > target.priority;
    }

    return true;
  }

  public listRoles(): MemberRole[] {
    return [
      ...Object.values(this.roles),
      ...Array.from(this.customRoles.values()),
    ].sort((a, b) => b.priority - a.priority);
  }

  public async getMemberRole(
    group: Group,
    member: GroupMember
  ): Promise<string> {
    try {
      // In a real implementation, this would fetch the role from the group's metadata
      // For now, we'll return a default role based on the member's status
      const isAdmin = await this.isGroupAdmin(group, member);
      return isAdmin ? 'admin' : 'member';
    } catch (error) {
      console.error('Error getting member role:', error);
      return 'viewer';
    }
  }

  public async setMemberRole(
    group: Group,
    member: GroupMember,
    role: string,
    actorRole: string
  ): Promise<boolean> {
    // Check if actor has permission to change roles
    if (!this.canPerformAction(actorRole, 'canEditGroup')) {
      throw new Error('Insufficient permissions to change roles');
    }

    // Check if the target role exists
    if (!this.getRole(role)) {
      throw new Error(`Role '${role}' does not exist`);
    }

    // In a real implementation, this would update the role in the group's metadata
    // For now, we'll just return true to indicate success
    return true;
  }

  private async isGroupAdmin(group: Group, member: GroupMember): Promise<boolean> {
    try {
      // In a real implementation, this would check if the member is an admin in the group
      // For now, we'll return true for the first member as a placeholder
      const members = await group.members();
      return members[0]?.inboxId === member.inboxId;
    } catch (error) {
      console.error('Error checking if member is admin:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const memberRoleManager = MemberRoleManager.getInstance();
