import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type Order = {
  customerId: string;
  customerName: string;
  products: { id: string; name: string; quantity: number; price: number }[];
  orderDate: string;
  status: string;
  trackingNumber: string;
  totalAmount: number;
  shippingAddress: string;
  estimatedDelivery?: string;
  deliveredDate?: string;
};

// Crear servidor MCP para atención al cliente
const server = new McpServer({
  name: "customer-server",
  version: "1.0.0",
});

// Base de datos simulada de órdenes
const ORDERS: Record<string, Order> = {
  "ORD-2024-001": {
    customerId: "CUST001",
    customerName: "María González",
    products: [
      {
        id: "PAN001",
        name: "TA-Mixer 80 (Amasadora Industrial)",
        quantity: 1,
        price: 3200000,
      },
      {
        id: "PAN003",
        name: "HornoMaster 90 (Horno Rotativo)",
        quantity: 1,
        price: 5400000,
      },
    ],
    orderDate: "2024-11-15",
    status: "en_proceso",
    trackingNumber: "IEA123456789",
    totalAmount: 8600000,
    shippingAddress: "Calle 123 #45-67, Bogotá",
    estimatedDelivery: "2024-11-20",
  },
  "ORD-2024-002": {
    customerId: "CUST002",
    customerName: "Carlos Rodríguez",
    products: [
      {
        id: "CAR001",
        name: "CutterPro 3000 (Cutter Cárnico)",
        quantity: 1,
        price: 4500000,
      },
    ],
    orderDate: "2024-11-10",
    status: "entregado",
    trackingNumber: "IEA987654321",
    totalAmount: 4500000,
    shippingAddress: "Carrera 45 #12-34, Medellín",
    deliveredDate: "2024-11-18",
  },
};

// Base de datos de preguntas frecuentes
const FAQ_DATABASE = {
  formas_pago: {
    keywords: [
      "pago",
      "pagar",
      "tarjeta",
      "efectivo",
      "transferencia",
      "financiación",
    ],
    answer: `💳 FORMAS DE PAGO DISPONIBLES:

✅ Tarjetas de Crédito:
   • Visa, Mastercard, American Express
   • Hasta 36 cuotas sin interés
   • Pago en línea seguro

✅ Transferencia Bancaria:
   • Bancolombia: 123-456789-01
   • Banco de Bogotá: 987-654321-02
   • Davivienda: 555-123456-03

✅ Efectivo:
   • Pago contra entrega
   • Recargo del 5% por manejo

✅ Financiación:
   • Crédito directo hasta 24 meses
   • Tasa preferencial del 1.2% mensual
   • Aprobación en 24 horas

📞 Asesoría financiera: +57 1 234 5678 ext. 5`,
    category: "pagos",
  },
  tiempos_entrega: {
    keywords: ["entrega", "envío", "demora", "cuánto tarda", "cuando llega"],
    answer: `🚚 TIEMPOS DE ENTREGA:

📦 Equipos en stock:
   • Bogotá: 1-2 días hábiles
   • Principales ciudades: 2-3 días hábiles
   • Municipios: 3-5 días hábiles

⏱️ Equipos bajo pedido:
   • Tiempo adicional: 7-10 días hábiles
   • Notificación de disponibilidad por email/SMS

🛠️ Instalación incluida:
   • Programación: 1-2 días después de entrega
   • Horarios: Lunes a sábado 8:00 AM - 5:00 PM

📱 Seguimiento:
   • Número de tracking por SMS
   • Consulta en línea: induequipos.com/tracking
   • WhatsApp: +57 300 123 4567`,
    category: "logistica",
  },
  garantia_productos: {
    keywords: ["garantía", "garantia", "defecto", "falla", "reparación"],
    answer: `🛡️ GARANTÍA DE EQUIPOS:

⏰ Períodos de garantía:
   • Amasadoras y hornos: 2 años
   • Cutters y embutidoras: 3 años
   • Templadoras y refinadoras: 2 años
   • Accesorios: 1 año

✅ Cobertura incluye:
   • Defectos de fabricación
   • Fallas técnicas
   • Repuestos originales
   • Mano de obra especializada

❌ No cubre:
   • Daños por mal uso
   • Daños por agua/humedad
   • Modificaciones no autorizadas
   • Desgaste normal

📞 Reclamaciones: garantias@induequipos.com
🔧 Soporte técnico: +57 1 234 5678 ext. 3`,
    category: "garantias",
  },
  instalacion_productos: {
    keywords: [
      "instalación",
      "instalar",
      "técnico",
      "montaje",
      "configuración",
    ],
    answer: `🔧 SERVICIO DE INSTALACIÓN:

✅ Instalación profesional incluida:
   • Todos los equipos requieren instalación
   • Técnicos certificados
   • Garantía de instalación: 1 año

📅 Programación:
   • Contacto dentro de 24 horas post-entrega
   • Horarios flexibles: Lunes a sábado
   • Servicio de emergencia disponible

💰 Costos adicionales:
   • Materiales especiales (cables, ductos)
   • Trabajos en altura (andamios)
   • Configuración de red avanzada

📋 Incluye:
   • Evaluación del sitio
   • Instalación completa
   • Configuración y pruebas
   • Capacitación básica al usuario
   • Manual de operación

📞 Programar cita: +57 1 234 5678 ext. 2`,
    category: "instalacion",
  },
};

