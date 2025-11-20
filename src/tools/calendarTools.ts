import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// Función auxiliar para crear el cliente de Google Calendar
function createCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// Herramienta para crear eventos usando tool y Zod
const createCalendarEventTool = tool(
  async ({ summary, description, startTime, durationMinutes }) => {
    try {
      const calendar = createCalendarClient();
      
      // Parsear fecha - si es ISO usar directamente, si no, intentar interpretarla
      let startDateTime = startTime;
      if (!startTime.includes('T')) {
        // Es una fecha descriptiva, convertirla
        const now = new Date();
        if (startTime.toLowerCase().includes('tomorrow') || startTime.toLowerCase().includes('mañana')) {
          now.setDate(now.getDate() + 1);
        }
        
        // Buscar hora en el texto
        const timeMatch = startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          
          // Convertir a 24 horas si hay AM/PM
          if (timeMatch[3]) {
            const meridian = timeMatch[3].toLowerCase();
            if (meridian === 'pm' && hours !== 12) hours += 12;
            if (meridian === 'am' && hours === 12) hours = 0;
          }
          
          now.setHours(hours, minutes, 0, 0);
        }
        
        startDateTime = now.toISOString();
      }
      
      const endDateTime = new Date(
        new Date(startDateTime).getTime() + durationMinutes * 60000
      ).toISOString();
      
      const event = {
        summary,
        description: description || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Bogota',
        },
      };

      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        requestBody: event,
      });

      return `✅ Evento creado exitosamente: "${summary}" el ${new Date(startDateTime).toLocaleString('es-CO', { 
        timeZone: 'America/Bogota',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}. ID del evento: ${response.data.id}`;
    } catch (error) {
      return `❌ Error al crear evento: ${error.message}`;
    }
  },
  {
    name: "create_calendar_event",
    description: "Crea un nuevo evento en Google Calendar",
    schema: z.object({
      summary: z.string().describe("Título o resumen del evento"),
      description: z.string().optional().describe("Descripción detallada del evento"),
      startTime: z.string().describe("Fecha y hora de inicio (puede ser ISO format o descripción como 'mañana a las 10am')"),
      durationMinutes: z.number().default(60).describe("Duración del evento en minutos"),
    }),
  }
);

// Herramienta para ver eventos
const viewCalendarEventsTool = tool(
  async ({ days }) => {
    try {
      const calendar = createCalendarClient();
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(
        now.getTime() + days * 24 * 60 * 60 * 1000
      ).toISOString();
      
      const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      if (events.length === 0) {
        return `📅 No hay eventos programados en los próximos ${days} días.`;
      }

      const eventList = events.map(event => {
        const start = event.start.dateTime || event.start.date;
        const startDate = new Date(start);
        return `  • ${event.summary}: ${startDate.toLocaleString('es-CO', { 
          timeZone: 'America/Bogota',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }).join('\n');

      return `📅 Eventos en los próximos ${days} días:\n${eventList}`;
    } catch (error) {
      return `❌ Error al obtener eventos: ${error.message}`;
    }
  },
  {
    name: "view_calendar_events",
    description: "Muestra los próximos eventos del calendario",
    schema: z.object({
      days: z.number().default(7).describe("Número de días hacia adelante para buscar eventos"),
    }),
  }
);

// Herramienta adicional: buscar eventos específicos
const searchCalendarEventsTool = tool(
  async ({ searchQuery, days }) => {
    try {
      const calendar = createCalendarClient();
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(
        now.getTime() + days * 24 * 60 * 60 * 1000
      ).toISOString();
      
      const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        q: searchQuery, // Búsqueda por texto
      });

      const events = response.data.items || [];
      
      if (events.length === 0) {
        return `🔍 No se encontraron eventos que contengan "${searchQuery}" en los próximos ${days} días.`;
      }

      const eventList = events.map(event => {
        const start = event.start.dateTime || event.start.date;
        return `  • ${event.summary}: ${new Date(start).toLocaleString('es-CO', { 
          timeZone: 'America/Bogota',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }).join('\n');

      return `🔍 Eventos que contienen "${searchQuery}":\n${eventList}`;
    } catch (error) {
      return `❌ Error al buscar eventos: ${error.message}`;
    }
  },
  {
    name: "search_calendar_events",
    description: "Busca eventos específicos en el calendario por texto",
    schema: z.object({
      searchQuery: z.string().describe("Texto a buscar en los eventos"),
      days: z.number().default(30).describe("Número de días hacia adelante para buscar"),
    }),
  }
);
  

export const calendarTools = [
  createCalendarEventTool,
  viewCalendarEventsTool,
  searchCalendarEventsTool,
];

  