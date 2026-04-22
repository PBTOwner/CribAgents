import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { conversations, messages } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { processMessage } from '../services/ai-agent.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /conversations — create a new conversation
router.post('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title } = req.body;

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        title: title || 'New Conversation',
      })
      .returning();

    res.status(201).json({ success: true, conversation });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation', details: error.message });
  }
});

// GET /conversations — list user's conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    res.json({ success: true, conversations: userConversations });
  } catch (error: any) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations', details: error.message });
  }
});

// GET /conversations/:id/messages — get conversation messages
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    res.json({ success: true, messages: conversationMessages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

// POST /conversations/:id/message — send message to AI agent
router.post('/conversations/:id/message', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Process through AI agent
    const result = await processMessage(conversationId, userId, message.trim());

    res.json({
      success: true,
      response: result.response,
      toolsUsed: result.toolsUsed,
    });
  } catch (error: any) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
});

// DELETE /conversations/:id — delete a conversation
router.delete('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete messages first, then conversation
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation', details: error.message });
  }
});

export default router;