// Herramienta para consultar FAQ
server.registerTool(
  "search_faq",
  {
    title: "Buscador de Preguntas Frecuentes",
    description:
      "Busca respuestas en la base de conocimientos de preguntas frecuentes",
    inputSchema: {
      query: z.string().describe("Pregunta o palabras clave a buscar"),
      category: z
        .enum(["todas", "pagos", "logistica", "garantias", "instalacion"])
        .optional()
        .default("todas")
        .describe("Categoría específica de búsqueda"),
    },
  },
  async ({ query, category }) => {
    const queryLower = query.toLowerCase();
    let matches = [];

    for (const [key, faq] of Object.entries(FAQ_DATABASE)) {
      // Filtrar por categoría si se especifica
      if (category !== "todas" && faq.category !== category) continue;

      // Buscar coincidencias en keywords
      const keywordMatches = faq.keywords.filter(
        (keyword) =>
          queryLower.includes(keyword) || keyword.includes(queryLower)
      );

      if (keywordMatches.length > 0) {
        matches.push({
          key,
          faq,
          relevance: keywordMatches.length,
          matchedKeywords: keywordMatches,
        });
      }
    }

    // Ordenar por relevancia
    matches.sort((a, b) => b.relevance - a.relevance);

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text:
              `❓ No se encontraron respuestas para: "${query}"\n\n` +
              `🔍 Sugerencias:\n` +
              `   • Intente con palabras más generales\n` +
              `   • Revise la ortografía\n` +
              `   • Use sinónimos\n\n` +
              `📋 Categorías disponibles:\n` +
              `   • Pagos y financiación\n` +
              `   • Tiempos de entrega\n` +
              `   • Garantías\n` +
              `   • Instalación\n\n` +
              `👥 Contacto directo:\n` +
              `   • Chat en vivo: fenixproducciones.com\n` +
              `   • WhatsApp: +57 300 123 4567\n` +
              `   • Email: info@fenixproducciones.com`,
          },
        ],
      };
    }

    // Mostrar la respuesta más relevante
    const bestMatch = matches[0];

    return {
      content: [
        {
          type: "text",
          text:
            `❓ Pregunta: "${query}"\n` +
            `🎯 Palabras clave encontradas: ${bestMatch.matchedKeywords.join(
              ", "
            )}\n` +
            `📊 Relevancia: ${bestMatch.relevance} coincidencias\n\n` +
            `${bestMatch.faq.answer}\n\n` +
            (matches.length > 1
              ? `📚 Otras respuestas relacionadas disponibles:\n` +
                matches
                  .slice(1, 3)
                  .map(
                    (match) =>
                      `   • ${match.key.replace(/_/g, " ")} (${
                        match.relevance
                      } coincidencias)`
                  )
                  .join("\n") +
                "\n\n"
              : "") +
            `💬 ¿Esta respuesta resolvió su consulta?\n` +
            `   Para más información contacte: +57 1 234 5678`,
        },
      ],
    };
  }
);

