const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { check, validationResult } = require("express-validator");
const cors = require("cors");

/**
 *  Configurationau - début du fichier
*/      
dotenv.config();   

const server = express();

server.use(cors());

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
 * @method GET
 * Permet d'accéder à tous les films
 */
server.get("/films", async (req, res)=>
{
    try
    {     
        // La signe plus convertit la valeur au nombre 
        const limite = +req.query.limite || 1000 ;
        const tri = req.query.tri || "annee";
        const ordre = req.query.ordre || 'asc';

        // Controle le champs de tri
        if (tri != "annee" && tri != "titre" && tri != "realisation")
        {
            res.statusCode = 400;
            return res.json({message: `Vous ne pouvez par trier les films par ${tri}.`})
        }

        const donneesRef = await db.collection("films").limit(limite).orderBy(tri, ordre).get();
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
        // valide si le film existe
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        // retourne un message si'l n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé."});
        }

        // retourne le film si'l existe
        res.statusCode = 200;
        res.json(film);
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
    // valider les données saisies
    check("titre").escape().trim().notEmpty().isString(),
    check("genres").escape().trim().notEmpty().isArray(),
    check("description").escape().trim().notEmpty().isString(),
    check("titreVignette").escape().trim().notEmpty().isString(),
    check("realisation").escape().trim().notEmpty().isString(),
    check("annee").escape().trim().notEmpty().isISO8601().isLength({max:4})
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);

        // retourne un message lorsqu'une erreur de données
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json ({message: "Données non-conforms."})
        }
        
        const { titre, genres, description, titreVignette, realisation, annee} = req.body;

        // Valide si le film avec le même titre existe
        const docs = await db.collection("films").where("titre", "==", titre).get();

        const films = [];

        docs.forEach((doc)=>
        {
            const film = doc.data();
            films.push(film);
        })

        // retourne un message si'l le film existe déjà
        if(films.length >= 1)
        {
            res.statusCode = 400;
            return res.json({message: 'Le film existe déjà.'});
        }

        // Si tout est correct, ajouter le film à la base de données
        const donneesFilm = { titre, genres, description, titreVignette, realisation, annee};
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
    // valider les données saisies
    check("titre").optional().escape().trim().notEmpty().isString(),
    check("genres").optional().escape().trim().notEmpty().isArray(),
    check("description").optional().escape().trim().notEmpty().isString(),
    check("titreVignette").optional().escape().trim().notEmpty().isString(),
    check("realisation").optional().escape().trim().notEmpty().isString(),
    check("annee").optional().escape().trim().notEmpty().isISO8601().isLength({max:4})
],
async (req, res)=>
{
   try
   { 
        const validation = validationResult(req);
        
        // retourne un message lorsqu'une erreur de données
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

        // Retourne un message si le film n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé. "});
        }

        // Effectue la modification à la base de données
        await db.collection('films').doc(id).update(donneeModifiees);

        res.statusCode = 200;
        res.json({message: `Le film avec l\'id ${id} a été modifié`, donnees: donneeModifiees});
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

        // Retourne un message si'l n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé. "});
        }

        // Supprime le film de la base de données si'l existe
        const resultat = await db.collection('films').doc(id).delete();

        res.statusCode = 200;
        res.json({message: 'Le film a été supprimé.'})
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
 * Permet de s'inscrire
 */
server.post('/utilisateurs/inscription', 
[
    // Valide les données saisies
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({minLength:8, minLowercase:1, minNumbers:1, minUppercase:1, minSymbols:1})
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);
        
        // retourne un message lorsqu'une erreur de données 
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        const { courriel, mdp } = req.body;

        // Valide si l'utilisateur existe
        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
        const utilisateurs = [];

        docs.forEach((doc)=>
        {
            const utilisateur = doc.data();
            utilisateurs.push(utilisateur);
        })

        // Retourne un message si'l existe déjà
        if(utilisateurs.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: 'L\'utilisateur existe déjà.'});
        }

        // Crée l'utilisateur si tout est valide
        const nouvelUtilisateur = { courriel, mdp };
        const doc = await db.collection('utilisateurs').add(nouvelUtilisateur);

        res.statusCode = 200;
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
    // Valide les données saisies
    check("courriel").escape().trim().notEmpty(),
    check("mdp").escape().trim().notEmpty()
],
async (req, res)=>
{
    try
    {
        const validation = validationResult(req);
        
        // retourne un message lorsqu'une erreur de données 
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        const { courriel, mdp } = req.body;
        
        // Valide si l'utilisateur existe
        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
        const utilisateurs = [];

        docs.forEach((doc)=>
        {
            const utilisateur = doc.data();
            utilisateurs.push(utilisateur);
        })

        // Retourne un message si'l n'existe pas
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
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/films/initialiser", async (req, res)=>
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
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/utilisateurs/initialiser", async(req, res)=>
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
