const { 
    GoogleGenerativeAI,
    } = require("@google/generative-ai");
const {
    default: pantryConnect,
    useMultiFileAuthState,
    DisconnectReason,
    } = require("@whiskeysockets/baileys");
const pino = require("pino");
require('dotenv').configDotenv()
  
const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: `You are PantryPal, a WhatsApp chatbot that suggests recipes based on given ingredients.
                        Always respond in clear, plain text with no markdown, no bullet points, and no special formatting except bolding of titles using single astericks , numbering and  \\n.
                        Your responses should be concise and structured in simple sentences. 
                        Begin with the recipe name, then list ingredients, and finally provide step-by-step cooking instructions.
                        Make sure the recipe is easy to follow, using everyday cooking terms.
                        If you're a prompt give doesnt contain a ingredients, ask them to send a list of ingredients.
                        If the prompt has too few ingredients consider add a few provided it does not change the main meal.
                        Give only one recipe.
                        Start with here is your recipe.`,
});
  
async function startPantryPal() {
    
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const Pantry = pantryConnect({
      logger: pino({ level: "silent" }),
      printQRInTerminal: true,
      browser: ["Ubuntu", "PantryPal", "20.0.04"],
      auth: state,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

  
    Pantry.ev.on("messages.upsert", async ({messages}) => {
      try {
        Pantry.sendPresenceUpdate('unavailable');
        
        const m = messages[0];
        // Avoid processing non text messages and text from unsuitable sources eg stories
        if (!m || !m.message || !m.key.remoteJid) return;
        if ( m.key.remoteJid.includes("g.us" || m.key.remoteJid=="status@broadcast" || m.key.fromMe ))  return;
        
        
        const senderJid = m.key.remoteJid;
        const senderName = m.pushName || "there";
   
        // Isolate text messages not from bot
        if (m.message?.conversation || m.message?.extendedTextMessage?.text || !m.key.fromMe ) {
            
            const text = m.message?.conversation || m.message?.extendedTextMessage?.text;

            if (!text) return;
            // test if the text message is an ingredients list
            const ingredientsAvailable = text.includes(",") || text.split(" ").length > 1;

            if (ingredientsAvailable) {
                try {
                    if (m.key.fromMe) return;
                    //calling Gemini API endpoint
                    const recipe = await model.generateContent(text);
                
                    await Pantry.sendMessage(senderJid, {text: recipe.response.text()});
                    return;
                    
                } catch (err) {
                    // Send a message if an Error occurs
                    await Pantry.sendMessage(senderJid, {text: "⚠️An error Occured. \nWe're unable to fetch a recipe for you🙁"})
                    return;
                }
                
            } else {

                await Pantry.sendMessage(senderJid, {text: `Hello👋 ${senderName} \n I'm *PantryPal* 🥘 your recipe bot \nSend a list of ingredients and i'll suggest a recipe for you `})
                return;
            };

        };


      } catch (err) {
        console.log('Error:', err);
      }
    });
  
    Pantry.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") console.log("Bot online");
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
