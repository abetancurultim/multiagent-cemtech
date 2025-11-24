import PdfPrinter from 'pdfmake';
import path from 'path';
import { supabase } from '../config/supabase';

// Configuración de fuentes para PDFMake
// Asegúrate de tener la carpeta 'fonts' en la raíz del proyecto con estos archivos
const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf'),
    bold: path.join(process.cwd(), 'fonts', 'Roboto-Medium.ttf'),
    italics: path.join(process.cwd(), 'fonts', 'Roboto-Italic.ttf'),
    bolditalics: path.join(process.cwd(), 'fonts', 'Roboto-MediumItalic.ttf')
  }
};

export const pdfService = {
  async generateEstimationPdf(estimationId: string): Promise<Buffer> {
    try {
      // 1. Obtener datos de Supabase
      const { data: estimation, error } = await supabase
        .from('estimations')
        .select(`
          *,
          client:clients (
            name,
            address,
            email,
            phone
          ),
          items:estimation_items (
            description,
            quantity,
            unit,
            unit_cost,
            line_total
          )
        `)
        .eq('id', estimationId)
        .single();

      if (error || !estimation) {
        throw new Error(`Error fetching estimation: ${error?.message || 'Not found'}`);
      }

      const client = (estimation as any).client || {};
      const items = ((estimation as any).items || []) as any[];

      // 2. Construir el Document Definition
      const docDefinition: any = {
        content: [
          { text: 'CEMTECH ESTIMATION', style: 'header' },
          {
            text: [
              `Estimation #: ${estimation.sequential_number}\n`,
              `Date: ${new Date().toLocaleDateString()}\n`,
              `ID: ${estimation.id}\n\n`
            ],
            style: 'subheader'
          },
          {
            text: 'Client Information:',
            style: 'sectionHeader'
          },
          {
            text: [
              `Name: ${client?.name || 'N/A'}\n`,
              `Address: ${client?.address || 'N/A'}\n`,
              `Phone: ${client?.phone || 'N/A'}\n`,
              `Email: ${client?.email || 'N/A'}\n\n`
            ]
          },
          {
            text: 'Items:',
            style: 'sectionHeader',
            margin: [0, 10, 0, 5]
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Description', style: 'tableHeader' },
                  { text: 'Qty', style: 'tableHeader' },
                  { text: 'Unit', style: 'tableHeader' },
                  { text: 'Unit Price', style: 'tableHeader' },
                  { text: 'Total', style: 'tableHeader' }
                ],
                ...items.map(item => [
                  item.description || '',
                  item.quantity?.toString() || '0',
                  item.unit || '',
                  `$${item.unit_cost?.toFixed(2) || '0.00'}`,
                  `$${item.line_total?.toFixed(2) || '0.00'}`
                ])
              ]
            }
          },
          {
            text: `Net Total: $${estimation.net_total?.toFixed(2) || '0.00'}`,
            style: 'total',
            alignment: 'right',
            margin: [0, 20, 0, 0]
          }
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 12,
            margin: [0, 0, 0, 20]
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: 'black'
          },
          total: {
            fontSize: 16,
            bold: true
          }
        },
        defaultStyle: {
          font: 'Roboto'
        }
      };

      // 3. Generar PDF
      const printer = new PdfPrinter(fonts);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err) => reject(err));
        pdfDoc.end();
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }
};
