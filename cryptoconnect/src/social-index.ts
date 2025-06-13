import { Client, type Group, type GroupMember as XmtpGroupMember, type PermissionLevel, type Group as XmtpGroupType } from "@xmtp/node-sdk";
import { memberRoleManager, type Role, type MemberRoleManager } from "./social/memberRoles";
import type { MemberRole } from "./social/memberRoles";

// Export Role type
export type { Role };

// Type mapping between XMTP's types and our application types
type XmtpConsentStateString = 'allowed' | 'denied' | 'unknown';

/**
 * Extended XMTP Group with our custom properties
 * This interface extends the base XMTP Group type with additional functionality
 */
export interface XmtpGroup extends Omit<Group<unknown>, 'admins' | 'isAdmin' | 'createdAt' | 'updatedAt' | 'send'> {
  // Core XMTP Group properties
  topic: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Custom properties
  name: string;
  description: string;
  
  // Group management methods
  members: () => Promise<XmtpGroupMember[]>;
  addMembers: (addresses: string[]) => Promise<void>;
  removeMembers: (addresses: string[]) => Promise<void>;
  isAdmin: (address: string) => Promise<boolean>;
  admins: () => Promise<Array<{ accountAddress: string }>>;
  streamMessages: () => AsyncGenerator<any>;
  send: (message: string) => Promise<void>;
  
  // Additional metadata
  settings?: {
    enableTrading?: boolean;
    enableAnalytics?: boolean;
    enableCompetitions?: boolean;
    [key: string]: any;
  };
}

// Type guard to check if an object is an XmtpGroup
function isXmtpGroup(group: any): group is XmtpGroup {
  return (
    group && 
    typeof group === 'object' &&
    'topic' in group &&
    typeof group.topic === 'string' &&
    'members' in group &&
    typeof group.members === 'function' &&
    'addMembers' in group &&
    typeof group.addMembers === 'function' &&
    'removeMembers' in group &&
    typeof group.removeMembers === 'function' &&
    'isAdmin' in group &&
    typeof group.isAdmin === 'function' &&
    'admins' in group &&
    typeof group.admins === 'function'
  );
}

// Helper to convert XMTP consent state to string
const mapConsentState = (state: any): XmtpConsentStateString => {
  if (!state) return 'unknown';
  const stateStr = String(state).toLowerCase();
  if (stateStr.includes('allowed')) return 'allowed';
  if (stateStr.includes('denied')) return 'denied';
  return 'unknown';
};

// Helper to convert XMTP group member to our format
const toGroupMember = (member: XmtpGroupMember, role: Role): GroupMember => {
  // Handle both XMTP v1 and v2 member formats
  const accountAddress = (member as any).accountAddress || 
                        (member as any).inboxId || 
                        (member as any).address || 
                        '';
  
  return {
    accountAddress,
    role,
    joinedAt: new Date(),
    lastActive: new Date(),
    isMuted: false,
    isBanned: false,
    installationIds: (member as any).installationIds || [],
    permissionLevel: (member as any).permissionLevel || 0,
    consentState: mapConsentState((member as any).consentState),
  };
};

/**
 * Extended group member with role information
 */
export interface GroupMember {
  accountAddress: string;
  role: Role;
  joinedAt: Date;
  lastActive?: Date;
  isMuted: boolean;
  isBanned: boolean;
  installationIds: string[];
  permissionLevel: PermissionLevel;
  consentState: XmtpConsentStateString;
  isAdmin?: boolean;
  // Add any additional properties that might be needed
  address?: string;
  inboxId?: string;
}

/**
 * Group permissions configuration
 */
export interface GroupPermissions {
  allowMemberInvites: boolean;
  allowMessageEdits: boolean;
  allowMessageDeletion: boolean;
  allowMemberPromotion: boolean;
  allowMemberRemoval: boolean;
  allowMemberMuting: boolean;
  allowMemberBanning: boolean;
}

/**
 * Group data structure
 */
export interface GroupData {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  defaultRole: Role;
  permissions: GroupPermissions;
  settings: {
    enableTrading: boolean;
    enableAnalytics: boolean;
    enableCompetitions: boolean;
  };
}

/**
 * Options for creating a new group
 */
export interface CreateGroupOptions {
  isPublic?: boolean;
  defaultRole?: Role;
  permissions?: Partial<GroupPermissions>;
  settings?: Partial<GroupData['settings']>;
}

