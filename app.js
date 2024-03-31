const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
// const mustacheExpress = require("mustache-express");
const cors = require("cors");


/**
 *  Configurationau - début du fichier
*/      
// ===== INITIALISATION VARIABLES D'ENVIRONNEMENT
dotenv.config();   

const server = express();
const port = process.env.PORT || 5000;

//TODO: Expliquer les erreurs CORS
server.use(cors()); // peut specifier l'adresse de notre site comme la seule site permet au accèss
server.use(express.json()); //Permet d'accepter des bodys en Json dans les requêtes
server.use(express.urlencoded({ extended: true }));


/**
 *  Middleware 
*/   
server.use(express.static(path.join(__dirname, "public")));

// ===== ROUTES
// Toutes les routes non statiques doivent être définies après les middlewares
server.use("/films", require("./routes/films.js"));
server.use("/utilisateurs", require("./routes/utilisateurs.js"));


// Définir le path du dossir de views
// server.set("views", path.join(__dirname, "views"));
// server.set("view engine", "mustache");
// server.engine("mustache", mustacheExpress());


/**
 * Gestion  page 404 - requête non trouvée - doit être le dernier
 */
server.use((req, res)=>
{
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 404;
    res.render("404", {url: req.url});
})



/**
 * Message de confirmation lors du démarrage du serveur
 */
server.listen(port, ()=>
{
    console.log(`Le serveur a démarré au port ${port}.`);
});
