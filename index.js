const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
    default: pantryConnect,
    useMultiFileAuthState,
    DisconnectReason,
  } = require("@whiskeysockets/baileys");
  const pino = require("pino");
  const fs = require('fs');
  require('dotenv').configDotenv()
  
const owner = `${process.env.OWNER}@s.whatsapp.net`;
  
const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
async function startPantryPal() {

    // const result = await model.generateContent(prompt);
    // console.log(result.response.text());
    
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const Pantry = pantryConnect({
      logger: pino({ level: "silent" }),
      printQRInTerminal: true,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      auth: state,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

  
    Pantry.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        Pantry.sendPresenceUpdate('unavailable');
        if (!m) return;
        if (m.key.remoteJid=="status@broadcast" || m.key.participant) return;
        const m = chatUpdate.messages[0]
        
        const triggerWords = [];
  


      } catch (err) {
        console.log('Error:', err);
      }
    });
  
    Pantry.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") console.log("Script online");
      if (connection === "close") {
        let reason = lastDisconnect.error
          ? lastDisconnect?.error?.output.statusCode
          : 0;
        if (reason === DisconnectReason.badSession) {
          console.log(`Bad Session File, Please Delete Session and Scan Again`);
          process.exit();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log("Connection closed, reconnecting....");
          startPantryPal();
        } else if (reason === DisconnectReason.connectionLost) {
          console.log("Connection Lost from Server, reconnecting...");
          startPantryPal();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log(
            "Connection Replaced, Another New Session Opened, Please Close Current Session First"
          );
          process.exit();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(`Device Logged Out, Please Delete Session and Scan Again.`);
          process.exit();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("Restart Required, Restarting...");
          startPantryPal();
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Connection TimedOut, Reconnecting...");
          startPantryPal();
        } else {
          console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        }
      }
    });
  
    Pantry.ev.on("creds.update", saveCreds);
  
    return Pantry;
  };
  
  startPantryPal();
