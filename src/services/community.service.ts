import prisma from '../config/database';

export async function getCommunityStatus(userId: string) {
  const memberships = await prisma.communityMember.findMany({
    where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
    include: { room: { select: { id: true, name: true, nameAr: true, icon: true, isActive: true } } },
  });

  const isMember = memberships.some((m) => m.status === 'ACTIVE');
  const isPending = !isMember && memberships.some((m) => m.status === 'PENDING');

  return { isMember, isPending, memberships };
}

export async function joinCommunity(userId: string) {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } });
  const autoAccept = settings?.communityAutoAccept ?? true;
  const status = autoAccept ? 'ACTIVE' : 'PENDING';

  const defaultRooms = await prisma.communityRoom.findMany({
    where: { isDefault: true, isActive: true },
  });

  for (const room of defaultRooms) {
    await prisma.communityMember.upsert({
      where: { userId_roomId: { userId, roomId: room.id } },
      update: {},
      create: { userId, roomId: room.id, status },
    });
  }

  return { status, roomCount: defaultRooms.length };
}

export async function getActiveRooms(userId: string) {
  const memberships = await prisma.communityMember.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      room: {
        include: {
          _count: { select: { members: { where: { status: 'ACTIVE' } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { user: { select: { name: true } } },
          },
          members: {
            where: { userId: { not: userId }, status: 'ACTIVE' },
            take: 1,
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      },
    },
  });

  const mapped = await Promise.all(
    memberships
      .filter((m) => m.room.isActive)
      .map(async (m) => {
        const unreadCount = await prisma.communityMessage.count({
          where: {
            roomId: m.roomId,
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
            userId: { not: userId },
          },
        });
        const lastMsg = m.room.messages[0];
        const isPrivatePractice = m.room.type === 'PRACTICE' && !m.room.isDefault;
        const partner = isPrivatePractice ? (m.room.members[0]?.user ?? null) : null;
        return {
          id: m.room.id,
          name: m.room.name,
          nameAr: m.room.nameAr,
          icon: m.room.icon,
          type: m.room.type as string,
          isDefault: m.room.isDefault,
          memberCount: m.room._count.members,
          unreadCount,
          partner,
          lastMessageAt: lastMsg?.createdAt ?? null,
          lastMessage: lastMsg
            ? {
                content: lastMsg.type === 'AUDIO' ? '🎙️ رسالة صوتية' : (lastMsg.content ?? ''),
                senderName: lastMsg.user.name,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
        };
      })
  );

  // Sort: default group rooms first (by name), then private rooms by last message (newest first)
  const sorted = mapped.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    const ta = a.lastMessageAt?.getTime() ?? 0;
    const tb = b.lastMessageAt?.getTime() ?? 0;
    return tb - ta;
  });

  // Deduplicate private practice rooms per partner — keep only the one with the newest message
  const seenPartners = new Set<string>();
  return sorted.filter((r) => {
    if (!r.partner) return true;
    if (seenPartners.has(r.partner.id)) return false;
    seenPartners.add(r.partner.id);
    return true;
  });
}

export async function getRoomMessages(
  roomId: string,
  userId: string,
  limit = 30,
  before?: string
) {
  const member = await prisma.communityMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
  });
  if (!member || member.status !== 'ACTIVE') throw new Error('NOT_MEMBER');

  const cursor = before ? { id: before } : undefined;
  const messages = await prisma.communityMessage.findMany({
    where: { roomId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return messages.reverse();
}

export async function saveMessage(
  roomId: string,
  userId: string,
  type: 'TEXT' | 'AUDIO',
  content?: string,
  audioUrl?: string,
  audioDuration?: number
) {
  const msg = await prisma.communityMessage.create({
    data: { roomId, userId, type, content, audioUrl, audioDuration },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return msg;
}

export async function validateMembership(userId: string, roomId: string): Promise<boolean> {
  const m = await prisma.communityMember.findUnique({
    where: { userId_roomId: { userId, roomId } },
  });
  return m?.status === 'ACTIVE';
}

// ── Practice invitation helpers ────────────────────────────────────────────

export async function getActiveMembers(currentUserId: string) {
  // Return all active registered users (not just community members)
  // so the practice partner finder works even before others have joined the community
  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: currentUserId } },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  });

  return Promise.all(
    users.map(async (u) => {
      const [hasRoom, hasPending] = await Promise.all([
        prisma.communityRoom.findFirst({
          where: {
            type: 'PRACTICE',
            isDefault: false,
            AND: [
              { members: { some: { userId: currentUserId, status: 'ACTIVE' } } },
              { members: { some: { userId: u.id, status: 'ACTIVE' } } },
            ],
          },
          select: { id: true },
        }),
        prisma.practiceInvitation.findFirst({
          where: {
            OR: [
              { fromUserId: currentUserId, toUserId: u.id, status: 'PENDING' },
              { fromUserId: u.id, toUserId: currentUserId, status: 'PENDING' },
            ],
          },
          select: { id: true },
        }),
      ]);
      return {
        ...u,
        alreadyConnected: !!(hasRoom || hasPending),
        existingRoomId: hasRoom?.id ?? null,
      };
    })
  );
}

