import { Server as SocketIOServer, Socket } from 'socket.io';
import { saveMessage, validateMembership, sendPracticeInvitation, respondToInvitation } from '../services/community.service';
import prisma from '../config/database';
import { openrouter } from '../config/openrouter';
import { estimateTokens, logGptUsage } from '../services/ai/usage.service';

// Fixed bot user ID — created on first use
const BOT_USER_ID = 'bot-mujam-qa-00000000-0000-0000-0000';

async function ensureBotUser() {
  await prisma.user.upsert({
    where: { id: BOT_USER_ID },
    update: {},
    create: {
      id: BOT_USER_ID,
      name: 'مساعد معجم',
      email: 'bot@mujam.internal',
      passwordHash: 'bot-no-login',
      role: 'STUDENT',
    },
  });
}

async function getQaRoomIds(): Promise<Set<string>> {
  const rooms = await prisma.communityRoom.findMany({ where: { type: 'QA' }, select: { id: true } });
  return new Set(rooms.map((r) => r.id));
}

async function generateBotReply(userMessage: string, requestingUserId: string): Promise<string> {
  try {
    const model = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';
    const systemPrompt = `أنت مساعد منصة معجم لتعلم اللغة الإنجليزية. أجب على أسئلة الطلاب باللغة العربية بشكل مختصر ومفيد.
المنصة تتيح: تعلم مستويات الإنجليزية، محادثة مع AI، تدريب الشادونج (استماع وتقليد)، ألعاب لغوية، اختبارات، ومجتمع للتدريب مع الزملاء.
لا تذكر أسعاراً محددة. إذا كان السؤال لا يتعلق بالمنصة، اعتذر بلطف.`;

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'عذراً، لم أفهم سؤالك. هل يمكنك إعادة صياغته؟';
    const promptTokens =
      completion.usage?.prompt_tokens || estimateTokens(systemPrompt + userMessage);
    const completionTokens =
      completion.usage?.completion_tokens || estimateTokens(reply);
    await logGptUsage(requestingUserId, model, promptTokens, completionTokens);

    return reply;
  } catch {
    return 'عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى.';
  }
}

export function registerCommunitySocket(io: SocketIOServer) {
  // Preload bot user and QA room IDs
  let qaRoomIds: Set<string> = new Set();
  ensureBotUser().catch(() => {});
  getQaRoomIds().then((ids) => { qaRoomIds = ids; }).catch(() => {});

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    // ── join-room ──────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId }: { roomId: string }) => {
      try {
        const ok = await validateMembership(userId, roomId);
        if (!ok) {
          socket.emit('error', { message: 'غير مصرح لك بالدخول لهذه الغرفة' });
          return;
        }
        await socket.join(roomId);
        socket.to(roomId).emit('member-joined', { userId, socketId: socket.id });
      } catch {
        socket.emit('error', { message: 'حدث خطأ عند الانضمام' });
      }
    });

    // ── leave-room ─────────────────────────────────────────────────────────
    socket.on('leave-room', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
    });

    // ── send-message ───────────────────────────────────────────────────────
    socket.on('send-message', async ({ roomId, content }: { roomId: string; content: string }) => {
      try {
        if (!content?.trim()) return;
        const ok = await validateMembership(userId, roomId);
        if (!ok) { socket.emit('error', { message: 'غير مصرح' }); return; }

        const msg = await saveMessage(roomId, userId, 'TEXT', content.trim());
        io.to(roomId).emit('new-message', msg);

        // Q&A bot reply
        if (qaRoomIds.has(roomId)) {
          const reply = await generateBotReply(content.trim(), userId);
          const botMsg = await saveMessage(roomId, BOT_USER_ID, 'TEXT', reply);
          io.to(roomId).emit('new-message', botMsg);
        }
      } catch {
        socket.emit('error', { message: 'فشل إرسال الرسالة' });
      }
    });

    // ── send-audio ─────────────────────────────────────────────────────────
    socket.on(
      'send-audio',
      async ({ roomId, audioUrl, audioDuration }: { roomId: string; audioUrl: string; audioDuration?: number }) => {
        try {
          if (!audioUrl) return;
          const ok = await validateMembership(userId, roomId);
          if (!ok) { socket.emit('error', { message: 'غير مصرح' }); return; }

          const msg = await saveMessage(roomId, userId, 'AUDIO', undefined, audioUrl, audioDuration);
          io.to(roomId).emit('new-message', msg);
        } catch {
          socket.emit('error', { message: 'فشل إرسال الرسالة الصوتية' });
        }
      }
    );

    // ── typing ─────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId, userName }: { roomId: string; userName: string }) => {
      socket.to(roomId).emit('user-typing', { userId, userName });
    });

    // ── practice: send invitation ──────────────────────────────────────────
    socket.on('practice-invite', async ({ toUserId }: { toUserId: string }) => {
      try {
        if (!toUserId || toUserId === userId) return;
        const inv = await sendPracticeInvitation(userId, toUserId);
        // Notify the target user if they're connected
        socket.to(`user:${toUserId}`).emit('practice-invitation', inv);
        socket.emit('practice-invite-sent', inv);
      } catch {
        socket.emit('error', { message: 'فشل إرسال الدعوة' });
      }
    });

    // ── practice: respond to invitation ────────────────────────────────────
    socket.on('practice-respond', async ({ invitationId, accept }: { invitationId: string; accept: boolean }) => {
      try {
        const result = await respondToInvitation(invitationId, userId, accept) as any;
        const accepterName: string = result.toUser?.name ?? 'مستخدم';
        const senderUserId: string = result.fromUserId ?? result.fromUser?.id;

        if (accept && result.privateRoomId) {
          const payload = { roomId: result.privateRoomId, byName: accepterName };
          socket.to(`user:${senderUserId}`).emit('practice-accepted', payload);
          socket.emit('practice-accepted', payload);
        } else {
          socket.to(`user:${senderUserId}`).emit('practice-declined', { byName: accepterName });
        }
      } catch {
        socket.emit('error', { message: 'فشل الرد على الدعوة' });
      }
    });

    // ── join personal channel for practice notifications ───────────────────
    socket.on('join-personal', () => {
      socket.join(`user:${userId}`);
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // socket.io auto-removes from all rooms on disconnect
    });
  });
}
