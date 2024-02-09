// const http = require("http");

// express est equivalence de http, mais plus facile
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { ServerResponse } = require("http");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

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

//Permet d'accepter des bodys en Json dans les requêtes
server.use(express.json());

// Points d'accès
server.get("/donnees", async (req, res)=>
{
    try
    {    // const test = {email: "test@gmail.com"}
        if(req.headers.authorization !== "patate" )
        {
            res.statusCode = 401;
            return res.json ({message: "Non authorisé."})
        }
        console.log(req.headers.authorization);

        // Ceci sera remplacé par un fetch ou un appel à la base de données
        // const donnees = require("./data/donneesTest");
        const direction = req.query["order-direction"] || 'asc';
        // Ne peut pas enchaîner une clé avec tiret, pas exemple : "req.query.order-direction"
        const limit = +req.query.limit || 1000 ;
        // La signe plus convertir à un nombre 

        const donneesRef = await db.collection("test").orderBy("user", direction).limit(limit).get();

        const donneesFinale = [];

        donneesRef.forEach((doc)=>
        {
            donneesFinale.push(doc.data());
        });

        res.statusCode = 200;
        res.json(donneesFinale);
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method GET
 * @param id
 * Permet d'accéder à un utilisateur
 */
// : implique que c'est un paramètre, ce qui suive le : est la cle de l'array 'params'
server.get("/donnees/:id", async(req, res)=>
{
    try 
    {    // console.log(req.params.id);
        const id = req.params.id;
        // const donnees = require("./data/donneesTest");
        const doc = await db.collection('test').doc(id).get();
        // find retourne l'element utilisateur
        const utilisateur = doc.data();

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
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'})
    }
});

/**
 * @method POST
 */

server.post('/donnees', async (req, res)=>
{
    try
    {    
        const test = req.body;

        // Validation des données
        if(test.user == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir un utilisateur.'});
        }

        await db.collection('test').add(test);

        res.statusCode = 201;
        res.json({message: 'la donnée a été ajoutée', donnees: test});
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/donnees/initialiser", (req, res)=>
{
    const donnesTest = require("./data/donneesTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('test').add(element);
    })

    res.statusCode = 200;
    res.json({message: "Données initialisées"})
})

/**
 * @method PUT
 */
server.put('/donnees/:id', async (req, res)=>
{
   try{ 
        const id = req.params.id;
    console.log(id);
        const donneeModifiees = req.body;

        //Validation ici

        await db.collection('test').doc(id).update(donneeModifiees);

        res.statusCode = 200;
        res.json({message: "La donnée a été modifée."});
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method Delete
 */
server.delete('/donnees/:id', async (req, res)=>
{
    try{ 
        const id = req.params.id;
        // const donnees = require("./data/donneesTest");
        const doc = await db.collection('test').doc(id).get();
        // find retourne l'element utilisateur
        const utilisateur = doc.data();

        if(utilisateur)
        {
            const resultat = await db.collection('test').doc(id).delete();
    
            res.statusCode = 200;
            res.json({message: 'Le document a été supprimé.'})
        }
        else
        {
            res.statusCode = 404;
            res.json({ message: "Utilisateur non trouvé. "});
        }
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * @method Post
 */
server.post('/utilisateurs/inscription', 
[
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({minLength:8, minLowercase:1, minNumbers:1, minUppercase:1, minSymbols:1})
], 
async (req, res)=>
{
    const validation = validationResult(req);
    if(validation.errors.length > 0)
    {
        res.statusCode = 400;
        return res.json({ message: "Données non-conforms"})
    }
    // On récupère les infos du body

    // version longe
    // const courriel = req.body.courriel;
    // const mdp = req.body.mdp;

    // version courte
    // if mdp is missing, firestore won`t accept undefined
    const { courriel, mdp } = req.body;

    // On vérifie si le courriel existe
    const docRef = await db.collection('utilisateurs').where('courriel', '==', courriel).get();
    const utilisateurs = [];

    docRef.forEach(doc => 
        {
        utilisateurs.push(doc.data());
    });

    console.log(utilisateurs);
    // Si oui, erreur
    if(utilisateurs.length > 0)
    {
        res.statusCode = 400;
        // sortir de la fonction pour que le code continue pas
        return res.json({ message: "Le courriel existe déjà. "});
    }

    // TODO: On valide/nettoie la donnée


    // TODO: On encrypte le mot de passe

    // On enregistre

    // version longe
    // const nouvelUtilisateur = 
    // {
    //     "courriel": courriel, 
    //     "mdp": mdp
    // };

    // On valide nettoie la donnée

    // On encrypte le mot de passe
    const hash = await bcrypt.hash(mdp, 10);
    
    // version courte


    const nouvelUtilisateur = {courriel, "mdp": hash};
    await db.collection('utilisateurs').add(nouvelUtilisateur);

    // On renvoie true;
    delete nouvelUtilisateur.mdp;
    res.statusCode = 200;
    res.json(nouvelUtilisateur);
})

/**
 * @method Post
 */
server.post('/utilisateurs/connexion', async (req, res)=>
{
    // On récupère les infos du body
    const {courriel, mdp} = req.body;

    // On vérifie si le courriel existe
    const docRef = await db.collection('utilisateurs').where('courriel', '==', courriel).get();
    const utilisateurs = [];

    docRef.forEach(doc => {
        utilisateurs.push(doc.data());
    });

    console.log(utilisateurs);

    // Si non, erreur
    if(utilisateurs.length != 1)
    {
        res.statusCode = 400;
        return res.json({ message: "Erreur avec l'utilisateur"})
    }

    // TODO: On encrypte le mot de passe
    // On compare
    const utilisateurAValider = utilisateurs[0];
    const estValide = await bcrypt.compare(mdp, utilisateurAValider.mdp);


    // Si pas pareil, erreur
    if(!estValide)
    {
        res.statusCode = 400;
        return res.json({ message: "La combinaison de courriel et mdp n'est pas valide. "})
    }

    // On retourne les infos de l'utilisateur sans le mot de passe
    delete utilisateurAValider.mdp;

    res.status = 200;
    res.json(utilisateurAValider);

})

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
