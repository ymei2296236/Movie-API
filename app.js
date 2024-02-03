const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { ServerResponse } = require("http");

/**
 *  Configurationau - début du fichier
*/           
const server = express();

// Définir le path du dossir de views
server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

/**
 *  Middleware 
*/   
server.use(express.static(path.join(__dirname, "public")));

//Permet d'accepter des bodys en Json dans les requêtes
server.use(express.json());

// Points d'accès
server.get("/donnees", async (req, res)=>
{
    try
    {    // const test = {email: "test@gmail.com"}
        console.log(req.query);

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
server.post("/films/initialiser", (req, res)=>
{
    const donnesTest = require("./data/DonneesTest/filmsTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('films').add(element);
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