export async function markRoomRead(userId: string, roomId: string) {
  await prisma.communityMember.update({
    where: { userId_roomId: { userId, roomId } },
    data: { lastReadAt: new Date() },
  });
}

export async function sendPracticeInvitation(fromUserId: string, toUserId: string) {
  // Prevent duplicate invitations in either direction
  const existing = await prisma.practiceInvitation.findFirst({
    where: {
      OR: [
        { fromUserId, toUserId, status: 'PENDING' },
        { fromUserId: toUserId, toUserId: fromUserId, status: 'PENDING' },
      ],
    },
  });
  if (existing) throw new Error('ALREADY_INVITED');

  // Prevent inviting if a private room already exists between them
  const existingRoom = await prisma.communityRoom.findFirst({
    where: {
      type: 'PRACTICE',
      isDefault: false,
      AND: [
        { members: { some: { userId: fromUserId, status: 'ACTIVE' } } },
        { members: { some: { userId: toUserId, status: 'ACTIVE' } } },
      ],
    },
    select: { id: true },
  });
  if (existingRoom) throw new Error(`ALREADY_HAS_ROOM:${existingRoom.id}`);

  return prisma.practiceInvitation.create({
    data: { fromUserId, toUserId },
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

export async function getPracticeInvitations(userId: string) {
  const received = await prisma.practiceInvitation.findMany({
    where: { toUserId: userId, status: 'PENDING' },
    include: { fromUser: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const sent = await prisma.practiceInvitation.findMany({
    where: { fromUserId: userId, status: 'PENDING' },
    include: { toUser: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return { received, sent };
}

export async function respondToInvitation(invitationId: string, userId: string, accept: boolean) {
  const inv = await prisma.practiceInvitation.findUnique({ where: { id: invitationId } });
  if (!inv || inv.toUserId !== userId) throw new Error('NOT_FOUND');
  if (inv.status !== 'PENDING') throw new Error('ALREADY_HANDLED');

  if (!accept) {
    return prisma.practiceInvitation.update({ where: { id: invitationId }, data: { status: 'DECLINED' } });
  }

  // Create private 1-on-1 room
  const room = await prisma.communityRoom.create({
    data: {
      name: `practice-${inv.fromUserId}-${inv.toUserId}`,
      nameAr: 'جلسة تدريب خاصة',
      icon: '🎙️',
      type: 'PRACTICE',
      isDefault: false,
      members: {
        create: [
          { userId: inv.fromUserId, status: 'ACTIVE' },
          { userId: inv.toUserId, status: 'ACTIVE' },
        ],
      },
    },
  });

  return prisma.practiceInvitation.update({
    where: { id: invitationId },
    data: { status: 'ACCEPTED', privateRoomId: room.id },
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true } },
      privateRoom: true,
    },
  });
}

// ── Admin helpers ──────────────────────────────────────────────────────────

export async function adminGetRooms() {
  return prisma.communityRoom.findMany({
    include: { _count: { select: { members: true, messages: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function adminCreateRoom(data: {
  name: string;
  nameAr: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
}) {
  return prisma.communityRoom.create({ data });
}

export async function adminUpdateRoom(
  id: string,
  data: Partial<{ name: string; nameAr: string; description: string; icon: string; isActive: boolean; isDefault: boolean }>
) {
  return prisma.communityRoom.update({ where: { id }, data });
}

export async function adminGetMembers(status?: string) {
  return prisma.communityMember.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      room: { select: { id: true, nameAr: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });
}

export async function adminUpdateMember(id: string, status: 'ACTIVE' | 'PENDING' | 'BANNED') {
  return prisma.communityMember.update({ where: { id }, data: { status } });
}

export async function adminDeleteMessage(id: string) {
  return prisma.communityMessage.delete({ where: { id } });
}

export async function adminGetSettings() {
  const s = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } });
  return { communityAutoAccept: s?.communityAutoAccept ?? true };
}

export async function adminUpdateSettings(communityAutoAccept: boolean) {
  return prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: { communityAutoAccept },
    create: {
      id: 'singleton',
      communityAutoAccept,
      updatedAt: new Date(),
    },
  });
}
