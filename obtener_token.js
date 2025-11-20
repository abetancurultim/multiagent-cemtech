// obtener_token.js
import { google } from "googleapis";
import http from "http";
import url from "url";
import open from "open";

// ABRE EL ARCHIVO JSON QUE DESCARGASTE Y PEGA LOS DATOS AQUÍ
const credentials = {
  client_id: "",
  client_secret: "",
  redirect_uri: "http://localhost:3030/oauth2callback", // Debe ser la misma que pusiste en la consola
};

const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uri
);

// Estos son los "permisos" que pides. Para el toolkit, necesitas todos estos:
const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
];

const server = http.createServer(async (req, res) => {
  // El servidor solo escucha en la ruta de callback
  if (req.url.includes("/oauth2callback")) {
    const qs = new url.URL(req.url, "http://localhost:3030").searchParams;
    const code = qs.get("code");
    res.end("¡Listo! Ya tienes el código. Revisa la consola donde ejecutaste el script.");
    server.close();

    // Intercambia el código por el token
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n\n✅ ¡Autenticación completada con éxito! ✅\n");
    console.log("Este es tu REFRESH TOKEN. Cópialo y guárdalo en tu archivo .env");
    console.log("👇👇👇👇👇👇");
    console.log(tokens.refresh_token);
    console.log("👆👆👆👆👆👆\n");
  }
});

server.listen(3030, () => {
  // Genera la URL a la que debes ir
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Pide el refresh_token
    scope: scopes,
    prompt: "consent", // Fuerza que siempre pida consentimiento para asegurar el refresh_token
  });
  console.log(`\nPASO 1: Abre la siguiente URL en tu navegador:\n\n${authorizeUrl}\n`);
  open(authorizeUrl);
});

console.log("Servidor temporal iniciado en el puerto 3023 para capturar el token...");