// Herramienta para rastrear órdenes
server.registerTool(
  "track_order",
  {
    title: "Rastreador de Órdenes",
    description: "Rastrea el estado y ubicación de una orden de compra",
    inputSchema: {
      identifier: z
        .string()
        .describe(
          "Número de orden (ORD-XXXX-XXX) o número de tracking (IEXXXXXXXX)"
        ),
    },
  },
  async ({ identifier }) => {
    // Buscar por número de orden o tracking
    let foundOrder = null;
    let orderKey = "";

    if (identifier.startsWith("ORD-")) {
      foundOrder = ORDERS[identifier as keyof typeof ORDERS];
      orderKey = identifier;
    } else {
      // Buscar por tracking number
      for (const [key, order] of Object.entries(ORDERS)) {
        if (order.trackingNumber === identifier) {
          foundOrder = order;
          orderKey = key;
          break;
        }
      }
    }

    if (!foundOrder) {
      return {
        content: [
          {
            type: "text",
            text:
              `❌ No se encontró la orden: ${identifier}\n\n` +
              `🔍 Verifique que el número sea correcto:\n` +
              `   • Número de orden: ORD-2024-XXX\n` +
              `   • Número de tracking: IEXXXXXXXXX\n\n` +
              `📧 Si el problema persiste:\n` +
              `   • Email: ordenes@fenixproducciones.com\n` +
              `   • Teléfono: +57 1 234 5678 ext. 1\n` +
              `   • Incluya: nombre completo y fecha de compra`,
          },
        ],
        isError: true,
      };
    }

    // Generar estados de tracking simulados
    const trackingEvents = [];
    const orderDate = new Date(foundOrder.orderDate);

    trackingEvents.push({
      date: foundOrder.orderDate,
      time: "09:30 AM",
      status: "Orden confirmada",
      location: "Centro de procesamiento - Bogotá",
      description: "Orden recibida y confirmada. Iniciando preparación.",
    });

    if (foundOrder.status !== "cancelado") {
      const prepDate = new Date(orderDate);
      prepDate.setDate(prepDate.getDate() + 1);

      trackingEvents.push({
        date: prepDate.toISOString().split("T")[0],
        time: "02:15 PM",
        status: "En preparación",
        location: "Almacén principal - Bogotá",
        description: "Productos seleccionados y empacados.",
      });
    }

    if (
      foundOrder.status === "en_transito" ||
      foundOrder.status === "entregado"
    ) {
      const shipDate = new Date(orderDate);
      shipDate.setDate(shipDate.getDate() + 2);

      trackingEvents.push({
        date: shipDate.toISOString().split("T")[0],
        time: "08:45 AM",
        status: "En tránsito",
        location: "Centro de distribución",
        description: "Paquete en camino hacia destino final.",
      });
    }

    if (foundOrder.status === "entregado" && foundOrder.deliveredDate) {
      trackingEvents.push({
        date: foundOrder.deliveredDate,
        time: "03:20 PM",
        status: "Entregado",
        location: foundOrder.shippingAddress,
        description: "Paquete entregado exitosamente.",
      });
    }

    const statusEmojis = {
      pendiente: "⏳",
      en_proceso: "🔄",
      en_transito: "🚚",
      entregado: "✅",
      cancelado: "❌",
    };

    const totalProducts = foundOrder.products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    return {
      content: [
        {
          type: "text",
          text:
            `📦 SEGUIMIENTO DE ORDEN\n\n` +
            `🆔 Número de orden: ${orderKey}\n` +
            `📱 Tracking: ${foundOrder.trackingNumber}\n` +
            `👤 Cliente: ${foundOrder.customerName}\n` +
            `📅 Fecha de orden: ${foundOrder.orderDate}\n` +
            `📊 Estado actual: ${
              statusEmojis[foundOrder.status as keyof typeof statusEmojis]
            } ${foundOrder.status.toUpperCase()}\n\n` +
            `🛍️ PRODUCTOS ORDENADOS (${totalProducts} items):\n` +
            foundOrder.products
              .map(
                (product) =>
                  `   📦 ${product.name} (${product.id})\n` +
                  `      Cantidad: ${
                    product.quantity
                  } | Precio: $${product.price.toLocaleString()}`
              )
              .join("\n") +
            "\n\n" +
            `💰 RESUMEN FINANCIERO:\n` +
            `   • Subtotal: $${foundOrder.totalAmount.toLocaleString()}\n` +
            `   • Envío: GRATIS\n` +
            `   • Total: $${foundOrder.totalAmount.toLocaleString()}\n\n` +
            `📍 DIRECCIÓN DE ENTREGA:\n` +
            `   ${foundOrder.shippingAddress}\n\n` +
            `🚚 HISTORIAL DE TRACKING:\n` +
            trackingEvents
              .reverse()
              .map(
                (event) =>
                  `   📅 ${event.date} - ${event.time}\n` +
                  `   📍 ${event.location}\n` +
                  `   ✅ ${event.status}: ${event.description}\n`
              )
              .join("\n") +
            "\n" +
            (foundOrder.status === "entregado" && foundOrder.deliveredDate
              ? `🎉 ¡ORDEN ENTREGADA EXITOSAMENTE!\n` +
                `📅 Fecha de entrega: ${foundOrder.deliveredDate}\n` +
                `⭐ Califique su experiencia: fenixproducciones.com/review\n\n`
              : foundOrder.status === "en_transito"
              ? `🚚 SU ORDEN ESTÁ EN CAMINO\n` +
                `📅 Entrega estimada: ${foundOrder.estimatedDelivery}\n` +
                `📱 Recibirá SMS cuando esté cerca\n\n`
              : `⏳ SU ORDEN ESTÁ EN PROCESO\n` +
                `📅 Entrega estimada: ${foundOrder.estimatedDelivery}\n` +
                `🔔 Le notificaremos cambios de estado\n\n`) +
            `📞 CONTACTO Y SOPORTE:\n` +
            `   • Seguimiento: +57 1 234 5678 ext. 1\n` +
            `   • WhatsApp: +57 300 123 4567\n` +
            `   • Email: ordenes@fenixproducciones.com\n` +
            `   • Web: fenixproducciones.com/track`,
        },
      ],
    };
  }
);

