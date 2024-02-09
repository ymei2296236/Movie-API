const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { ServerResponse } = require("http");
const { check, validationResult } = require("express-validator");

/**
 *  Configurationau - début du fichier
*/      
dotenv.config();    
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


/**
 * Points d'accès - Films
 */


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
 * @method GET
 * Permet d'accéder à tous les films
 */
server.get("/films", async (req, res)=>
{
    try
    {     
        const ordre = req.query.ordre || 'asc';
        // La signe plus convertit la valeur au nombre 
        const limit = +req.query.limit || 1000 ;
        const tri = req.query.tri || "annee";

        const donneesRef = await db.collection("films").orderBy(tri, ordre).limit(limit).get();
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
 * Permet d'accéder à un film
 */
// : implique que c'est un paramètre, ce qui suive le : est la cle de l'array 'params'
server.get("/films/:id", async(req, res)=>
{
    try 
    {   
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(film)
        {
            res.statusCode = 200;
            res.json(film);
        }
        else
        {
            res.statusCode = 404;
            res.json({ message: "Film non trouvé."});
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
 * Permet de créer un film
 */
server.post('/films', 
[
    check("titre").escape().trim().notEmpty().isString(),
    check("genre").escape().trim().notEmpty().isString(),
    check("description").escape().trim().notEmpty().isString(),
    check("titreVignette").escape().trim().notEmpty().isString(),
    check("realisation").escape().trim().notEmpty().isString(),
    check("annee").escape().trim().notEmpty().isISO8601()
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);

        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json ({message: "Données non-conforms."})
        }
        
        const { titre, genre, description, titreVignette, realisation, annee} = req.body;

        const docs = await db.collection("films").where("titre", "==", titre).get();

        // Valide si le film avec le même titre existe
        const films = [];

        docs.forEach((doc)=>
        {
            const film = doc.data();
            films.push(film);
        })

        if(films.length >= 1)
        {
            res.statusCode = 400;
            return res.json({message: 'Le film existe déjà.'});
        }

        // Si tout est correct, ajouter le film à la base de données
        const donneesFilm = { titre, genre, description, titreVignette, realisation, annee};
        const film = await db.collection('films').add(donneesFilm);

        res.statusCode = 201;
        res.json({message: `Le film avec l\'id ${film.id} a été ajouté`});
        
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method PUT
 * @param id
 * Permet de modifier un film
 */
server.put('/films/:id', 
[
    check("titre").optional().escape().trim().notEmpty().isString(),
    check("genre").optional().escape().trim().notEmpty().isString(),
    check("description").optional().escape().trim().notEmpty().isString(),
    check("titreVignette").optional().escape().trim().notEmpty().isString(),
    check("realisation").optional().escape().trim().notEmpty().isString(),
    check("annee").optional().escape().trim().notEmpty().isISO8601()
],
async (req, res)=>
{
   try
   { 
        const validation = validationResult(req);
        
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        
        // Valide si le film existe
        const id = req.params.id;
        const donneeModifiees = req.body;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(!film)
        {
            // Retourne un message si le film n'existe pas
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé. "});
        }

        await db.collection('films').doc(id).update(donneeModifiees);

        res.statusCode = 200;
        res.json({message: "La donnée a été modifée.", donnees: donneeModifiees});
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method Delete
 * @param id
 * Permet de supprimer un film
 */
server.delete('/films/:id', async (req, res)=>
{
    try{ 
        // Valide si le film existe
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(film)
        {
            // Supprime le film si'l existe
            const resultat = await db.collection('films').doc(id).delete();
    
            res.statusCode = 200;
            res.json({message: 'Le film a été supprimé.'})
        }
        else
        {
            // Retourne un message si'l n'existe pas
            res.statusCode = 404;
            res.json({ message: "Film non trouvé. "});
        }
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})



/**
 * Points d'accès - Utilisateurs
 */

/**
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/utilisateurs/initialiser", (req, res)=>
{
    const donnesTest = require("./data/DonneesTest/utilisateurTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('utilisateurs').add(element);
    })

    res.statusCode = 200;
    res.json({message: "Données initialisées"})
})

/**
 * @method POST
 * Permet de s'inscrire
 */
server.post('/utilisateurs/inscription', 
[
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({minLength:8, minLowercase:1, minNumbers:1, minUppercase:1, minSymbols:1})
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        const { courriel, mdp } = req.body;

        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();

        // Valide si l'utilisateur existe
        const utilisateurs = [];

        docs.forEach((doc)=>
        {
            const utilisateur = doc.data();
            utilisateurs.push(utilisateur);
        })

        if(utilisateurs.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: 'L\'utilisateur existe déjà.'});
        }

        // Crée l'utilisateur si tout est valide
        const nouvelUtilisateur = { courriel, mdp };
        res.statusCode = 200;
        const doc = await db.collection('utilisateurs').add(nouvelUtilisateur);
        // delete nouvelUtilisateur.mdp;
        res.json({message: `L\'utilisateur ${doc.id} a été ajouté.`});

    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * @method POST
 * Permet de se connecter
 */
server.post('/utilisateurs/connexion', 
[
    check("courriel").escape().trim().notEmpty(),
    check("mdp").escape().trim().notEmpty()
],
async (req, res)=>
{
    try
    {
        const { courriel, mdp } = req.body;
        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();

        // Valide si l'utilisateur existe
        const utilisateurs = [];

        docs.forEach((doc)=>
        {
            const utilisateur = doc.data();
            utilisateurs.push(utilisateur);
        })

        if(utilisateurs.length != 1 )
        {
            res.statusCode = 400;
            return res.json({message: 'La combinaison de courriel et de mot de passe n\'est pas valide.'});
        }
        
        // Si'l existe
        const utilisateurAValider = utilisateurs[0];

        // Valide si le mot de passe saisi est valide
        if(utilisateurAValider.mdp != mdp )
        {
            res.statusCode = 400;
            return res.json({message: 'La combinaison de courriel et de mot de passe n\'est pas valide.'});
        }

        res.statusCode = 200;
        res.json({message: 'Vous êtes connecté.'});
        
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * Gestion  page 404 - requête non trouvée - doit être le dernier
 */
server.use((req, res)=>
{
    res.statusCode = 404;
    res.render("404", {url: req.url});
})



/**
 * Message de confirmation lors du démarrage du serveur
 */
server.listen(process.env.PORT, ()=>
{
    console.log("Le serveur a démarré.");
});
