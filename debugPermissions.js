import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function debugCalendarPermissions() {
  console.log("🔍 Diagnóstico de permisos y configuración del calendario\n");
  console.log("=".repeat(60));

  try {
    // Crear cliente de autenticación
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // 1. Verificar información del calendario
    console.log("\n1️⃣ Información del calendario:");
    try {
      const calendarInfo = await calendar.calendars.get({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
      });
      
      console.log("   ✅ Calendario encontrado:");
      console.log("   - Nombre:", calendarInfo.data.summary);
      console.log("   - Zona horaria:", calendarInfo.data.timeZone);
      console.log("   - Descripción:", calendarInfo.data.description || "Sin descripción");
    } catch (error) {
      console.error("   ❌ Error al obtener información del calendario:", error.message);
    }

    // 2. Verificar permisos ACL
    console.log("\n2️⃣ Permisos del calendario (ACL):");
    try {
      const aclList = await calendar.acl.list({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
      });
      
      console.log("   Reglas de acceso encontradas:");
      aclList.data.items.forEach(rule => {
        console.log(`   - ${rule.scope.type}: ${rule.scope.value || 'default'} → Rol: ${rule.role}`);
      });

      // Buscar permisos de la cuenta de servicio
      const serviceAccountRule = aclList.data.items.find(
        rule => rule.scope.value === process.env.GOOGLE_CALENDAR_CLIENT_EMAIL
      );

      if (serviceAccountRule) {
        console.log(`\n   ✅ La cuenta de servicio tiene rol: ${serviceAccountRule.role}`);
        if (serviceAccountRule.role !== 'owner' && serviceAccountRule.role !== 'writer') {
          console.log("   ⚠️  ADVERTENCIA: La cuenta necesita rol 'writer' u 'owner' para enviar invitaciones");
        }
      } else {
        console.log("\n   ❌ La cuenta de servicio NO tiene permisos explícitos en este calendario");
      }
    } catch (error) {
      console.error("   ❌ Error al verificar permisos:", error.message);
    }

    // 3. Probar creación de evento simple (sin invitados)
    console.log("\n3️⃣ Prueba de creación de evento SIN invitados:");
    try {
      const testEvent = {
        summary: "Evento de prueba - Sin invitados",
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Bogota',
        },
      };

      const result = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        requestBody: testEvent,
      });

      console.log("   ✅ Evento creado exitosamente:", result.data.id);
      
      // Eliminar evento de prueba
      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        eventId: result.data.id,
      });
      console.log("   🗑️  Evento de prueba eliminado");
    } catch (error) {
      console.error("   ❌ Error al crear evento simple:", error.message);
    }

    // 4. Probar creación de evento CON invitados
    console.log("\n4️⃣ Prueba de creación de evento CON invitados:");
    try {
      const testEventWithAttendees = {
        summary: "Evento de prueba - Con invitados",
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Bogota',
        },
        attendees: [
          { email: "jbetancur@unisbc.edu.co" }
        ],
      };

      const result = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        requestBody: testEventWithAttendees,
        sendUpdates: 'all',
      });

      console.log("   ✅ Evento con invitados creado:", result.data.id);
      console.log("   📧 Invitados:", result.data.attendees?.map(a => a.email).join(', '));
      
      // Eliminar evento de prueba
      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
        eventId: result.data.id,
        sendUpdates: 'all',
      });
      console.log("   🗑️  Evento de prueba eliminado");
    } catch (error) {
      console.error("   ❌ Error al crear evento con invitados:", error.message);
      console.error("   Detalles del error:", error.response?.data || error);
    }

    // 5. Verificar configuración del calendario
    console.log("\n5️⃣ Configuración del calendario:");
    try {
      const settings = await calendar.calendarList.get({
        calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
      });
      
      console.log("   - Acceso por defecto:", settings.data.defaultReminders);
      console.log("   - Color:", settings.data.backgroundColor);
      console.log("   - Seleccionado:", settings.data.selected);
      console.log("   - Primario:", settings.data.primary || false);
    } catch (error) {
      console.error("   ❌ Error al obtener configuración:", error.message);
    }

    // Recomendaciones
    console.log("\n📋 RECOMENDACIONES:");
    console.log("=".repeat(60));
    console.log("\nSi no puedes enviar invitaciones, intenta estos pasos:");
    console.log("\n1. En Google Calendar (interfaz web):");
    console.log("   - Ve a Configuración → Configuración del calendario");
    console.log("   - Selecciona tu calendario");
    console.log("   - En 'Compartir con personas específicas'");
    console.log("   - Agrega:", process.env.GOOGLE_CALENDAR_CLIENT_EMAIL);
    console.log("   - Asigna permisos: 'Realizar cambios y administrar el uso compartido'");
    
    console.log("\n2. Verifica que el calendario NO sea:");
    console.log("   - Un calendario de solo lectura");
    console.log("   - Un calendario de recursos (sala de reuniones)");
    console.log("   - Un calendario con restricciones de dominio");
    
    console.log("\n3. Si es un Google Workspace:");
    console.log("   - Puede haber políticas que restringen invitaciones externas");
    console.log("   - Contacta al administrador de Google Workspace");
    
    console.log("\n4. Alternativa - Crear calendario dedicado:");
    console.log("   - Crea un nuevo calendario en Google Calendar");
    console.log("   - Compártelo con la cuenta de servicio como 'Propietario'");
    console.log("   - Actualiza GOOGLE_CALENDAR_CALENDAR_ID en .env");

  } catch (error) {
    console.error("\n❌ Error general:", error.message);
  }
}

// Ejecutar diagnóstico
debugCalendarPermissions().catch(console.error);