// Herramienta para gestionar quejas y reclamos
server.registerTool(
  "file_complaint",
  {
    title: "Sistema de Quejas y Reclamos",
    description:
      "Registra y gestiona quejas, reclamos y sugerencias de clientes",
    inputSchema: {
      customerName: z.string().describe("Nombre completo del cliente"),
      customerEmail: z.string().email().describe("Email de contacto"),
      customerPhone: z.string().describe("Teléfono de contacto"),
      complaintType: z
        .enum([
          "producto_defectuoso",
          "servicio_tecnico",
          "entrega_tardía",
          "facturación",
          "atención_cliente",
          "garantía",
          "otro",
        ])
        .describe("Tipo de queja o reclamo"),
      description: z.string().describe("Descripción detallada del problema"),
      orderNumber: z
        .string()
        .optional()
        .describe("Número de orden relacionada (si aplica)"),
      urgency: z
        .enum(["baja", "media", "alta", "critica"])
        .optional()
        .default("media")
        .describe("Nivel de urgencia"),
    },
  },
  async ({
    customerName,
    customerEmail,
    customerPhone,
    complaintType,
    description,
    orderNumber,
    urgency,
  }) => {
    const complaintId = `QR-${Date.now()}`;
    const currentDate = new Date().toISOString().split("T")[0];

    // Categorizar el tipo de queja
    const complaintCategories = {
      producto_defectuoso: {
        department: "Control de Calidad",
        expectedResolution: "3-5 días hábiles",
        priority: "Alta",
        followUpActions: [
          "Evaluación técnica del producto",
          "Reemplazo o reparación según garantía",
          "Seguimiento post-resolución",
        ],
      },
      servicio_tecnico: {
        department: "Soporte Técnico",
        expectedResolution: "1-2 días hábiles",
        priority: "Alta",
        followUpActions: [
          "Revisión del caso técnico",
          "Reprogramación de servicio si es necesario",
          "Capacitación adicional al técnico",
        ],
      },
      entrega_tardía: {
        department: "Logística",
        expectedResolution: "24-48 horas",
        priority: "Media",
        followUpActions: [
          "Rastreo detallado del envío",
          "Coordinación con transportadora",
          "Compensación por demora si aplica",
        ],
      },
      facturación: {
        department: "Contabilidad",
        expectedResolution: "2-3 días hábiles",
        priority: "Media",
        followUpActions: [
          "Revisión de facturación",
          "Corrección de errores",
          "Emisión de nota crédito si aplica",
        ],
      },
      atención_cliente: {
        department: "Servicio al Cliente",
        expectedResolution: "1 día hábil",
        priority: urgency === "critica" ? "Crítica" : "Media",
        followUpActions: [
          "Revisión del proceso de atención",
          "Capacitación del personal",
          "Seguimiento personalizado",
        ],
      },
      garantía: {
        department: "Garantías",
        expectedResolution: "3-7 días hábiles",
        priority: "Alta",
        followUpActions: [
          "Verificación de términos de garantía",
          "Programación de servicio técnico",
          "Procesamiento de reclamación",
        ],
      },
      otro: {
        department: "Dirección General",
        expectedResolution: "5 días hábiles",
        priority: "Media",
        followUpActions: [
          "Evaluación del caso",
          "Asignación al departamento apropiado",
          "Seguimiento especializado",
        ],
      },
    };

    const category = complaintCategories[complaintType];

    // Simular asignación de agente
    const agents = [
      "Ana Martínez - Supervisora de Calidad",
      "Carlos López - Coordinador Técnico",
      "María Rodríguez - Especialista en Atención",
      "Luis González - Gerente de Logística",
    ];

    const assignedAgent = agents[Math.floor(Math.random() * agents.length)];

    return {
      content: [
        {
          type: "text",
          text:
            `📝 QUEJA/RECLAMO REGISTRADO EXITOSAMENTE\n\n` +
            `🆔 Número de caso: ${complaintId}\n` +
            `📅 Fecha de registro: ${currentDate}\n` +
            `👤 Cliente: ${customerName}\n` +
            `📧 Email: ${customerEmail}\n` +
            `📞 Teléfono: ${customerPhone}\n` +
            `🏷️ Tipo: ${complaintType.replace(/_/g, " ").toUpperCase()}\n` +
            `🚨 Urgencia: ${urgency.toUpperCase()}\n` +
            (orderNumber ? `📦 Orden relacionada: ${orderNumber}\n` : "") +
            "\n" +
            `📋 DESCRIPCIÓN DEL PROBLEMA:\n` +
            `"${description}"\n\n` +
            `🏢 INFORMACIÓN DE PROCESAMIENTO:\n` +
            `   • Departamento asignado: ${category.department}\n` +
            `   • Agente responsable: ${assignedAgent}\n`,
        },
      ],
    };
  }
);

