import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { ChatHistoryService } from '../services/chatHistoryService';
import { processTwilioMedia } from '../utils/mediaHandler';
import { graph } from '../supervisor'; // Tu Grafo LangGraph
import { HumanMessage } from '@langchain/core/messages';

const router = Router();
const chatService = new ChatHistoryService();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post('/cemtech/receive-message', async (req: Request, res: Response) => {
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    // 1. Extraer datos de Twilio
    const { Body, From, To, MessageSid, MediaUrl0, MediaContentType0, ProfileName } = req.body;
    const clientNumber = From.replace('whatsapp:', '');
    const botNumber = To.replace('whatsapp:', '');

    console.log(`📩 Mensaje de ${clientNumber} (${ProfileName})`);

    // 2. Gestionar Sesión en Base de Datos (Supabase)
    const conversation = await chatService.getOrCreateConversation(clientNumber, ProfileName);

    // 3. Validar si el humano tiene el control (chat_on = true)
    if (conversation.chat_on) {
      console.log(`👤 [MODO HUMANO] Chat atendido por asesor. IA en pausa.`);
      
      // Aún debemos guardar el mensaje del usuario en el historial, aunque no respondamos
      let contentToSave = Body || '';
      let firebaseUrl = null;

      // Si mandó archivo mientras estaba en modo humano, lo guardamos igual
      if (MediaUrl0) {
        const mediaData = await processTwilioMedia(MediaUrl0, MediaContentType0, clientNumber);
        firebaseUrl = mediaData.url;
        contentToSave = mediaData.transcription || (mediaData.type === 'image' ? 'Imagen' : 'Archivo');
      }

      await chatService.saveMessage({
        conversationId: conversation.id,
        sender: 'user',
        message: contentToSave,
        twilioSid: MessageSid,
        type: MediaUrl0 ? (MediaContentType0.includes('image') ? 'image' : 'document') : 'text',
        url: firebaseUrl || undefined
      });

      // Respondemos vacío a Twilio
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml.toString());
      return;
    }

    // 4. Procesamiento IA (Si chat_on = false)
    let finalUserMessage = Body || '';
    let firebaseUrl = null;
    let messageType: 'text' | 'image' | 'audio' | 'document' = 'text';

    // Manejo de Archivos
    if (MediaUrl0) {
      try {
        const mediaData = await processTwilioMedia(MediaUrl0, MediaContentType0, clientNumber);
        firebaseUrl = mediaData.url;
        messageType = mediaData.type;

        if (mediaData.type === 'audio') {
            // Para la IA, el mensaje es la transcripción
            finalUserMessage = mediaData.transcription || '[Audio ininteligible]';
        } else if (mediaData.type === 'image') {
            // LangChain multimodales podría recibir la imagen, pero por ahora pasamos la URL en texto
            // O si tienes visión configurada: finalUserMessage = "Analyze this image..."
            finalUserMessage = finalUserMessage || `[Imagen enviada: ${mediaData.url}]`;
        } else {
            finalUserMessage = `[Archivo enviado: ${mediaData.url}]`;
        }
      } catch (e) {
        console.error('Error procesando media:', e);
        finalUserMessage = '[Error al procesar archivo adjunto]';
      }
    }

    // 5. Guardar Mensaje del Usuario (Supabase)
    await chatService.saveMessage({
        conversationId: conversation.id,
        sender: 'user',
        message: finalUserMessage,
        twilioSid: MessageSid,
        type: messageType,
        url: firebaseUrl || undefined
    });

    // 6. Invocar al Grafo (Supervisor)
    console.log(`🤖 IA procesando...`);
    
    const config = {
        configurable: {
            thread_id: conversation.id.toString(),
            user_phone: clientNumber
        }
    };

    const inputs = {
        messages: [new HumanMessage(finalUserMessage)]
    };

    const output = await graph.invoke(inputs, config);
    const lastMessage = output.messages[output.messages.length - 1];
    const botResponse = lastMessage.content as string;

    // 7. Enviar respuesta a Twilio
    // Aseguramos que los números tengan el formato correcto 'whatsapp:+...'
    const sendTo = From.startsWith('whatsapp:') ? From : `whatsapp:${From}`;
    const sendFrom = To.startsWith('whatsapp:') ? To : `whatsapp:${To}`;

    console.log(`📤 Enviando a Twilio: De ${sendFrom} para ${sendTo}`);

    const sentMsg = await twilioClient.messages.create({
        body: botResponse,
        from: sendFrom,
        to: sendTo
    });

    console.log(`✅ Twilio aceptó el mensaje. SID: ${sentMsg.sid} | Status: ${sentMsg.status}`);

    // 8. Guardar respuesta del Bot
    await chatService.saveMessage({
        conversationId: conversation.id,
        sender: 'assistant',
        message: botResponse,
        twilioSid: sentMsg.sid
    });

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
});

export default router;