// Rename the interface to ISocialManager
export interface ISocialManager {
  client: Client;
  getGroupData(group: Group<unknown>): Promise<GroupData>;
  createGroup(name: string, description: string, members: string[], options?: CreateGroupOptions): Promise<Group<unknown>>;
  getGroup(groupId: string): Promise<Group<unknown> | null>;
  addMembers(group: Group<unknown>, members: string[]): Promise<void>;
  removeMembers(group: Group<unknown>, members: string[]): Promise<void>;
  addGroupMember(group: Group<unknown>, member: string): Promise<void>;
  removeGroupMember(group: Group<unknown>, member: string): Promise<void>;
  updateMemberRole(groupId: string, member: string, role: Role): Promise<void>;
  isGroupAdmin(group: Group<unknown>, member: string): Promise<boolean>;
  broadcastMessage(group: Group<unknown>, message: string): Promise<void>;
  sendGroupMessage(group: Group<unknown>, message: string): Promise<void>;
}

// Add the isGroup type guard
function isGroup<T>(conversation: any): conversation is Group<T> {
  return 'isGroup' in conversation && conversation.isGroup === true;
}

// Update the class to implement ISocialManager with public client
export class SocialManager implements ISocialManager {
  private static instance: SocialManager;
  public client: Client; // Changed from private to public
  private groupCache: Map<string, GroupData> = new Map();
  private roleManager: MemberRoleManager;

  constructor(client: Client, roleManager: MemberRoleManager = memberRoleManager) {
    this.client = client;
    this.roleManager = roleManager;
  }

  public static getInstance(client: Client): SocialManager {
    if (!SocialManager.instance) {
      SocialManager.instance = new SocialManager(client);
    }
    return SocialManager.instance;
  }

  async getGroupData(group: Group<unknown>): Promise<GroupData> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      const groupId = xmtpGroup.topic;
      if (this.groupCache.has(groupId)) {
        return this.groupCache.get(groupId)!;
      }
      const members = await xmtpGroup.members();
      const memberData = await Promise.all(
        members.map(async (member) => {
          const isAdmin = await xmtpGroup.isAdmin((member as any).accountAddress || (member as any).address);
          return toGroupMember(member, isAdmin ? 'admin' : 'member');
        })
      );
      const groupData: GroupData = {
        id: groupId,
        name: xmtpGroup.name,
        description: xmtpGroup.description,
        members: memberData,
        createdAt: xmtpGroup.createdAt || new Date(),
        updatedAt: xmtpGroup.updatedAt || new Date(),
        isPublic: (xmtpGroup as any).isPublic || false,
        defaultRole: (xmtpGroup as any).defaultRole || 'member',
        permissions: (xmtpGroup as any).permissions || {
          allowMemberInvites: true,
          allowMessageEdits: true,
          allowMessageDeletion: true,
          allowMemberPromotion: true,
          allowMemberRemoval: true,
          allowMemberMuting: true,
          allowMemberBanning: true,
        },
        settings: {
          enableTrading: xmtpGroup.settings?.enableTrading ?? true,
          enableAnalytics: xmtpGroup.settings?.enableAnalytics ?? true,
          enableCompetitions: xmtpGroup.settings?.enableCompetitions ?? true,
        },
      };
      this.groupCache.set(groupId, groupData);
      return groupData;
    } catch (error) {
      console.error("Error getting group data:", error);
      throw error;
    }
  }

  async createGroup(
    name: string,
    description: string,
    members: string[],
    options: CreateGroupOptions = {}
  ): Promise<Group<unknown>> {
    try {
      const group = await (this.client as any).conversations.newGroup(members, {
        groupName: name,
        groupDescription: description,
        isPublic: options.isPublic,
        settings: options.settings
      });
      return group as unknown as Group<unknown>;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getGroup(groupId: string): Promise<Group<unknown> | null> {
    try {
      const conversation = await this.client.conversations.getConversationById(groupId);
      if (!conversation || !isGroup(conversation)) {
        return null;
      }
      return conversation as unknown as Group<unknown>;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }

  async addMembers(group: Group<unknown>, members: string[]): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.addMembers(members);
    } catch (error) {
      console.error("Error adding members:", error);
      throw error;
    }
  }

  async removeMembers(group: Group<unknown>, members: string[]): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.removeMembers(members);
    } catch (error) {
      console.error("Error removing members:", error);
      throw error;
    }
  }

  async addGroupMember(group: Group<unknown>, member: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.addMembers([member]);
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeGroupMember(group: Group<unknown>, member: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.removeMembers([member]);
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  async updateMemberRole(groupId: string, member: string, role: Role): Promise<void> {
    try {
      const group = await this.getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      // Implement role update logic here
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  async isGroupAdmin(group: Group<unknown>, member: string): Promise<boolean> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      const admins = await xmtpGroup.admins();
      return admins.some((admin: any) => 
        (admin.accountAddress || admin).toLowerCase() === member.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async broadcastMessage(group: Group<unknown>, message: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.send(message);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async sendGroupMessage(group: Group<unknown>, message: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.send(message);
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }
}