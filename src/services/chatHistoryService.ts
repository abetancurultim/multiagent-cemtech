import { supabase } from '../config/supabase';
import { Tables } from '../types/db';

export class ChatHistoryService {

  /**
   * Obtiene una conversación existente o crea una nueva basada en el número de teléfono (WhatsApp ID)
   */
  async getOrCreateConversation(clientNumber: string, clientName?: string): Promise<Tables<'chat_history'>> {
    // 1. Buscar existente
    const { data: existing, error: findError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('client_number', clientNumber)
      .single();

    if (existing) return existing;

    // 2. Crear si no existe
    const { data: newChat, error: createError } = await supabase
      .from('chat_history')
      .insert({
        client_number: clientNumber,
        client_name: clientName || 'Unknown',
        agent_name: 'Cemtech Supervisor',
        origin: 'whatsapp',
        chat_status: 'open'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating chat history:', createError);
      throw new Error('Failed to initialize chat history');
    }

    return newChat;
  }

  /**
   * Guarda un mensaje (entrante o saliente) en la base de datos
   */
  async saveMessage(params: {
    conversationId: number;
    sender: 'user' | 'assistant' | 'system'; // 'user' (cliente), 'assistant' (IA), o 'system'
    message: string;
    twilioSid?: string;
    type?: 'text' | 'image' | 'document' | 'audio';
    url?: string;
  }): Promise<Tables<'messages'> | null> {
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender: params.sender,
        message: params.message,
        twilio_sid: params.twilioSid,
        type: params.type || 'text',
        status: params.sender === 'user' ? 'received' : 'sent',
        url: params.url
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }
    return data;
  }

  /**
   * Actualiza el estado de un mensaje (Webhook de Twilio Status)
   */
  async updateMessageStatus(twilioSid: string, status: string) {
    await supabase
      .from('messages')
      .update({ status: status })
      .eq('twilio_sid', twilioSid);
      
    // Opcional: Guardar en message_status_history
  }
}