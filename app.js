// const http = require("http");

// express est equivalence de http, mais plus facile
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");

// au début du fichier - configuration
dotenv.config();

/**
 * Version longue
 */
// const server = http.createServer((request, response)=>{
    //     if(request.method == "GET" && request.url == "/") 
    //     {
        //         const file = fs.readFileSync('./public/index.html', 'utf-8');
        //         response.setHeader("Content-Type", "text-html");
        //         response.statusCode = 200;
        //         response.end(file);
        //     }
        //     else
        //     {
            //         const file = fs.readFileSync('./public/404.html', 'utf-8');
            //         response.setHeader("Content-Type", "text-html");
            //         response.statusCode = 404;
            //         response.end(file);
            //     }
            // })

/**
 * Version courte
 */
            
const server = express();

// Définir le path du dossir de views
server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

// Middleware 
// Doit être entre la configuration et les routes / points d'accès
// get tous les fichiers statiques dans le dossier public (donne accès à tout ce qui est dans le dossier public pour protéger le reste du projet)
server.use(express.static(path.join(__dirname, "public")));

// Points d'accès
server.get("/donnees", async (req, res)=>
{
    // const test = {email: "test@gmail.com"}
    console.log(req.query);

    // Ceci sera remplacé par un fetch ou un appel à la base de données
    // const donnees = require("./data/donneesTest");
    const direction = req.query["order-direction"];
    // Ne peut pas enchaîner une clé avec tiret, pas exemple : "req.query.order-direction"
    const limit = +req.query.limit;
    // La signe plus convertir à un nombre 

    const donneesRef = await db.collection("test").orderBy("user", direction).limit(limit).get();

    const donneesFinale = [];

    donneesRef.forEach((doc)=>
    {
        donneesFinale.push(doc.data());
    });

    res.statusCode = 200;
    res.json(donneesFinale);

})

/**
 * @method GET
 * @param id
 * Permet d'accéder à un utilisateur
 */
// : implique que c'est un paramètre, ce qui suive le : est la cle de l'array 'params'
server.get("/donnees/:id", (req, res)=>
{
    // console.log(req.params.id);
    const donnees = require("./data/donneesTest");
    // find retourne l'element utilisateur
    const utilisateur = donnees.find((element)=>
    {
        return element.id == req.params.id;
    })

    if(utilisateur)
    {
        res.statusCode = 200;
        res.json(utilisateur);
    }
    else
    {
        res.statusCode = 404;
        res.json({ message: "Utilisateur non trouvé. "});
    }
    console.log(req);
    res.send(req.params.id);
});

// Doit être le dernier
// Gestion page 404 - requête non trouvée

server.use((req, res)=>
{
    res.statusCode = 404;

    res.render("404", {url: req.url});
})

// Message de confirmation lors du démarrage du serveur
server.listen(process.env.PORT, ()=>
{
    console.log("Le serveur a démarré.");
});
