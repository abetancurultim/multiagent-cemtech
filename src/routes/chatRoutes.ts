import dotenv from "dotenv";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { graph } from "../supervisor";
import { HumanMessage } from "@langchain/core/messages";
import fetch from "node-fetch";
import { OpenAI, toFile } from "openai";
import twilio from "twilio";
import { initializeApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { ElevenLabsClient } from "elevenlabs";
import path from "path";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  saveChatHistory,
  saveTemplateChatHistory,
} from "../utils/saveHistoryDb";
import { getAvailableChatOn } from "../utils/getAvailableChatOn";
import { getAvailableForAudio } from "../utils/getAvailableForAudio";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MessagingResponse = twilio.twiml.MessagingResponse; // mandar un texto simple
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken); // mandar un texto con media
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// ElevenLabs Client
const elevenlabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage();

const createAudioStreamFromText = async (text: string): Promise<Buffer> => {
  const audioStream = await elevenlabsClient.generate({
    voice: "Andrea",
    model_id: "eleven_flash_v2_5",
    text,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  const content = Buffer.concat(chunks);
  return content;
};

let exportedFromNumber: string | undefined;

let globalConfig = {
  configurable: {
    thread_id: "",
    phone_number: "",
  },
};

// Endpoint para procesar mensajes
router.post("/induequipos/receive-message", async (req, res) => {
  const twiml = new MessagingResponse();
  const from = req.body.From;
  const to = req.body.To;

  // Parseo de numeros de telefono
  const fromColonIndex = from.indexOf(":");
  const toColonIndex = to.indexOf(":");
  // Numero de telefono que pasa de "whatsapp:+57XXXXXXXXX" a "+57XXXXXXXXX"
  const fromNumber = from.slice(fromColonIndex + 1); // Número del cliente
  const toNumber = to.slice(toColonIndex + 1);
  // fromNumber sin indicativo de país
  const fromNumberWithoutCountryCode = fromNumber.slice(3); // Número del cliente sin indicativo de país

  exportedFromNumber = fromNumber;

  globalConfig = {
    configurable: {
      thread_id: fromNumber,
      phone_number: fromNumber,
    },
  };

  try {
    let incomingMessage;
    let incomingImage;
    let firebaseImageUrl = "";

    console.log("Incoming message Type:", req.body.Body);

    if (
      req.body.MediaContentType0 &&
      req.body.MediaContentType0.includes("audio")
    ) {
      try {
        const mediaUrl = await req.body.MediaUrl0;

        const response = await fetch(mediaUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${accountSid}:${authToken}`
            ).toString("base64")}`,
          },
        });

        const file = await toFile(response.body, "recording.wav");

        const transcription = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          prompt:
            "Por favor, transcribe el audio y asegúrate de escribir los números exactamente como se pronuncian, sin espacios, comas, ni puntos. Por ejemplo, un número de documento   debe ser transcrito como 123456789.",
        });

        const { text } = transcription;
        incomingMessage = text;
      } catch (error) {
        console.error("Error transcribing audio:", error);
        twiml.message(
          "En este momento no puedo transcribir audios, por favor intenta con un mensaje de texto. O prueba grabando el audio nuevamente."
        );
        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end(twiml.toString());
      }
    } else if (req.body.MessageType === "image") {
      const mediaUrl = await req.body.MediaUrl0;
      const response = await fetch(mediaUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
        },
      });

      // Obtener el buffer de la imagen
      const imageBuffer = await response.buffer();

      // Convertir la imagen a base64
      const imageBase64 = imageBuffer.toString("base64");

      // Crear el nombre del archivo en Firebase Storage
      const imageName = `${uuidv4()}.jpg`;
      const storageRef = ref(storage, `images/${imageName}`);
      const metadata = {
        contentType: "image/jpg",
      };

      // Función para subir la imagen a Firebase Storage
      const uploadImage = () => {
        return new Promise((resolve, reject) => {
          const uploadTask = uploadBytesResumable(
            storageRef,
            imageBuffer,
            metadata
          );

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              // Progreso de la subida (opcional)
              console.log("Upload is in progress...");
            },
            (error) => {
              reject(`Upload failed: ${error.message}`);
            },
            async () => {
              // Subida completada, obtener la URL de descarga
              const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(imageUrl);
            }
          );
        });
      };

      // Esperar a que la imagen se suba y obtener la URL
      try {
        const uploadedImageUrl = await uploadImage();
        // console.log('Uploaded Image URL:', uploadedImageUrl);

        // Guardar la imagen en Firebase Storage
        firebaseImageUrl = uploadedImageUrl as string;
        req.body.Body
          ? (incomingMessage = req.body.Body)
          : (incomingMessage = "");

        // Usar la imagen en base64 según lo necesites
        const base64DataUrl = `data:image/jpeg;base64,${imageBase64}`;
        // console.log('Image in Base64:', base64DataUrl);

        // Puedes usar `base64DataUrl` para enviarla al modelo de OpenAI o guardarla en tu base de datos si es necesario.

        incomingImage = base64DataUrl; // Si quieres trabajar con la imagen en base64
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    } else {
      incomingMessage = req.body.Body;
    }

    // const clientMessage = firebaseImageUrl ? firebaseImageUrl : incomingMessage;

    // Ejecutar la función si el mensaje es del cliente
    await saveChatHistory(fromNumber, incomingMessage, true, firebaseImageUrl);

    // Validar si en el dashboard se encuentra activado el chat
    const chatOn = await getAvailableChatOn(fromNumber);
    console.log(
      "🔍 Estado del chat en dashboard:",
      chatOn ? "ACTIVADO" : "DESACTIVADO"
    );

    // Si chat_on es false, quiero decir que en el dashboard está desactivado, así que acá se manda mensaje por agentOutput
    if (!chatOn) {
      // configuración para crear hilos de conversación en el agente y manejar memorias independientes.
      const config = {
        configurable: {
          thread_id: fromNumber,
          phone_number: fromNumber,
        },
      };

      console.log("=== INICIO DE PROCESAMIENTO MULTIAGENTE ===");
      console.log("📱 Cliente:", fromNumber);
      console.log("💬 Mensaje recibido:", incomingMessage);
      console.log("🔧 Configuración:", config);

      let agentOutput;
      if (incomingImage) {
        console.log("🖼️ Procesando mensaje con imagen...");
        const message = new HumanMessage({
          content: [
            {
              type: "image_url",
              image_url: { url: incomingImage },
            },
          ],
        });

        console.log("📤 Enviando mensaje con imagen al supervisor...");
        agentOutput = await graph.invoke(
          {
            messages: [message],
          },
          config
        );
      } else {
        console.log("📤 Enviando mensaje de texto al supervisor...");
        agentOutput = await graph.invoke(
          {
            messages: [new HumanMessage({ content: incomingMessage })],
          },
          config
        );
      }

      console.log("🔄 Respuesta completa del sistema multiagente:");
      console.log("📊 Número total de mensajes:", agentOutput.messages.length);

      // Log detallado de todos los mensajes del flujo
      agentOutput.messages.forEach((msg, index) => {
        console.log(`📝 Mensaje ${index + 1}:`);
        console.log(`   - Tipo: ${msg.constructor.name}`);
        console.log(`   - Agente: ${msg.name || "No especificado"}`);

        // Manejar diferentes tipos de contenido
        let contentPreview = "Sin contenido";
        if (typeof msg.content === "string") {
          contentPreview =
            msg.content.substring(0, 100) +
            (msg.content.length > 100 ? "..." : "");
        } else if (Array.isArray(msg.content)) {
          contentPreview = "[Contenido complejo/multimedia]";
        }

        console.log(`   - Contenido: ${contentPreview}`);
      });

      const lastMessage = agentOutput.messages[agentOutput.messages.length - 1];

      // Determinar qué agente respondió
      let respondingAgent = "Supervisor";
      if (lastMessage.name) {
        switch (lastMessage.name) {
          case "SalesService":
            respondingAgent = "Valentina Ríos (Ventas)";
            break;
          case "TechnicalService":
            respondingAgent = "Carlos Restrepo (Soporte Técnico)";
            break;
          case "CustomerService":
            respondingAgent = "María Fernanda Ortiz (Atención al Cliente)";
            break;
          default:
            respondingAgent = lastMessage.name || "Supervisor";
        }
      }

      console.log("🎯 AGENTE QUE RESPONDE:", respondingAgent);
      console.log("💭 Respuesta final:", lastMessage.content);

      if (!lastMessage || typeof lastMessage.content !== "string") {
        console.error("Error: El mensaje de la IA es nulo o no es un string.");
        res
          .status(500)
          .send({ error: "La IA no generó una respuesta válida." });
        return;
      }

      const responseMessage = lastMessage.content;

      console.log("📋 PROCESANDO RESPUESTA PARA ENVÍO:");
      console.log("💬 Respuesta IA:", responseMessage);
      console.log("📏 Longitud de respuesta:", responseMessage.length);

      // Ejecutar la función si el mensaje es del agente
      await saveChatHistory(fromNumber, responseMessage, false, "");

      //consultar si esta disponible para audios
      const isAvailableForAudio = await getAvailableForAudio(fromNumber);
      console.log("🔊 Cliente disponible para audio:", isAvailableForAudio);
      // console.log("isAvailableForAudio", isAvailableForAudio);

      // Si la respuesta es menor a 240 caracteres && no contiene números, hacer TTS y enviar el audio
      if (
        responseMessage.length <= 400 && // Menor a 600 caracteres
        !/\d/.test(responseMessage) && // No contiene números
        !/\b(?:[A-Z]{2,}|\b(?:[A-Z]\.){2,}[A-Z]?)\b/.test(responseMessage) && // No contiene siglas
        isAvailableForAudio // El cliente puede recibir audios
      ) {
        console.log("🎵 ENVIANDO RESPUESTA COMO AUDIO");
        console.log("✅ Criterios para audio cumplidos:");
        console.log("   - Longitud ≤ 400 caracteres");
        console.log("   - No contiene números");
        console.log("   - No contiene siglas");
        console.log("   - Cliente habilitado para audio");
        try {
          const audioBuffer = await createAudioStreamFromText(responseMessage);
          const audioName = `${uuidv4()}.wav`;
          // Subir el archivo de audio a Firebase Storage
          const storageRef = ref(storage, `audios/${audioName}`);
          const metadata = {
            contentType: "audio/mpeg",
          };
          const uploadTask = uploadBytesResumable(
            storageRef,
            audioBuffer,
            metadata
          );
          // Esperar a que la subida complete y obtener la URL pública
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              // Progreso de la subida (opcional)
              console.log("Upload is in progress...");
            },
            (error) => {
              throw new Error(`Upload failed: ${error.message}`);
            },
            async () => {
              // Subida completada
              const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
              // Envía el archivo de audio a través de Twilio
              await client.messages.create({
                body: "Audio message",
                from: to,
                to: from,
                mediaUrl: [audioUrl],
              });
              console.log("✅ Audio message sent successfully");
              console.log("🔗 Audio URL:", audioUrl);
              res.writeHead(200, { "Content-Type": "text/xml" });
              res.end(twiml.toString());
            }
          );
        } catch (error) {
          console.error("❌ Error sending audio message:", error);
          console.log("🔄 Fallback: Enviando como texto");
          twiml.message(responseMessage);
          res.writeHead(200, { "Content-Type": "text/xml" });
          res.end(twiml.toString());
        }
      } else {
        console.log("📝 ENVIANDO RESPUESTA COMO TEXTO");
        console.log("❌ Criterios para audio NO cumplidos:");
        console.log("   - Longitud:", responseMessage.length, "caracteres");
        console.log("   - Contiene números:", /\d/.test(responseMessage));
        console.log(
          "   - Contiene siglas:",
          /\b(?:[A-Z]{2,}|\b(?:[A-Z]\.){2,}[A-Z]?)\b/.test(responseMessage)
        );
        console.log("   - Cliente habilitado para audio:", isAvailableForAudio);

        // Responder con el texto si es mayor de 350 caracteres
        if (responseMessage.length > 1000) {
          console.log("📄 Mensaje muy largo, dividiendo en partes...");
          const messageParts = responseMessage.split("\n\n");
          console.log("🔢 Número de partes:", messageParts.length);

          // eslint-disable-next-line prefer-const
          for (let part of messageParts) {
            if (part !== "") {
              await client.messages.create({
                body: part,
                from: to,
                to: from,
              });
              console.log("📤 Enviada parte:", part.substring(0, 50) + "...");
              console.log("-------------------");
            }
          }
          console.log("✅ Todas las partes enviadas exitosamente");
        } else {
          try {
            const message = await client.messages.create({
              body: responseMessage,
              from: to,
              to: from,
            });
            console.log("✅ Message sent successfully:", message.sid);
          } catch (error) {
            console.error("❌ Error sending message:", error);
          }
        }
      }

      console.log("=== FIN DE PROCESAMIENTO MULTIAGENTE ===");
      console.log("📱 Cliente:", fromNumber);
      console.log("🎯 Agente final:", respondingAgent);
      console.log("🕐 Timestamp:", new Date().toISOString());
      console.log("===============================================");
    } else {
      console.log("👤 MODO HUMANO ACTIVADO");
      console.log("📱 Cliente:", fromNumber);
      console.log("💬 Mensaje guardado para atención humana:", incomingMessage);
      console.log("⏳ Esperando respuesta del agente humano...");
    }
  } catch (error) {
    console.error("❌ Error in chat route:", error);
    res.status(500).send({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

router.post("/induequipos/chat-dashboard", async (req, res) => {
  try {
    const twiml = new MessagingResponse();
    const { clientNumber, newMessage } = req.body;

    const isAudioMessage = await newMessage.includes(
      "https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/audios"
    );
    const isFileMessage = await newMessage.includes(
      "https://firebasestorage.googleapis.com/v0/b/ultim-admin-dashboard.appspot.com/o/documents"
    );

    if (isAudioMessage) {
      console.log("Audio message detected");
      // Descargar el archivo desde Firebase
      const audioUrl = newMessage;
      const response = await fetch(audioUrl);
      const audioBuffer = await response.buffer();

      const tempDir = path.join(__dirname, "../temp"); // Subir un nivel desde routes
      const tempInputPath = path.join(tempDir, "tempInput.webm");
      const tempOutputPath = path.join(tempDir, "tempOutput.mp3");

      // Guardar el archivo temporal
      fs.writeFileSync(tempInputPath, new Uint8Array(audioBuffer));

      // Convertir a formato OGG usando ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .output(tempOutputPath)
          .inputOptions("-f", "webm")
          .audioCodec("libmp3lame")
          .on("start", (commandLine) => {
            console.log("Comando FFmpeg:", commandLine);
          })
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      // Subir el audio convertido a Firebase Storage a la capeta audios
      const audioName = `audio_${uuidv4()}.mp3`;
      const storageRef = ref(storage, `ogg/${audioName}`);
      const metadata = {
        contentType: "audio/mpeg",
      };
      const uploadTask = uploadBytesResumable(
        storageRef,
        fs.readFileSync(tempOutputPath),
        metadata
      );

      console.log("Nombre creado", audioName);

      // Esperar a que la subida complete y obtener la URL pública
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progreso de la subida (opcional)
          console.log("Upload is in progress...");
        },
        (error) => {
          throw new Error(`Upload failed: ${error.message}`);
        },
        async () => {
          // Subida completada
          const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("Audio URL:", audioUrl);
          // Envía el archivo de audio a través de Twilio
          await client.messages.create({
            body: "Audio message",
            to: `whatsapp:${clientNumber}`,
            // from: `whatsapp:+5745012080`,
            from: `whatsapp:+14155238886`,
            mediaUrl: [audioUrl],
          });
          // Limpiar archivos temporales
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
          console.log("Audio message sent successfully", audioUrl);
          res.writeHead(200, { "Content-Type": "text/xml" });
          res.end(twiml.toString());
        }
      );
    } else if (isFileMessage) {
      console.log("File message detected");
      const message = await client.messages.create({
        // body: 'Mensaje con archivo',
        to: `whatsapp:${clientNumber}`,
        // from: `whatsapp:+5745012080`,
        from: `whatsapp:+14155238886`,
        mediaUrl: [newMessage],
      });
      console.log("File message sent successfully:", message.sid);
      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(twiml.toString());
    } else {
      // Enviar mensaje a través de Twilio
      const message = await client.messages.create({
        from: "whatsapp:+14155238886", // Número de Twilio de pruebas
        // from: `whatsapp:+5745012080`, // Número de Coltefinanciera
        to: `whatsapp:${clientNumber}`,
        body: newMessage,
      });

      // Enviar respuesta al frontend
      res.status(200).send({
        success: true,
        message: "Mensaje enviado exitosamente",
        sid: message.sid,
      });
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).send({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Ruta para enviar una plantilla de WhatsApp
router.post("/induequipos/send-template", async (req, res) => {
  const { to, templateId, name, paymentDate, amount, user } = req.body;

  try {
    const message = await client.messages.create({
      // from: 'whatsapp:+5745012080',
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to}`,
      contentSid: templateId,
      messagingServiceSid: "MGe5ebd75ff86ad20dbe6c0c1d09bfc081",
      contentVariables: JSON.stringify({ 1: name, 2: paymentDate, 3: amount }),
    });
    console.log("body", message.body);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Traer el mensaje de la plantilla desde el endpoint /message/:sid con axios
    const response = await axios.get(
      `https://ultim.online/fenix/message/${message.sid}`
    );

    console.log("response", response.data.message.body);

    // Guardar el mensaje en la base de datos (simulado)
    await saveTemplateChatHistory(
      to,
      response.data.message.body,
      false,
      "",
      user
    );

    res.status(200).json({
      success: true,
      message: response.data.message.body,
      sid: message.sid,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al enviar la plantilla",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Ruta para obtener detalles de un mensaje específico por SID
router.get("/induequipos/message/:sid", async (req, res) => {
  const { sid } = req.params;

  try {
    const message = await client.messages(sid).fetch();
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener el mensaje",
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Endpoint de pruebas para la interfaz React
// @ts-ignore
router.post("/api/test-chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Validar que el mensaje esté presente
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: 'El campo "message" es requerido y debe ser un string',
      });
    }

    // Configuración para el grafo (usando un thread_id único para pruebas)
    const config = {
      configurable: {
        thread_id: `test-session-1`, // Thread único por sesión de prueba
        phone_number: "test-user",
        recursionLimit: 100,
      },
    };

    console.log("=== INICIO DE PRUEBA MULTIAGENTE ===");
    console.log("🧪 Modo: Prueba desde interfaz React");
    console.log("💬 Mensaje de prueba:", message);
    console.log("🔧 Configuración:", config);

    // Enviar mensaje al grafo de LangGraph
    console.log("📤 Enviando mensaje al supervisor (modo prueba)...");
    const agentOutput = await graph.invoke(
      {
        messages: [new HumanMessage({ content: message })],
      },
      config
    );

    console.log("🔄 Respuesta completa del sistema multiagente (prueba):");
    console.log("📊 Número total de mensajes:", agentOutput.messages.length);

    // Log detallado de todos los mensajes del flujo
    agentOutput.messages.forEach((msg, index) => {
      console.log(`📝 Mensaje ${index + 1}:`);
      console.log(`   - Tipo: ${msg.constructor.name}`);
      console.log(`   - Agente: ${msg.name || "No especificado"}`);

      // Manejar diferentes tipos de contenido
      let contentPreview = "Sin contenido";
      if (typeof msg.content === "string") {
        contentPreview =
          msg.content.substring(0, 100) +
          (msg.content.length > 100 ? "..." : "");
      } else if (Array.isArray(msg.content)) {
        contentPreview = "[Contenido complejo/multimedia]";
      }

      console.log(`   - Contenido: ${contentPreview}`);
    });

    // Obtener la respuesta del último mensaje
    const lastMessage = agentOutput.messages[agentOutput.messages.length - 1];

    if (!lastMessage || typeof lastMessage.content !== "string") {
      console.log("❌ Error: La IA no generó una respuesta válida");
      return res.status(500).json({
        success: false,
        error: "La IA no generó una respuesta válida",
      });
    }

    // Determinar qué agente respondió basándose en el nombre del mensaje
    let agentName = "Supervisor";
    if (lastMessage.name) {
      switch (lastMessage.name) {
        case "SalesService":
          agentName = "Valentina Ríos (Ventas)";
          break;
        case "TechnicalService":
          agentName = "Carlos Restrepo (Soporte Técnico)";
          break;
        case "CustomerService":
          agentName = "María Fernanda Ortiz (Atención al Cliente)";
          break;
        default:
          agentName = "Supervisor";
      }
    }

    console.log("🎯 AGENTE QUE RESPONDE:", agentName);
    console.log("💭 Respuesta final:", lastMessage.content);
    console.log("🕐 Timestamp:", new Date().toISOString());
    console.log("=== FIN DE PRUEBA MULTIAGENTE ===");

    // Responder con formato JSON
    res.status(200).json({
      success: true,
      response: lastMessage.content,
      agent: agentName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en endpoint de pruebas:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

export default router;

export { exportedFromNumber };