// Herramienta para información general de la empresa
server.registerTool(
  "get_company_info",
  {
    title: "Información de la Empresa",
    description:
      "Proporciona información general sobre InduEquipos Andina S.A.S.",
    inputSchema: {
      infoType: z
        .enum([
          "general",
          "contacto",
          "horarios",
          "ubicaciones",
          "servicios",
          "historia",
        ])
        .describe("Tipo de información solicitada"),
    },
  },
  async ({ infoType }) => {
    const companyInfo = {
      general: `🏢 INDU-EQUIPOS ANDINA S.A.S.

🎯 MISIÓN:
Impulsar el crecimiento de la industria alimentaria y agroindustrial en Colombia y Latinoamérica, ofreciendo equipos y soluciones tecnológicas de alta calidad para panadería, cárnicos, chocolates, agroindustria, horeca y vending.

👁️ VISIÓN:
Ser el aliado estratégico líder en innovación, servicio y respaldo para productores, emprendedores y empresas del sector alimentario y de servicios.

⭐ VALORES:
• Compromiso con el cliente
• Innovación y mejora continua
• Calidad y confiabilidad
• Sostenibilidad y responsabilidad social
• Cercanía y acompañamiento permanente

🏆 CERTIFICACIONES:
• ISO 9001:2015 - Gestión de Calidad
• Certificación Carbono Neutro
• Miembro de la Asociación Colombiana de Panadería y Cárnicos`,

      contacto: `📞 INFORMACIÓN DE CONTACTO

🏢 OFICINA PRINCIPAL:
   📍 Calle 45 #12-34, Bogotá D.C.
   📞 Teléfono: +57 1 234 5678
   📧 Email: info@induequipos.com
   🌐 Web: www.induequipos.com

📱 LÍNEAS ESPECIALIZADAS:
   🛍️ Ventas: ext. 1 | ventas@induequipos.com
   🔧 Soporte técnico: ext. 2 | soporte@induequipos.com
   🛡️ Garantías: ext. 3 | garantias@induequipos.com
   📚 Documentación: ext. 4 | documentos@induequipos.com
   💳 Financiación: ext. 5 | credito@induequipos.com
   📝 Quejas/Reclamos: ext. 9 | quejas@induequipos.com

📲 REDES SOCIALES:
   WhatsApp: +57 300 123 4567
   Facebook: @InduEquiposAndina
   Instagram: @induequiposandina
   LinkedIn: InduEquipos Andina S.A.S.`,

      horarios: `🕐 HORARIOS DE ATENCIÓN

🏢 OFICINAS ADMINISTRATIVAS:
   📅 Lunes a Viernes: 8:00 AM - 6:00 PM
   📅 Sábados: 8:00 AM - 1:00 PM
   📅 Domingos y festivos: Cerrado

🔧 SOPORTE TÉCNICO:
   📅 Lunes a Viernes: 7:00 AM - 7:00 PM
   📅 Sábados: 8:00 AM - 4:00 PM
   📅 Emergencias 24/7: +57 300 999 7777

🛍️ VENTAS Y ASESORÍA:
   📅 Lunes a Viernes: 8:00 AM - 6:00 PM
   📅 Sábados: 8:00 AM - 2:00 PM
   💬 Chat en línea: 24/7

📱 WHATSAPP EMPRESARIAL:
   📅 Lunes a Domingo: 7:00 AM - 10:00 PM
   🤖 Respuesta automática: 24/7

🎄 HORARIOS ESPECIALES:
   • Diciembre: Horario extendido hasta 8:00 PM
   • Enero: Horario reducido primera semana`,

      ubicaciones: `📍 NUESTRAS UBICACIONES

🏢 SEDE PRINCIPAL - BOGOTÁ:
   📍 Calle 45 #12-34, Chapinero
   📞 +57 1 234 5678
   🚗 Parqueadero disponible
   🚇 TransMilenio: Estación Calle 45

🏪 SUCURSAL MEDELLÍN:
   📍 Carrera 70 #52-20, Laureles
   📞 +57 4 567 8901
   🅿️ Zona de parqueo público

🏪 SUCURSAL CALI:
   📍 Avenida 6N #28-10, Granada
   📞 +57 2 345 6789
   🚌 Cerca al terminal de transporte

🏪 SUCURSAL BARRANQUILLA:
   📍 Carrera 53 #75-45, El Prado
   📞 +57 5 123 4567
   🏖️ Atención zona Caribe

🚚 CENTROS DE DISTRIBUCIÓN:
   • Bogotá: Zona Industrial Puente Aranda
   • Medellín: Zona Franca de Rionegro
   • Cali: Parque Industrial Acopi Yumbo

📦 COBERTURA NACIONAL:
   ✅ Principales ciudades con servicio directo
   ✅ Municipios mediante aliados estratégicos`,

      servicios: `🛠️ NUESTROS SERVICIOS

📦 PRODUCTOS:
   🍞 Equipos para panadería (amasadoras, hornos, divisoras, fermentadoras)
   🥩 Equipos para cárnicos (cutters, embutidoras, sierras, picadoras)
   🍫 Equipos para chocolates (templadoras, refinadoras, moldes)
   🌽 Agroindustria (despulpadoras, molinos, clasificadoras)
   🏨 Horeca (vitrinas, hornos, freidoras, licuadoras industriales)
   🥤 Vending (máquinas expendedoras, dispensadores, equipos de empaque)

🔧 SERVICIOS TÉCNICOS:
   • Diseño e instalación profesional
   • Mantenimiento preventivo y correctivo
   • Actualización de equipos
   • Soporte técnico 24/7 para emergencias
   • Capacitación a usuarios

💰 SERVICIOS FINANCIEROS:
   • Crédito directo hasta 36 meses
   • Leasing para empresas
   • Seguros para equipos instalados
   • Planes de mantenimiento prepagado

📚 SERVICIOS ADICIONALES:
   • Asesoría en procesos productivos
   • Auditorías de eficiencia
   • Integración de soluciones
   • Monitoreo remoto
   • Respaldo y garantía extendida`,

      historia: `📜 NUESTRA HISTORIA

🚀 2012 - FUNDACIÓN:
   Nacimos en Bogotá con la visión de transformar la industria alimentaria y de servicios en Colombia, acercando tecnología de punta a pequeños y grandes productores.

📈 2014-2017 - CRECIMIENTO:
   • Expansión a Medellín y Cali
   • Alianzas con fabricantes internacionales
   • Equipo de 50 colaboradores

🏆 2018-2020 - CONSOLIDACIÓN:
   • Certificación ISO 9001
   • Apertura de sucursal en Barranquilla
   • Lanzamiento de servicio técnico 24/7
   • 10,000+ clientes satisfechos

🌟 2021-2023 - INNOVACIÓN:
   • Implementación de soluciones IoT
   • Desarrollo de app móvil propia
   • Servicio de monitoreo remoto
   • Expansión a 20 ciudades

🔮 2024-PRESENTE - TRANSFORMACIÓN DIGITAL:
   • Plataforma de e-commerce
   • Inteligencia artificial en soporte
   • Sostenibilidad ambiental
   • +30,000 clientes atendidos

🎯 LOGROS DESTACADOS:
   • Empresa del año en equipos alimentarios 2023
   • Certificación Carbono Neutro
   • 98% satisfacción del cliente
   • 0 accidentes laborales en 3 años`,
    };

    return {
      content: [
        {
          type: "text",
          text:
            companyInfo[infoType] +
            "\n\n" +
            `📞 Para más información:\n` +
            `   • Teléfono: +57 1 234 5678\n` +
            `   • Email: info@induequipos.com\n` +
            `   • Web: www.induequipos.com`,
        },
      ],
    };
  }
);
